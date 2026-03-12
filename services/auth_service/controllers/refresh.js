import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../utils/macros.js";
import AuthResponse from "../models/AuthResponse.js";
import UserInfo from "../models/UserInfo.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export async function refreshToken(req, reply) {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST",
			message: "Refresh token required",
		});
	}

	try {
		// Look up refresh token by its SHA-256 hash
		const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
		const storedValue = await redisClient.get(`refresh:${refreshTokenHash}`);

		if (!storedValue) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_REFRESH_TOKEN",
				message: "Invalid or expired refresh token",
			});
		}

		// Delete old refresh token (single-use)
		await redisClient.del(`refresh:${refreshTokenHash}`);

		// Parse stored value: "userId:sessionId"
		const separatorIndex = storedValue.indexOf(":");
		const userId = separatorIndex >= 0 ? storedValue.substring(0, separatorIndex) : storedValue;
		const oldSessionId = separatorIndex >= 0 ? storedValue.substring(separatorIndex + 1) : null;

		const username = await redisClient.get(`userid:${userId}`);
		if (!username) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_REFRESH_TOKEN",
				message: "Invalid refresh token",
			});
		}

		const user = await redisClient.hGetAll(`user:${username}`);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User not found",
			});
		}

		const sessionId = oldSessionId || crypto.randomUUID();

		// Generate new access token
		const accessToken = jwt.sign(
			{
				userId,
				username: user.username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);

		// Generate new refresh token
		const newRefreshToken = crypto.randomBytes(64).toString("hex");
		const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

		await redisClient.set(
			`refresh:${newRefreshTokenHash}`,
			`${userId}:${sessionId}`,
			{ EX: REFRESH_TOKEN_TTL }
		);

		const userInfo = UserInfo.fromRedis(user);

		const response = new AuthResponse({
			accessToken,
			refreshToken: newRefreshToken,
			expiresIn: ACCESS_TOKEN_TTL,
			user: userInfo,
			requires2FA: user.requires2FA === "true",
		});

		return reply.code(200).send(response);
	} catch (error) {
		console.error("REFRESH TOKEN ERROR:", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to refresh token",
		});
	}
}
