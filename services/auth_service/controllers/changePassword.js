import { redisClient } from "../redisClient.js";
import { validatePassword } from "../utils/validators.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ChangePasswordRequest from "../models/ChangePasswordRequest.js";

export async function changePassword(req, reply) {
	let changePasswordData;

	try {
		changePasswordData = ChangePasswordRequest.validate(req.body);
	} catch (error) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_CREDENTIALS",
			message: error.message,
		});
	}

	const { currentPassword, newPassword } = changePasswordData;
	if (!validatePassword(newPassword)) {
		return reply.code(400).send({
			success: false,
			code: "INVALID_REQUEST_PARAMETERS",
			message: "New password does not meet requirements",
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

		if (!user || Object.keys(user).length === 0 || !user.password) {
			return reply.code(401).send({
				success: false,
				code: "USER_NOT_FOUND",
				message: "User does not exist",
			});
		}

		// Verify current password
		const isValid = await bcrypt.compare(currentPassword, user.password);
		if (!isValid) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_CREDENTIALS",
				message: "Current password is incorrect",
			});
		}

		// Check new password is different
		const isSame = await bcrypt.compare(newPassword, user.password);
		if (isSame) {
			return reply.code(400).send({
				success: false,
				code: "PASSWORD_UNCHANGED",
				message: "New password must be different from current password",
			});
		}

		// Hash and store new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await redisClient.hSet(userKey, { password: hashedPassword });

		return reply.code(200).send({
			success: true,
			code: "PASSWORD_CHANGE_SUCCESS",
			message: "Password successfully changed",
		});
	} catch (error) {
		console.error("CHANGE PASSWORD ERROR:", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to change password",
		});
	}
}
