import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

// TODO: check token expiration
export async function authenticate(req, reply) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Missing token",
			});
		}

		const token = authHeader.split(" ")[1];
		console.log("middleware token: ", token);

		// Check if token is blacklisted
		const isBlacklisted = await redisClient.get(`blacklist:${token}`);
		if (isBlacklisted) {
			return reply.code(401).send({
				error: "Token has been revoked"
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log("decoded token: ", decoded);
		} catch (error) {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const { sessionId, username } = decoded;
		console.log("decoded: ", decoded);

		if (!sessionId || !username) {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Token invalid",
			});
		}

		// Check if session still exists
		const sessionExists = await redisClient.exists(`session:${sessionId}`);
		console.log("sessionId: ", sessionId);
		console.log(sessionExists);
		if (!sessionExists) {
			return reply.code(401).send({
				code: "SESSION_REVOKED",
				message: "Session has been revoked",
			});
		}

		req.user = decoded;
		console.log("MIDDLEWARE req.user: ", req.user);
		return ;
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Authentication failed",
		});
	}
}
