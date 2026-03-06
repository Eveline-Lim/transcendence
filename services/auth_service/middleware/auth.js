import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

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

	// Check Redis blacklist first
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
	req.user = decoded;
	console.log("req.user: ", req.user);
	return ;
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Authentication failed",
		});
	}
}
