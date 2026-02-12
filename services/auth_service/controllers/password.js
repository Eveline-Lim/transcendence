import { validateEmail, validatePassword } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS, RESET_TOKEN_ETTL } from "../utils/macros.js";
import { sendResetEmail } from "../mailService.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";

export async function forgotPassword(req, reply) {
	const { email } = req.body;
	console.log("REQ BODY email: ", req.body);
	if (!email) {
		return reply.code(400).send({
			code: "INVALID_CREDENTIALS",
			message: "Invalid request parameters",
		});
	}

	const validation = validateEmail(email);
	if (!validation) {
		return reply.code(400).send({
			code: "INVALID_CREDENTIALS",
			message: "Invalid field",
		});
	}
	const ip = req.ip;

	try {
		// Rate limit check
		const rlKey = `login:rateLimit:${email}:${ip}`;
		console.log("rlKey: ", rlKey);
		const attempts = await redisClient.incr(rlKey);
		if (attempts === 1) {
			await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
		}
		// console.log("attempts: ", attempts);
		if (attempts > MAX_LOGIN_ATTEMPTS) {
			return reply.code(429).send({
				code: "TOO_MANY_ATTEMPTS",
				message: "Too many login attempts. Try again in five minutes."
			});
		}
		// Return 202 to avoid revealing whether the email exists
		const username = await redisClient.get(`email:${email}`);
		if (!username) {
			return reply.code(202).send({
				code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
				message: "If an account exists for this email address, a password reset link has been sent.",
			});
		}

		const user = await redisClient.hGetAll(`user:${username}`);
		const userId = user.id;

		// Generate token
		let token = crypto.randomBytes(64).toString("hex");

		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");

		// Store hashed token in Redis
		await redisClient.set(
			`resetToken:${hashedToken}`,
			userId,
			{ EX: RESET_TOKEN_ETTL }
		);

		// Send raw token in email link
		const resetLink = `${process.env.FRONTEND_URL}/password/reset?token=${token}`;
		console.log("resetLink: ", resetLink);

		// Send email
		await sendResetEmail(email, resetLink);

		// Reset rate limite on success
		await redisClient.del(rlKey);

		return reply.code(202).send({
			success: true,
			code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
			message: "If an account exists for this email address, a password reset link has been sent.",
		});
	} catch (error) {
		console.log("ERROR: ", error);
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to send reset password email",
		});
	}
}

export async function resetPassword(req, reply) {
	const { token, password } = req.body;
	// console.log("REQ BODY:", req.body);

	// COMMENTED OUT TO SIMPLIFY TESTING
	// const validation = validatePassword(password);
	// if (!validation) {
	// 	return reply.code(400).send({
	// 		code: "INVALID_CREDENTIALS",
	// 		message: "Invalid fields",
	// 	});
	// }

	try {
		// Hash received token
		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");
		// console.log("hashed token: ", hashedToken);

		const userId = await redisClient.get(`resetToken:${hashedToken}`);
		console.log("userId: ", userId);
		if (!userId) {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired reset token",
			});
		}
		const username = await redisClient.get(`userid:${userId}`);
		console.log("username: ", username);
		if (!username) {
			return reply.code(401).send({
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		const userKey = `user:${username}`;
		const user = await redisClient.hGetAll(userKey);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(401).send({
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log("hasedPassword: ", hashedPassword);

		// Update user password
		await redisClient.hSet(userKey, {
			password: hashedPassword
		});

		// const userUpdated = await redisClient.hGetAll(userKey);
		// console.log("userUpdated: ", userUpdated);

		// Delete token
		await redisClient.del(`resetToken:${hashedToken}`);

		return reply.code(200).send({
			success: true,
			code: "PASSWORD_RESET_SUCCESS",
			message: "Password successfully reset",
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to reset password",
		});
	}
}
