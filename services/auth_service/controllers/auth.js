import { validateInputs } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS } from "../utils/macros.js";
import { createPlayerProfile } from "../utils/playerService.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import LoginRequest from "../model/LoginRequest.js";
import RegisterRequest from "../model/RegisterRequest.js";

export async function signup(req, reply) {
	// const { username, displayName, email } = req.body;
	// console.log("REQ BODY:", req.body);
	let displayName = req.body.displayName;

	let registerRequest;

	console.log("HEREEEEEEEEE");
	try {
		RegisterRequest.validateJSON(req.body);
		registerRequest = RegisterRequest.constructFromObject(req.body);
		console.log("111111111111");
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: error.message,
		});
	}

	const { username, password, email } = registerRequest;
	const avatarUrl = "/assets/avatar.jpg";

	// const validation = validateInputs({ username, email, password }, false);
	const validation = validateInputs({ username, email }, false);
	if (!validation.success) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	try {
		const userKey = `user:${username}`;
		console.log("userKey: ", userKey);
		const emailKey = `email:${email}`;
		console.log("emailKey: ", emailKey);

		// TEST
		await redisClient.flushDb();

		// Check username uniqueness
		const existingUser = await redisClient.exists(userKey);
		if (existingUser) {
			return reply.code(409).send({
				success: false,
				code: "USER_ALREADY_EXISTS",
				message: "Username already exists",
			});
		}
		// Check email uniqueness
		const existingEmail = await redisClient.exists(emailKey);
		if (existingEmail) {
			return reply.code(409).send({
				success: false,
				code: "EMAIL_ALREADY_EXISTS",
				message: "Email already exists",
			});
		}

		// Call player service to create player profile
		const playerResult = await createPlayerProfile({ username, displayName, email, password });

		if (!playerResult.ok) {
			console.log("PLAYER SERVICE ERROR: ", playerResult.data);
			return reply.code(playerResult.status).send({
				success: false,
				code: "PLAYER_CREATION_FAILED",
				message: playerResult.data.message || "Failed to create player profile",
			});
		}

		const playerData = playerResult.data;
		console.log("PLAYER CREATED: ", playerData);

		// Use the player ID from the player service (PostgreSQL) as the single source of truth
		const uuid = playerData.id;
		console.log("UUID (from player service): ", uuid);

		// console.log("password: ", password);
		password = await bcrypt.hash(password, 10);
		// console.log("hashedPassword: ", password);

		// Save auth credentials
		await redisClient.hSet(userKey, {
			id: uuid,
			username,
			displayName,
			password,
			email,
			avatarUrl,
			has2FAEnabled: "false",
			requires2FA: "false"
		});

		await redisClient.set(emailKey, username);
		await redisClient.set(`userid:${uuid}`, username);

		const user = await redisClient.hGetAll(userKey);

		// Create session
		const sessionId = crypto.randomUUID();
		console.log("sessionId: ", sessionId);
		const now = new Date().toISOString();
		const ip = req.ip;
		console.log("IP: ", ip);

		await redisClient
		.multi()
		.hSet(`session:${sessionId}`, {
			id: sessionId,
			deviceInfo: req.headers["user-agent"] ?? "unknown",
			ipAddress: ip,
			location: "unknown",
			createdAt: now,
			lastActiveAt: now,
			isCurrent: "true"
		})
		.sAdd(`user:sessions:${user.username}`, sessionId)
		.exec();

		// Access Token (short-lived JWT)
		let accessToken = jwt.sign(
			{
				userId: user.id,
				username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		// console.log("ACCESS TOKEN: ", accessToken);
		// accessToken = await bcrypt.hash(accessToken, 10);
		// console.log("hashedToken: ", accessToken);

		// Refresh Token
		// Generate a random salt (64 bytes)
		const refreshToken = crypto.randomBytes(64).toString("hex");
		// console.log("REFRESH_TOKEN: ", refreshToken);
		const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		// console.log("hashedRefreshToken: ", refreshToken);

		// Store refresh token in Redis
		await redisClient.set(
			`refresh:${user.id}`,
			hashedRefreshToken,
			{ EX: REFRESH_TOKEN_TTL }
		);

		// const storedRefreshToken = await redisClient.get(`refresh:${user.id}`);
		// console.log("storedRefreshToken: ", storedRefreshToken);

		let has2FA = false;
		if (user.has2FAEnabled == "true") {
			has2FA = true;
		}

		return reply.code(201).send({
			success: true,
			code: "USER_CREATED",
			message: "User successfully registered",
			accessToken,
			refreshToken,
			tokenType: "Bearer",
			expiresIn : ACCESS_TOKEN_TTL,
			user: {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatarUrl : user.avatarUrl,
				has2FAEnabled: has2FA
			},
			requires2FA: has2FA
		});
	} catch (error) {
		await redisClient.quit();
		console.log("SIGNUP ERROR: ", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to register user",
		});
	}
}

