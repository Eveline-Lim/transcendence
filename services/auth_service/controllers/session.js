import { redisClient } from "../redisClient.js";
import jwt from "jsonwebtoken";

import Session from "../models/Session.js";
import ListSessionsResponse from "../models/ListSessions200Response.js";
import RevokeAllSessionsResponse from "../models/RevokeAllSessions200Response.js";

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

				return Session.validate({
					id,
					deviceInfo: data.deviceInfo,
					ipAddress: data.ipAddress,
					location: data.location,
					createdAt: data.createdAt,
					lastActiveAt: data.lastActiveAt,
					isCurrent: id === currentSessionId,
				});
			})
		);

		// Remove null values
		const sessions = sessionsRaw.filter(Boolean);

		// Sort by lastActiveAt descending
		sessions.sort(
			(a, b) => b.lastActiveAt - a.lastActiveAt
		);

		const response = ListSessionsResponse.fromObject({ sessions });
		console.log("LIST SESSIONS RESPONSE: ", response);

		return reply.code(200).send(response.toJSON());
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		});
	}
}

export async function revokeSession(req, reply) {
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

		const { username } = decoded;
		const { sessionId } = req.params;
		if (!sessionId) {
			return reply.code(400).send({
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
				code: "SESSION_NOT_FOUND",
				message: "Resource not found",
			});
		}

		const belongsToUser = await redisClient.sIsMember(userSessionsKey, sessionId);
		if (!belongsToUser) {
			return reply.code(404).send({
				code: "SESSION_NOT_FOUND",
				message: "Resource not found",
			});
		}

		await redisClient.multi()
			.del(sessionKey)
			.sRem(userSessionsKey, sessionId)
			.exec();

		return reply.code(204).send();
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		});
	}
}

export async function revokeAllSessions(req, reply) {
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
		if (!username) {
			return reply.code(401).send({
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
			code: "INTERNAL_ERROR",
			message: "Unable to revoke sessions",
		});
	}
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

		const { userId, username, sessionId: currentSessionId } = decoded;

		// Session requested from frontend
		const targetSessionId = req.params.sessionId || currentSessionId;

		console.log("Requested session:", targetSessionId);
		console.log("Current session:", currentSessionId);

		const sessionKey = `session:${targetSessionId}`;
		console.log("sessionKey: ", sessionKey);
		const userSessionsKey = `user:sessions:${username}`;
		console.log("userSessionsKey: ", userSessionsKey);
		const refreshKey = `refresh:${userId}:${targetSessionId}`;

		const exists = await redisClient.exists(sessionKey);
		if (!exists) {
			return reply.code(404).send({
				success: false,
				code: "SESSION_NOT_FOUND",
				message: "Session not found",
			});
		}

		// Check the session belongs to the user
		const belongs = await redisClient.sIsMember(userSessionsKey, targetSessionId);
		if (!belongs) {
			return reply.code(403).send({
				success: false,
				code: "FORBIDDEN",
				message: "Session does not belong to user",
			});
		}

		await redisClient
			.multi()
			.del(sessionKey)
			.del(refreshKey)
			.sRem(userSessionsKey, targetSessionId)
			.exec();

		console.log("SESSION REVOKED:", targetSessionId);

		return reply.code(204).send();
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		});
	}
}

export async function revokeAllSessions(req, reply) {
	console.log("REVOKE ALL SESSIONS");
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

		// Retrieve all sessions for the current user
		const sessionIds = await redisClient.sMembers(`user:sessions:${username}`);
		console.log("sessioNIds: ", sessionIds);

		// Filter the current session
		const sessionsToRevoke = sessionIds.filter(id => id !== currentSessionId);
		console.log("sessionsToRevoke: ", sessionsToRevoke);

		// Delete all the other sessions
		const multi = redisClient.multi();
		sessionsToRevoke.forEach(id => {
			multi.del(`session:${id}`);
			multi.sRem(`user:sessions:${username}`, id);
		});
		await multi.exec();

		const response = RevokeAllSessionsResponse.validate({
			revokedCount: sessionsToRevoke.length
		});

		// Return the number of revoked sessions
		return reply.code(200).send(response.toJSON());
	} catch (error) {
		return reply.code(500).send({
			success: false,
			code: "INTERNAL_ERROR",
			message: "Unable to revoke sessions",
		});
	}
}
