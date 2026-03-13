import { redisClient } from "../redisClient.js";
// import jwt from "jsonwebtoken";

export async function acceptPrivacyPolicy(req, reply) {
	console.log("PRIVACY POICY");
	try {
		// const token = req.headers.authorization?.split(" ")[1];
		// if (!token) {
		// 	return reply.code(401).send({
		// 		success: false,
		// 		code: "AUTH_REQUIRED",
		// 		message: "Authentication required",
		// 	});
		// }

		// let decoded;
		// try {
		// 	decoded = jwt.verify(token, process.env.JWT_SECRET);
		// } catch {
		// 	return reply.code(401).send({
		// 		success: false,
		// 		code: "INVALID_TOKEN",
		// 		message: "Invalid or expired token",
		// 	});
		// }
		const { username } = req.user;
		console.log("PP username: ", username);
		const userKey = `user:${username}`;

		await redisClient.hSet(userKey, {
			acceptedPrivacyPolicy: "true",
			acceptedPrivacyAt: new Date().toISOString(),
		});

		return reply.code(200).send({
			success: true,
			message: "Privacy policy accepted",
		});
	} catch (error) {
		console.error("Error accepting privacy policy: ", error);
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to update privacy policy",
		});
	}
}
