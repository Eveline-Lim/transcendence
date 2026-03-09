import { validateInputs } from "../utils/validators.js"
import RegisterRequest from "../models/RegisterRequest.js";
import LoginRequest from "../models/LoginRequest.js";
import UserInfo from "../models/UserInfo.js";
import AuthResponse from "../models/AuthResponse.js";
import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS } from "../utils/macros.js";
import { createPlayerProfile } from "../utils/playerService.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export async function signup(req, reply) {
	let registerData;

	try {
		registerData = RegisterRequest.validate(req.body);
		console.log("REGISTER DATA: ", registerData);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	const { username, displayName, email, password } = registerData;
	const avatarUrl = "/assets/avatar.jpg";

	console.log("REGISTER DATA: ", registerData);

	const validation = validateInputs(registerData, false);
	console.log("validation: ", validation);
	if (!validation.success) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}
	try {
		const userKey = `user:${username}`;
		console.log("userKey: ", userKey);
		const emailKey = `email:${email}`;
		console.log("emailKey: ", emailKey);

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

		const hashedPassword = await bcrypt.hash(password, 10);

		// Save auth credentials
		await redisClient.hSet(userKey, {
			id: uuid,
			username,
			displayName,
			password: hashedPassword,
			email,
			avatarUrl,
			has2FAEnabled: "false",
			requires2FA: "false",
		});

		await redisClient.set(emailKey, username);
		await redisClient.set(`userid:${uuid}`, username);

		const user = await redisClient.hGetAll(userKey);

		// Create session
		const sessionId = crypto.randomUUID();
		const now = new Date().toISOString();
		const ip = req.ip;

		await redisClient
			.multi()
			.hSet(`session:${sessionId}`, {
				id: sessionId,
				deviceInfo: req.headers["user-agent"] ?? "unknown",
				ipAddress: ip,
				location: "unknown",
				createdAt: now,
				lastActiveAt: now,
				isCurrent: "true",
			})
			.sAdd(`user:sessions:${user.username}`, sessionId)
			.exec();

		// Access Token (short-lived JWT)
		const accessToken = jwt.sign(
			{
				userId: user.id,
				username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);

		// Refresh Token
		const refreshToken = crypto.randomBytes(64).toString("hex");
		const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

		// Store refresh token in Redis (key = sha256 hash, value = userId:sessionId)
		await redisClient.set(
			`refresh:${refreshTokenHash}`,
			`${user.id}:${sessionId}`,
			{ EX: REFRESH_TOKEN_TTL }
		);

		const userInfo = UserInfo.fromRedis(user);

		const response = new AuthResponse({
			accessToken,
			refreshToken,
			expiresIn: ACCESS_TOKEN_TTL,
			user: userInfo,
			requires2FA: "false",
		});

		console.log("CREATING SESSION:", sessionId);
		return reply.code(201).send(response);
	} catch (error) {
		console.error("SIGNUP ERROR: ", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to register user",
		});
	}
}

export async function login(req, reply) {
	let loginData;

	try {
		loginData = LoginRequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}

	const { identifier, password } = loginData;

	const validation = validateInputs(loginData, true);
	console.log("validation: ", validation);
	if (!validation.success) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}

	// For rate limiting per IP
	const ip = req.ip;
	console.log("IP: ", ip);

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
		if (attempts > MAX_LOGIN_ATTEMPTS) {
			return reply.code(429).send({
				success: false,
				code: "TOO_MANY_ATTEMPTS",
				message: "Too many login attempts. Try again in five minutes.",
			});
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Invalid username or password",
			});
		}

		// Reset rate limit on success
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
				isCurrent: "true",
			})
			.sAdd(`user:sessions:${user.username}`, sessionId)
			.exec();

		// Access Token (short-lived JWT)
		const accessToken = jwt.sign(
			{
				userId: user.id,
				username: user.username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		console.log("ACCESS TOKEN: ", accessToken);

		// Refresh Token
		const refreshToken = crypto.randomBytes(64).toString("hex");
		console.log("REFRESH_TOKEN: ", refreshToken);
		const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

		// Store refresh token in Redis (key = sha256 hash, value = userId:sessionId)
		await redisClient.set(
			`refresh:${refreshTokenHash}`,
			`${user.id}:${sessionId}`,
			{ EX: REFRESH_TOKEN_TTL }
		);

		console.log("2FA: ", user.has2FAEnabled, user.requires2FA);

		const userInfo = UserInfo.fromRedis(user);

		const response = new AuthResponse({
			accessToken,
			refreshToken,
			expiresIn: ACCESS_TOKEN_TTL,
			user: userInfo,
			requires2FA: user.requires2FA === "true",
		});

		return reply.code(200).send(response);
	} catch (error) {
		console.log("LOGIN ERROR: ", error);
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
		reply.code(204).send();
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to log out user",
		});
	}
}
