import { validateEmail, validatePassword } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import { MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_SECONDS, RESET_TOKEN_ETTL } from "../utils/macros.js";
import { sendResetEmail } from "../mailService.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import ForgotPasswordRequest from "../models/ForgotPasswordRequest.js";
import ResetPasswordRequest from "../models/ResetPasswordRequest.js";

export async function forgotPassword(req, reply) {
	let forgotPasswordData;

	try {
		forgotPasswordData = ForgotPasswordRequest.validate(req.body);
		console.log("FORGOT PASSWORD DATA: ", forgotPasswordData);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	const { email } = forgotPasswordData;
	console.log("email: ", email);
	const validation = validateEmail(email);
	console.log("validation: ", validation);
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
		const token = crypto.randomBytes(64).toString("hex");

		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");
		// console.log("FORGOT PASSWORD hashed token: ", hashedToken);

		// Store hashed token in Redis
		await redisClient.set(
			`passwordReset:${hashedToken}`,
			userId,
			{ EX: RESET_TOKEN_ETTL }
		);

		const resetToken = await redisClient.get(`passwordReset:${hashedToken}`);
		console.log("resetToken: ", resetToken);
		// Send raw token in email link
		const resetLink = `${process.env.FRONTEND_URL}/password/reset?token=${token}`;
		console.log("resetLink: ", resetLink);

		// Send email
		try {
			await sendResetEmail(email, resetLink);
		} catch (emailErr) {
			console.warn("Failed to send reset email:", emailErr.message);
			// Don't fail the request if email sending fails — the token is stored
		}

		// Reset rate limite on success
		await redisClient.del(rlKey);

		console.log("HEREEEEEEEEE");
		return reply.code(202).send({
			success: true,
			code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
			message: "If an account exists for this email address, a password reset link has been sent.",
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to send reset password email",
		});
	}
}

export async function resetPassword(req, reply) {
	console.log("RESET");
	let resetPasswordData;

	try {
		resetPasswordData = ResetPasswordRequest.validate(req.body);
		console.log("RESET PASSWORD DATA: ", resetPasswordData);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	const { token, password } = resetPasswordData;
	console.log("token: ", token);
	console.log("password: ", password);

	const validationPassword = validatePassword(password);
	if (!validationPassword) {
		return reply.code(400).send({
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	try {
		// Hash received token
		const hashedToken = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");
		// console.log("RESET PASSWORD hashed token: ", hashedToken);


		const userId = await redisClient.get(`passwordReset:${hashedToken}`);
		console.log("userId: ", userId);
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
		// console.log("hasedPassword: ", hashedPassword);

		// Update user password
		await redisClient.hSet(userKey, {
			password: hashedPassword
		});

		// const userUpdated = await redisClient.hGetAll(userKey);
		// console.log("userUpdated: ", userUpdated);

		// Delete token
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
