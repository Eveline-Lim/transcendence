import { validateEmail } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS } from "../utils/macros.js";
import { sendResetEmail } from "../mailService.js";
import crypto from "node:crypto";

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

		// Generate token
		const resetToken = crypto.randomBytes(64).toString("hex");

		// Store token in Redis
		const resetKey = `passwordReset:${resetToken}`;
		await redisClient.set(resetKey, username, {
			EX: 900, // 15 minutes
		});

		// Create reset URL
		const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
		// console.log("resetLink: ", resetLink);

		// Send email
		await sendResetEmail(email, resetLink);

		// Reset rate limite on success
		await redisClient.del(rlKey);

		return reply.code(202).send({
			code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
			message: "If an account exists for this email address, a password reset link has been sent.",
			success: true
		});
	} catch (error) {
		console.log("ERROR: ", error);
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to send reset password email",
		});
	}
}
