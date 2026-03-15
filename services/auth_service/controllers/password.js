import { validateEmail, validatePassword } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS, RESET_TOKEN_ETTL } from "../utils/macros.js";
import { sendResetEmail } from "../mailService.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ForgotPasswordRequest from "../models/ForgotPasswordRequest.js";
import ResetPasswordRequest from "../models/ResetPasswordRequest.js";
import ChangePasswordRequest from "../models/ChangePasswordRequest.js";
import { hostname } from "node:os";

/**
 * Handles forgot password requests.
 * Validates the email, applies rate limiting per email+IP, generates a
 * signed reset token, stores its hash in Redis and sends a reset link
 * by email. Always returns a 202 to avoid leaking whether the email exists.
 */
export async function forgotPassword(req, reply) {
	let forgotPasswordData;

	try {
		forgotPasswordData = ForgotPasswordRequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: error.message,
		});
	}

	const { email } = forgotPasswordData;
	const validation = validateEmail(email);
	if (!validation) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid field",
		});
	}
	const ip = req.ip;

	try {
		// Rate limit check
		const rlKey = `passwordReset:rateLimit:${email}:${ip}`;
		const attempts = await redisClient.incr(rlKey);
		if (attempts === 1) {
			await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
		}
		if (attempts > MAX_LOGIN_ATTEMPTS) {
			return reply.code(429).send({
				success: false,
				code: "TOO_MANY_ATTEMPTS",
				message: "Too many login attempts. Try again in five minutes."
			});
		}
		// Return 202 to avoid revealing whether the email exists
		const username = await redisClient.get(`email:${email}`);
		if (!username) {
			return reply.code(202).send({
				success: true,
				code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
				message: "If an account exists for this email address, a password reset link has been sent.",
			});
		}

		const user = await redisClient.hGetAll(`user:${username}`);
		const userId = user.id;

		// Generate token
		const token = crypto.randomBytes(64).toString("hex");

		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");

		// Store hashed token in Redis
		await redisClient.set(
			`passwordReset:${hashedToken}`,
			userId,
			{ EX: RESET_TOKEN_ETTL }
		);

		// Build the reset URL dynamically from the incoming request origin and with the raw token as a query param
		const origin = `${req.headers.origin}`;
		const resetLink = `${origin}/password/reset?token=${token}`;
		console.log("resetLink: ", resetLink);

		// Send email
		try {
			await sendResetEmail(email, resetLink);
		} catch (emailErr) {
			console.warn("Failed to send reset email:", emailErr.message);
			// Don't fail the request if email sending fails — the token is stored
		}

		// Clear the rate-limite on success
		await redisClient.del(rlKey);

		return reply.code(202).send({
			success: true,
			code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
			message: "If an account exists for this email address, a password reset link has been sent.",
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to send reset password email",
		});
	}
}

/**
 * Handles password reset via a token received from the reset email link.
 * Hashes the incoming token, looks up the associated userId in Redis,
 * then updates the user's password and invalidates the token.
 */
export async function resetPassword(req, reply) {
	let resetPasswordData;

	try {
		resetPasswordData = ResetPasswordRequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	const { token, password } = resetPasswordData;
	const validationPassword = validatePassword(password);
	if (!validationPassword) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	try {
		// Hash the incoming token to compare against the stored hash
		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");

		const userId = await redisClient.get(`passwordReset:${hashedToken}`);
		if (!userId) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}
		const username = await redisClient.get(`userid:${userId}`);
		console.log("username: ", username);
		if (!username) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Update user password
		await redisClient.hSet(userKey, {
			password: hashedPassword
		});

		// Invalidate the reset token so it cannot be reused
		await redisClient.del(`passwordReset:${hashedToken}`);

		return reply.code(200).send({
			success: true,
			code: "PASSWORD_RESET_SUCCESS",
			message: "Password successfully reset",
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to reset password",
		});
	}
}

/**
 * Handles authenticated password change requests.
 * Requires a valid JWT in the Authorization header.
 * Verifies the current password, enforces that the new password differs,
 * then updates the stored hash.
 */
export async function changePassword(req, reply) {
	let changePasswordData;

	try {
		changePasswordData = ChangePasswordRequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	const { currentPassword, newPassword } = changePasswordData;
	const validation = validatePassword(newPassword);
	if (!validation) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
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
		} catch (error) {
			console.error("JWT VERIFY ERROR:", error);
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}
		const username = decoded.username;
		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		const isValid = await bcrypt.compare(currentPassword, user.password);
		if (!isValid) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Current password is incorrect",
			});
		}

		// Reject the change if the new password is identical to the current one
		const isSame = await bcrypt.compare(newPassword, user.password);
		if (isSame) {
			return reply.code(400).send({
				success: false,
				code: "PASSWORD_UNCHANGED",
				message: "New password must be different from current password",
			});
		}
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await redisClient.hSet(userKey, {
			...user,
			password: hashedPassword,
		});
		return reply.code(200).send({
			success: true,
			code: "PASSWORD_CHANGE_SUCCESS",
			message: "Password successfully changed",
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to change password",
		});
	}
}

