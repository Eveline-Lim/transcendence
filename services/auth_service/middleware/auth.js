import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

export async function authenticate(req, reply) {
	try {
		const authHeader = req.headers.authorization;
		console.log("authHeader: ", authHeader);
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({
				success: false,
				code: "AUTH_REQUIRED",
				message: "Missing token",
			});
		}

		const token = authHeader.split(" ")[1];

		// Check if token is blacklisted
		const isBlacklisted = await redisClient.get(`blacklist:${token}`);
		if (isBlacklisted) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Token has been revoked"
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const { sessionId, username } = decoded;
		if (!sessionId || !username) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Token invalid",
			});
		}

		// Check if session still exists
		const sessionExists = await redisClient.exists(`session:${sessionId}`);
		if (!sessionExists) {
			return reply.code(401).send({
				success: false,
				code: "SESSION_REVOKED",
				message: "Session has been revoked",
			});
		}

		req.user = decoded;
		return ;
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Authentication failed",
		});
	}
}
