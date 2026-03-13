import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

export async function acceptTermsOfService(req, reply) {
	console.log("TERMS OF SERVICE");
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
		await redisClient.hSet(userKey, {
			acceptedTermsOfService: "true",
			acceptedTermsAt: new Date().toISOString(),
		});

		return reply.code(200).send({
			success: true,
			message: "Terms of service accepted",
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to update terms of service",
		});
	}
}
