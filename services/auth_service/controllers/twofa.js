import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../utils/macros.js";
import AuthResponse from "../models/AuthResponse.js";
import UserInfo from "../models/UserInfo.js";
import TwoFactorSetup from "../models/TwoFactorSetup.js";
import Verify2FARequest from "../models/Verify2FARequest.js";
import Disable2FARequest from "../models/Disable2FARequest.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { validatePassword, validate2FACode } from "../utils/validators.js"
import { generateBackupCodes } from "../utils/generateBackupCodes.js";

/*
 * Initiates the 2FA setup flow for the authenticated user.
 * Generates a TOTP secret and QR code, hashes and stores backup codes,
 * then marks 2FA as pending until the user verifies with verifyTwoFA.
 */
export async function enableTwoFA(req, reply) {
	try {
		const token = req.headers.authorization?.split(" ")[1];
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

		const username = decoded.username;
		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		if (user.has2FAEnabled === "true") {
			return reply.code(409).send({
				success: false,
				code: "2FA_ALREADY_ENABLED",
				message: "2FA already enabled",
			});
		}

		// Generate TOTP secret
		const secret = speakeasy.generateSecret({ name: "Transcendence" });

		// Generate a QR code data URL the user can scan with an authenticator app
		const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

		// Generate backup codes:
		// `codes`       — plaintext, shown to the user once and never stored
		// `backupCodes` — SHA-256 hashes, persisted in Redis
		const { codes, backupCodes } = generateBackupCodes();

		// Store the secret and hashed backup codes as pending (active only after verifyTwoFA)
		await redisClient.hSet(userKey, {
			twoFASecret: secret.base32,
			twoFABackupCodes: JSON.stringify(backupCodes),
			twoFAPending: "true"
		});

		const responseModel = TwoFactorSetup.validate({
			secret: secret.base32,
			qrCodeUrl,
			backupCodes: codes
		});
		return reply.code(200).send(responseModel.toJSON());
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to enable 2FA",
		});
	}
}

/**
 * Completes the 2FA setup by verifying the first TOTP code from the user's
 * authenticator app. On success, marks 2FA as fully enabled and issues a
 * fresh access + refresh token pair.
 */
export async function verifyTwoFA(req, reply) {
	let verifyData;

	try {
		verifyData = Verify2FARequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: error.message,
		});
	}

	const { code } = verifyData;

	// Validate the 6-digit TOTP code format
	const validation = validate2FACode(code);
	if (!validation) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "Invalid fields",
		});
	}

	try {
		const token = req.headers.authorization?.split(" ")[1];
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

		const username = decoded.username;
		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user || !user.twoFASecret) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		// Verify the TOTP code
		const verified = speakeasy.totp.verify({
			secret: user.twoFASecret,
			encoding: "base32",
			token: code,
			window: 1,
		});
		if (!verified) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_2FA_CODE",
				message: "Invalid 2FA code",
		  });
		}

		// Mark 2FA as fully enabled and clear pending flag
		await redisClient.hSet(userKey, {
			has2FAEnabled: "true",
			requires2FA: "true"
		});
		await redisClient.hDel(userKey, "twoFAPending");

		const sessionId = crypto.randomUUID();

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

		// Refresh Token
		// Generate a random salt (64 bytes)
		const refreshToken = crypto.randomBytes(64).toString("hex");
		const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

		// Store refresh token in Redis
		await redisClient.set(
			`refresh:${refreshTokenHash}`,
			`${user.id}:${sessionId}`,
			{ EX: REFRESH_TOKEN_TTL }
		);

		const userInfo = UserInfo.fromRedis(user);

		const response = new AuthResponse({
			accessToken,
			refreshToken,
			tokenType: "Bearer",
			expiresIn: ACCESS_TOKEN_TTL,
			user: userInfo,
			requires2FA: "false",
		});

		return reply.code(200).send(response);
	} catch (error) {
		console.log("verify2FA error:", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to verify 2FA",
		});
	}
}

/**
 * Disables 2FA for the authenticated user after verifying both their
 * current password and a live TOTP code. Clears all stored 2FA data
 * and issues a fresh token pair with requires2FA set to false.
 */
export async function disable2FA(req, reply) {
	let disableData;

	try {
		disableData = Disable2FARequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: error.message,
		});
	}

	const { code, password } = disableData;
	if (!validate2FACode(code) || !validatePassword(password)) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_FIELDS",
			message: "Invalid fields",
		});
	}
	try {
		const token = req.headers.authorization?.split(" ")[1];
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
				message: "2FA is not enabled",
			});
		}

		// Require the current password as a second proof of identity
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
		if (!verified) {
			return reply.code(400).send({
				success: false,
				code: "INVALID_2FA_CODE",
				message: "Invalid 2FA code"
			});
		}

		// Clear all 2FA fields from the user record
		await redisClient.hSet(userKey, {
			has2FAEnabled: "false",
			requires2FA: "false"
		});

		await redisClient.hDel(userKey, "twoFASecret");
		await redisClient.hDel(userKey, "twoFABackupCodes");

		// Issue a fresh token pair now that 2FA is disabled
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
		const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

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

		return reply.code(200).send(response);
	} catch (error) {
		console.log("disable2FA error:", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to disable 2FA",
		});
	}
}
