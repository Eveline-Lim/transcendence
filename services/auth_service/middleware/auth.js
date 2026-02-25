// import { redisClient } from "../redisClient.js";
// import jwt from "jsonwebtoken";

// export async function authenticate(req, reply) {
// 	try {
// 		const authHeader = req.headers.authorization;
// 		if (!authHeader || !authHeader.startsWith("Bearer ")) {
// 			return reply.code(401).send({
// 				error: "Missing token"
// 			});
// 		}

// 		const token = authHeader.split(" ")[1];
// 		console.log("middleware token: ", token);

// 		// Check Redis blacklist first
// 		const isBlacklisted = await redisClient.get(`blacklist:${token}`);
// 		if (isBlacklisted) {
// 			return reply.code(401).send({
// 				error: "Token has been revoked"
// 			});
// 		}

// 		const decoded = jwt.verify(token, process.env.JWT_SECRET);
// 		// console.log("decoded token: ", decoded);

// 		req.user = decoded;
// 	} catch (err) {
// 		return reply.code(401).send({
// 			error: "Invalid token"
// 		});
// 	}
// }


import jwt from "jsonwebtoken";

export async function authenticate(req, reply) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

	const token = authHeader.split(" ")[1];
	console.log("middleware token: ", token);

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
