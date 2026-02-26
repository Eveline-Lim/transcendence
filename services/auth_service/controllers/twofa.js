import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../utils/macros.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { generateBackupCodes } from "../utils/generateBackupCodes.js";

export async function enableTwoFA(req, reply) {
	try {
		const token = req.headers.authorization.split(" ")[1];
		console.log("HEREEEEEE TOKEN: ", token);
		if (!token) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const username = decoded.username;
		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(401).send({
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		if (user.has2FAEnabled === "true") {
			return reply.code(409).send({
				code: "2FA_ALREADY_ENABLED",
				message: "2FA already enabled",
			});
		}

		// Generate TOTP secret
		const secret = speakeasy.generateSecret({ name: "Transcendence" });
		console.log("secret: ", secret);

		// Generate QR code
		const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
		console.log("qrcode: ", qrCodeUrl);


		// Generate and hashed backup codes
		const { codes, backupCodes } = generateBackupCodes();
		console.log("codes: ", codes);

		// Store 2FA secret as pending (not yet enabled until verified)
		await redisClient.hSet(userKey, {
			twoFASecret: secret.base32,
			twoFABackupCodes: JSON.stringify(backupCodes),
			twoFAPending: "true"
		});

		return reply.code(200).send({
			success: true,
			secret: secret.base32,
			qrCodeUrl,
			backupCodes,
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to enable 2FA",
		});
	}
}

export async function verifyTwoFA(req, reply) {
	const { code } = req.body;
	console.log("code: ", code);

	// const validation = validate2FACode(code);
	// if (!validation) {
	// 	return reply.code(401).send({
	// 		code: "INVALID_CREDENTIALS",
	// 		message: "Invalid 2FA code",
	// 	});
	// }
	try {
		const token = req.headers.authorization.split(" ")[1];
		if (!token) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const username = decoded.username;
		console.log("username: ", username);
		const userKey = `user:${username}`;
		console.log("userKey: ", userKey);
		const user = await redisClient.hGetAll(userKey);
		console.log("user:" ,user);
		if (!user || !user.twoFASecret) {
			return reply.code(401).send({
				code: "UNAUTHORIZED",
				message: "Invalid token",
			});
		}

		// Verify TOTP
		const verified = speakeasy.totp.verify({
			secret: user.twoFASecret,
			encoding: "base32",
			token: code,
			window: 1,
		});
		console.log("verified: ", verified);
		if (!verified) {
			return reply.code(401).send({
				code: "INVALID_2FA_CODE",
				message: "Invalid 2FA code",
		  });
		}

		// Now mark 2FA as fully enabled and clear pending flag
		await redisClient.hSet(userKey, {
			has2FAEnabled: "true",
			requires2FA: "true"
		});
		await redisClient.hDel(userKey, "twoFAPending");

		// Access Token (short-lived JWT)
		const accessToken = jwt.sign(
			{
				userId: user.id,
				username: user.username,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		// console.log("ACCESS TOKEN: ", accessToken);

		// Refresh Token
		// Generate a random salt (64 bytes)
		const refreshToken = crypto.randomBytes(64).toString("hex");
		// console.log("REFRESH_TOKEN: ", refreshToken);

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
			accessToken,
			refreshToken,
			tokenType: "Bearer",
			expiresIn : ACCESS_TOKEN_TTL,
			user: {
				id : user.uuid,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatarUrl: user.avatar,
				has2FAEnabled: true,
			},
			requires2FA: true,
		});
	} catch (error) {
		console.log("error: ", error);
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to verify 2FA",
		});
	}
}

export async function disable2FA(req, reply) {
	const { code, password } = req.body;
	console.log("code: ", code);
	console.log("password: ", password);

	if (!validate2FACode(code) || !validatePassword(password)) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_FIELDS",
			message: "Invalid fields",
		});
	}
	try {
		const token = req.headers.authorization.split(" ")[1];
		if (!token) {
			return reply.code(401).send({
				success: false,
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const userKey = `user:${decoded.username}`;
		const user = await redisClient.hGetAll(userKey);
		console.log("user:" ,user);
		if (!user || user.has2FAEnabled !== "true" || !user.twoFASecret) {
			return reply.code(401).send({
				success: false,
				code: "2FA_NOT_ENABLED",
			});
		}

		// Verify password
		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Password is incorrect",
			});
		}

		// Verify TOTP
		const verified = speakeasy.totp.verify({
			secret: user.twoFASecret,
			encoding: "base32",
			token: code,
			window: 1,
		});

		console.log("verified: ", verified);
		if (!verified) {
			return reply.code(400).send({
				success: false,
				code: "INVALID_2FA_CODE",
				message: "Invalid 2FA code"
			});
		}

		// Disable 2FA
		await redisClient.hSet(userKey, {
			has2FAEnabled: "false",
		});

		await redisClient.hDel(userKey, "twoFASecret");
		await redisClient.hDel(userKey, "twoFABackupCodes");

		// Issue new tokens
		const sessionId = crypto.randomUUID();

		const accessToken = jwt.sign(
			{
				userId: user.id,
				username: user.username,
				sessionId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);

		const refreshToken = crypto.randomBytes(64).toString("hex");
		const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

		await redisClient.set(
			`refresh:${user.id}`,
			hashedRefreshToken,
			{ EX: REFRESH_TOKEN_TTL }
		);

		return reply.code(200).send({
			success: true,
			code: "2FA_DISABLED_SUCCESS",
			message: "2FA successfully disabled",
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatarUrl: user.avatarUrl,
				has2FAEnabled: false,
			},
			requires2FA: false
		});
	} catch (error) {
		console.log("disable2FA error:", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to disable 2FA",
		});
	}
}
