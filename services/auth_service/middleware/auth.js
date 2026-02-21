import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

export async function authenticate(req, reply) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({
				error: "Missing token"
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

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// console.log("decoded token: ", decoded);

		req.user = decoded;
	} catch (err) {
		return reply.code(401).send({
			error: "Invalid token"
		});
	}
}
