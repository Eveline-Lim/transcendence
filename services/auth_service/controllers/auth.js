import { validateInputs } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS } from "../utils/macros.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export async function signup(req, reply) {
	const { username, displayName, email } = req.body;
	console.log("REQ BODY:", req.body);
	let password = req.body.password;
	const avatarUrl = "./assets/avatar.jpg";

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
		// await redisClient.flushDb();

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

		// Create user
		const uuid = crypto.randomUUID();
		console.log("UUID: ", uuid);
		// console.log("password: ", password);
		password = await bcrypt.hash(password, 10);
		// console.log("hashedPassword: ", password);

		// Save user
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
			process.env.SECRET_TOKEN,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		// console.log("ACCESS TOKEN: ", accessToken);
		accessToken = await bcrypt.hash(accessToken, 10);
		// console.log("hashedToken: ", accessToken);

		// Refresh Token
		// Generate a random salt (64 bytes)
		let refreshToken = crypto.randomBytes(64).toString("hex");
		// console.log("REFRESH_TOKEN: ", refreshToken);
		refreshToken = await bcrypt.hash(refreshToken, 10);
		// console.log("hashedRefreshToken: ", refreshToken);

		// Store refresh token in Redis
		await redisClient.set(
			`refresh:${refreshToken}`,
			user.id,
			{ EX: REFRESH_TOKEN_TTL }
		);

		// const storedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
		// console.log("storedRefreshToken: ", storedRefreshToken);

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
				has2FAEnabled: user.has2FAEnabled,
			},
			requires2FA: user.requires2FA
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
	const { identifier, password } = req.body;
	console.log("REQ BODY: ", req.body);

	// For rate limiting per IP
	const ip = req.ip;
	console.log("IP: ", ip);

	const validation = validateInputs({ identifier, password }, true);
	if (!validation.success) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}

	try {
		let username;
		if (identifier.includes("@")) {
			username = await redisClient.get(`email:${identifier}`);
			if (!username) {
				return reply.code(401).send({
					success: false,
					code: "INVALID_CREDENTIALS",
					message: "Invalid username/email or password",
				});
			}
		} else {
			username = identifier;
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
			process.env.SECRET_TOKEN,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		console.log("ACCESS TOKEN: ", accessToken);
		accessToken = await bcrypt.hash(accessToken, 10);
		// console.log("hashedToken: ", accessToken);

		// Refresh Token
		// Generate a random salt (64 bytes)
		let refreshToken = crypto.randomBytes(64).toString("hex");
		console.log("REFRESH_TOKEN: ", refreshToken);
		refreshToken = await bcrypt.hash(refreshToken, 10);
		// console.log("hashedRefreshToken: ", refreshToken);

		// Store refresh token in Redis
		await redisClient.set(
			`refresh:${refreshToken}`,
			user.id,
			{ EX: REFRESH_TOKEN_TTL }
		);
		const storedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
		// console.log("storedRefreshToken: ", storedRefreshToken);

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
				has2FAEnabled: user.has2FAEnabled,
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
