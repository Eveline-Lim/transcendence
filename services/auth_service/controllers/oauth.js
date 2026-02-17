import { redisClient } from "../redisClient.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../utils/macros.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export async function initiateOauth(req, reply) {
	const { provider } = req.params;
	console.log("provider: \n", provider);

	if (provider !== "fortytwo") {
		return reply.code(400).send({
			code: "INVALID_PROVIDER",
			message: "Unknown OAuth provider"
		});
	}

	try {
    	// Generate a temporary Oauth session
		const oauthSessionId = crypto.randomUUID();
		console.log("oauthSession: \n", oauthSessionId);

    	// Generate a CSRF token to protect against cross-site request forgery attacks
		const csrfToken = crypto.randomUUID();
		console.log("csrfToken: \n", csrfToken);

		const now = new Date().toISOString();

		await redisClient.hSet(`session:${oauthSessionId}`, {
			csrfToken,
			createdAt: now,
			isOAuth: "true"
		});

    const state = oauthSessionId;

      // Create the 42 authorization url
		const authUrl =
			"https://api.intra.42.fr/oauth/authorize?" +
			new URLSearchParams({
				client_id: process.env.FORTYTWO_CLIENT_ID,
				redirect_uri: process.env.FORTYTWO_CALLBACK_URL,
				response_type: "code",
				state
			});
		console.log("authUrl: \n", authUrl);

      // Redirect the user to authorization page
		return reply.redirect(authUrl);

	} catch (error) {
		console.error("OAuth init error:", error);
		return reply.code(500).send({
			code: "OAUTH_INIT_FAILED",
			message: "Failed to initiate OAuth"
		});
	}
}

export async function oauthCallback(req, reply) {
	const { provider } = req.params;
	const { code, state } = req.query;
	console.log("code: \n", code);
	console.log("state: \n", state);

	if (!provider || !code || !state) {
		return reply.code(400).send({
			code: "MISSING_PARAMS",
			message: "Missing provider, code, state"
		});
	}

	if (provider !== "fortytwo") {
		return reply.code(400).send({
			code: "INVALID_PROVIDER",
			message: "OAuth provider not implemented"
		});
	}

	try {
		const oauthSessionId = state;

		// Validate session in Redis
		const storedSession = await redisClient.hGetAll(`session:${oauthSessionId}`);

		if (!storedSession || Object.keys(storedSession).length === 0 || 
			storedSession.isOAuth !== "true") {
				return reply.code(400).send({
					code: "INVALID_STATE",
					message: "CSRF validation failed"
				});
		}

		// Exchange code for 42 access token
		const tokenResponse = await fetch("https://api.intra.42.fr/oauth/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: process.env.FORTYTWO_CLIENT_ID,
				client_secret: process.env.FORTYTWO_CLIENT_SECRET,
				code,
				redirect_uri: `${process.env.FORTYTWO_CALLBACK_URL}`
			})
		});

		if (!tokenResponse.ok) {
			throw new Error("Token exchange failed");
		}

    	const tokenData = await tokenResponse.json();
		const accessToken42 = tokenData.access_token;

    	// Fetch 42 user profile
    	const userResponse = await fetch("https://api.intra.42.fr/v2/me", {
			headers: { 
				Authorization: `Bearer ${accessToken42}`
			}
		});
		if (!userResponse.ok) {
			throw new Error("Failed to fetch 42 user");
		}

    	const fortyTwoUser = await userResponse.json();

    	// Check if user exists
    	const userKey = `user:${fortyTwoUser.login}`;
    	let user = await redisClient.hGetAll(userKey);

		if (!user || Object.keys(user).length === 0) {
			const uuid = crypto.randomUUID();
			user = {
				id: uuid,
				username: fortyTwoUser.login,
				displayName: fortyTwoUser.displayname || fortyTwoUser.login,
				email: fortyTwoUser.email,
				avatarUrl: fortyTwoUser.image.link || "./assets/avatar.jpg",
				has2FAEnabled: "false",
				requires2FA: "false"
			};

			await redisClient.hSet(userKey, user);
      		await redisClient.set(`email:${user.email}`, user.username);
			await redisClient.set(`userid:${uuid}`, user.username);
		}

		// Create session
		const sessionId = crypto.randomUUID();
		const now = new Date().toISOString();

		await redisClient
		.multi()
		.hSet(`session:${sessionId}`, {
			id: sessionId,
			userId: user.id,
			deviceInfo: req.headers["user-agent"] ?? "unknown",
			ipAddress: req.ip,
			location: "unknown",
			createdAt: now,
			lastActiveAt: now,
			isCurrent: "true"
		})
		.sAdd(`user:sessions:${user.username}`, sessionId)
		.exec();

    	// JWT access token
		let accessToken = jwt.sign({ 
			userId: user.id, 
			username: user.username, 
			sessionId },
			process.env.SECRET_TOKEN,
			{ expiresIn: ACCESS_TOKEN_TTL }
		);
		accessToken = await bcrypt.hash(accessToken, 10);

		// Refresh token
		let refreshToken = crypto.randomBytes(64).toString("hex");
		refreshToken = await bcrypt.hash(refreshToken, 10);
		await redisClient.set(`refresh:${refreshToken}`, 
			user.id, {
				EX: REFRESH_TOKEN_TTL
    	});

		// Delete temporary OAuth session
		await redisClient.del(`session:${oauthSessionId}`);
		
		// Redirect to frontend with tokens
		return reply.redirect(
			`${process.env.FRONTEND_URL}/game`
		);
	} catch (err) {
		console.error("OAuth callback error:", err);
		return reply.code(500).send({
			code: "OAUTH_FAILED",
			message: "OAuth authentication failed"
		});
	}
}
