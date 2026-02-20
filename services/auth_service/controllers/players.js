import { redisClient } from "../redisClient.js";

export async function retrieveUser(req, reply) {
	console.log("User:", req.user);
	const username = req.user.username;

	try {
		const user = await redisClient.hGetAll(`user:${username}`);
		if (!user || Object.keys(user).length === 0) {
			return reply.code(404).send({
				success: false,
				message: "User not found"
			});
		}

		const now = new Date().toISOString();

		return reply.code(200).send ({
			success: true,
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			email: user.email,
			avatarUrl: user.avatarUrl,
			createdAt: now,
			updatedAt: now
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to retrieve user data",
		});
	}
}
