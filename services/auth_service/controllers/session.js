import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

export async function listSessions(req, reply) {
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
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error",
		});
	}
}

export async function revokeSession(req, reply) {
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

		const { username } = decoded;
		const { sessionId } = req.params;
		if (!sessionId) {
			return reply.code(400).send({
				success: false,
				code: "SESSION_ID_REQUIRED",
				message: "Session ID is required",
			});
		}

		const sessionKey = `session:${sessionId}`;
		const userSessionsKey = `user:sessions:${username}`;

		// Check if session exists and belongs to user
		const session = await redisClient.hGetAll(sessionKey);
		if (!session || Object.keys(session).length === 0) {
			return reply.code(404).send({
				success: false,
				code: "SESSION_NOT_FOUND",
				message: "Resource not found",
			});
		}

		const belongsToUser = await redisClient.sIsMember(userSessionsKey, sessionId);
		if (!belongsToUser) {
			return reply.code(404).send({
				success: false,
				code: "SESSION_NOT_FOUND",
				message: "Resource not found",
			});
		}

		await redisClient.multi()
			.del(sessionKey)
			.sRem(userSessionsKey, sessionId)
			.exec();

		return reply.code(200).send({success: true});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error",
		});
	}
}

export async function revokeAllSessions(req, reply) {
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

		const { username, sessionId: currentSessionId } = decoded;
		if (!username) {
			return reply.code(401).send({
				success: false,
				code: "INVALID_TOKEN",
				message: "Token invalid",
			});
		}

		const sessionIds = await redisClient.sMembers(`user:sessions:${username}`);
		const sessionsToRevoke = sessionIds.filter(id => id !== currentSessionId);

		if (sessionsToRevoke.length > 0) {
			const multi = redisClient.multi();
			for (const id of sessionsToRevoke) {
				multi.del(`session:${id}`);
				multi.sRem(`user:sessions:${username}`, id);
			}
			await multi.exec();
		}

		return reply.code(200).send({
			revokedCount: sessionsToRevoke.length,
		});
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to revoke sessions",
		});
	}
}
