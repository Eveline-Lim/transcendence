import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

export async function listSessions(req, reply) {
	console.log("SESSIONS");
	try {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return reply.code(401).send({
				code: "AUTH_REQUIRED",
				message: "Authentication required",
			});
		}

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			return reply.code(401).send({
				code: "INVALID_TOKEN",
				message: "Invalid or expired token",
			});
		}

		const { username, sessionId: currentSessionId } = decoded;

		const sessionKey = `user:sessions:${username}`;
		const sessionIds = await redisClient.sMembers(sessionKey);

		if (!sessionIds.length) {
			return reply.code(200).send({ sessions: [] });
		}

		const sessionsRaw = await Promise.all(
			sessionIds.map(async (id) => {
				const data = await redisClient.hGetAll(`session:${id}`);
				if (!data || Object.keys(data).length === 0) {
					await redisClient.sRem(sessionKey, id);
					return null;
				}

				return {
					id,
					deviceInfo: data.deviceInfo,
					ipAddress: data.ipAddress,
					location: data.location,
					createdAt: data.createdAt,
					lastActiveAt: data.lastActiveAt,
					isCurrent: id === currentSessionId,
				};
			})
		);

		// Remove null values
		const sessions = sessionsRaw.filter(Boolean);

		// Sort by lastActiveAt descending
		sessions.sort(
			(a, b) =>
				new Date(b.lastActiveAt).getTime() -
				new Date(a.lastActiveAt).getTime()
		);

		return reply.code(200).send({ sessions });
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		});
	}
}

// export async function revokeSession(req, reply) {
// 	console.log("REVOKE SESSION ID");
// 	try {
// 		const token = req.headers.authorization?.split(" ")[1];
// 		if (!token) {
// 			return reply.code(401).send({
// 				code: "AUTH_REQUIRED",
// 				message: "Authentication required",
// 			});
// 		}

// 		let decoded;
// 		try {
// 			decoded = jwt.verify(token, process.env.JWT_SECRET);
// 		} catch {
// 			return reply.code(401).send({
// 				code: "INVALID_TOKEN",
// 				message: "Invalid or expired token",
// 			});
// 		}

// 		const { username } = decoded;
// 		const { sessionId } = req.params;
// 		if (!sessionId) {
// 			return reply.code(400).send({
// 				code: "SESSION_ID_REQUIRED",
// 				message: "Session ID is required",
// 			});
// 		}

// 		// // Prevent revoking current session
// 		// if (sessionId === currentSessionId) {
// 		// 	return reply.code(400).send({
// 		// 		code: "CANNOT_REVOKE_CURRENT",
// 		// 		message: "You cannot revoke your current session",
// 		// 	});
// 		// }

// 		const sessionKey = `session:${sessionId}`;
// 		const userSessionsKey = `user:sessions:${username}`;

// 		// Check if session exists
// 		const exists = await redisClient.exists(sessionKey);
// 		if (!exists) {
// 			return reply.code(404).send({
// 				code: "SESSION_NOT_FOUND",
// 				message: "Session not found",
// 			});
// 		}

// 		await redisClient.multi()
// 			.del(sessionKey)
// 			.sRem(userSessionsKey, sessionId)
// 			.exec();

// 		return reply.code(204).send({
// 			message: "Session revoked successfully",
// 		});
// 	} catch (error) {
// 		req.log.error(error);
// 		return reply.code(500).send({
// 			code: "INTERNAL_ERROR",
// 			message: "Internal server error",
// 		});
// 	}
// }

