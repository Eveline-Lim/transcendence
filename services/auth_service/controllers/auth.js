import { validateInputs } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import bcrypt from "bcrypt";
import crypto from 'node:crypto';
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL = 60 * 24; // 24h
const REFRESH_TOKEN_TTL = 60 * 60 * 24; // 24h in seconds

export async function signup(req, reply) {
	const { username, displayName, email } = req.body;
	console.log("REQ BODY:", req.body);
	let password = req.body.password;
	const avatarUrl = "./assets/avatar.jpg";

	// const validation = validateInputs({ username, email, password }, false);
	const validation = validateInputs({ username, email }, false);
	if (!validation.success) {
		return reply.code(400).send({
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
				code: "USER_ALREADY_EXISTS",
				message: "Username already exists",
			});
		}
		// Check email uniqueness
		const existingEmail = await redisClient.exists(emailKey);
		if (existingEmail) {
			return reply.code(409).send({
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
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to register user",
		});
	}
}