export async function login(req, reply) {
	let loginRequest;

	try {
		LoginRequest.validateJSON(req.body);
		loginRequest = LoginRequest.constructFromObject(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: error.message,
		});
	}

	const { identifier, password } = loginRequest;

	// For rate limiting per IP
	const ip = req.ip;
	console.log("IP: ", ip);

	const validation = validateInputs(loginRequest, true);
	if (!validation.success) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}

	try {
		let username = identifier;
		console.log("username: ", username);
		if (identifier.includes("@")) {
			username = await redisClient.get(`email:${identifier}`);
			if (!username) {
				return reply.code(401).send({
					success: false,
					code: "INVALID_CREDENTIALS",
					message: "Invalid username/email or password",
				});
			}
		}

		const userKey = `user:${username}`;
		console.log("userKey: ", userKey);

		const existingUser = await redisClient.exists(userKey);
		if (!existingUser) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Invalid username/email or password",
			});
		}
		// Retrieve all user fields from Redis by username or email key.
		const user = await redisClient.hGetAll(userKey);

		// Rate limit check
		const rlKey = `login:rateLimit:${identifier}:${ip}`;
		console.log("rlKey: ", rlKey);
		const attempts = await redisClient.incr(rlKey);
		if (attempts === 1) {
			await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
		}
		// console.log("attempts: ", attempts);
		if (attempts > MAX_LOGIN_ATTEMPTS) {
			return reply.code(429).send({
				success: false,
				code: "TOO_MANY_ATTEMPTS",
				message: "Too many login attempts. Try again in five minutes."
			});
		}

		// If the user exists, we compare the entered password with the stored hashed password.
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Invalid username or password",
			});
		}

		// Reset rate limite on success
		await redisClient.del(rlKey);

		// Create session
		const sessionId = crypto.randomUUID();
		console.log("sessionId: ", sessionId);
		const now = new Date().toISOString();

		await redisClient
		.multi()
		.hSet(`session:${sessionId}`, {
			id: sessionId,
			deviceInfo: req.headers["user-agent"] ?? "unknown",
			ipAddress: ip,
			location: "unknown",
			createdAt: now,
			lastActiveAt: now,
			isCurrent: "true"
		})
		.sAdd(`user:sessions:${user.username}`, sessionId)
		.exec();

		// Access Token (short-lived JWT)
		let accessToken = jwt.sign(
			{
				userId: user.id,
				username: user.username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		console.log("ACCESS TOKEN: ", accessToken);
		// accessToken = await bcrypt.hash(accessToken, 10);
		// console.log("hashedToken: ", accessToken);

		// Refresh Token
		// Generate a random salt (64 bytes)
		const refreshToken = crypto.randomBytes(64).toString("hex");
		console.log("REFRESH_TOKEN: ", refreshToken);
		const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		// console.log("hashedRefreshToken: ", refreshToken);

		// Store refresh token in Redis
		await redisClient.set(
			`refresh:${user.id}`,
			hashedRefreshToken,
			{ EX: REFRESH_TOKEN_TTL }
		);
		const storedRefreshToken = await redisClient.get(`refresh:${user.id}`);
		console.log("storedRefreshToken: ", storedRefreshToken);
		console.log("2FA: ", user.has2FAEnabled, user.requires2FA );
		return reply.code(200).send({
			success: true,
			code: "LOGIN_SUCCESS",
			message: "User successfully logged in",
			accessToken,
			refreshToken,
			tokenType: "Bearer",
			expiresIn : ACCESS_TOKEN_TTL,
			user: {
				id : user.id,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatarUrl: user.avatarUrl,
				has2FAEnabled: user.has2FAEnabled === "true",
			},
			requires2FA: user.requires2FA
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to log in user",
		});
	}
}

export async function logout(req, reply) {
	try {
		const token = req.headers.authorization.split(" ")[1];
		console.log("LOGOUT TOKEN: ", token);
		if (!token) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		// Hash token before blacklisting ?
		// const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

		// Add JWT token to blacklist
		await redisClient.set(
			`blacklist:${token}`,
			"1", // to modify ?
			{ EX: ACCESS_TOKEN_TTL}
		);

		reply.code(204).send({
			code: "LOGOUT_SUCCESS",
			message: "User successfully logged out",
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to log out user",
		});
	}
}
