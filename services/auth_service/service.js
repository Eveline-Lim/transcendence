// implementation of the operations in the openapi specification
import { redisClient } from "./redisClient.js";
import { validateEmail, validateInputs, validatePassword, validate2FACode } from "./utils/validators.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from 'node:crypto';
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { generateBackupCodes } from "./utils/generateBackupCodes.js";

const MAX_LOGIN_ATTEMPTS = 5; // per 15 minutes
const RATE_LIMIT_WINDOW_SECONDS = 5 * 60;
const ACCESS_TOKEN_TTL = 60 * 24; // 24h
const REFRESH_TOKEN_TTL = 60 * 60 * 24; // 24h in seconds
const JWT_TTL = 60 * 60; // 1h for logout token blacklist

dotenv.config();

export class Service {
	// REGISTER
	// async register(req, reply) {
	// 	const { username, displayName, password, email, avatarUrl, has2FAEnabled } = req.body;
	// 	console.log("BODY: ", req.body);

	// 	const validation = validateInputs({ username, email, password }, false);
	// 	if (!validation.success) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid fields",
	// 		});
	// 	}

	// 	try {
	// 		const userKey = `user:${username}`;
	// 		console.log("userKey: ", userKey);
	// 		const emailKey = `email:${email}`;
	// 		console.log("emailKey: ", emailKey);

	// 		// Check username uniqueness
	// 		const existingUser = await redisClient.exists(userKey);
	// 		if (existingUser) {
	// 			return reply.code(409).send({
	// 				code: "USER_ALREADY_EXISTS",
	// 				message: "Username already exists",
	// 			});
	// 		}

	// 		// Check email uniqueness
	// 		const existingEmail = await redisClient.exists(emailKey);
	// 		if (existingEmail) {
	// 			return reply.code(409).send({
	// 				code: "EMAIL_ALREADY_EXISTS",
	// 				message: "Email already exists",
	// 			});
	// 		}

	// 		const uuid = crypto.randomUUID();
	// 		console.log("UUID: ", uuid);

	// 		const hashedPassword = await bcrypt.hash(password, 10);
	// 		// console.log("hashedPassword: ", hashedPassword);

	// 		// Save user
	// 		await redisClient.hSet(userKey, {
	// 			id: uuid,
	// 			username,
	// 			displayName,
	// 			hashedPassword,
	// 			email,
	// 			avatarUrl,
	// 			has2FAEnabled: has2FAEnabled ? "1" : "0"
	// 		});

	// 		await redisClient.set(emailKey, username);
	// 		await redisClient.set(`userid:${uuid}`, username);

	// 		return reply.code(201).send({
	// 			code: "USER_CREATED",
	// 			message: "User successfully registered",
	// 		});

	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to register user",
	// 		});
	// 	}
	// }

	// // LOGIN
	// async login(req, reply) {
	// 	const { identifier, password } = req.body;
	// 	// console.log("REQ BODY: ", req.body);
	// 	// For rate limiting per IP
	// 	const ip = req.ip;
	// 	// console.log("IP: ", ip);

	// 	const validation = validateInputs({ identifier, password }, true);
	// 	if (!validation.success) {
	// 		return reply.code(400).send({
	// 			code: "INVALID REQUEST PARAMETERS",
	// 			message: "Invalid fields",
	// 		});
	// 	}

	// 	try {
	// 		// Rate limit check
	// 		const rlKey = `login:rl:${identifier}:${ip}`;
	// 		console.log("rlKey: ", rlKey);
	// 		const attempts = await redisClient.incr(rlKey);
	// 		if (attempts === 1) {
	// 			await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
	// 		}
	// 		// console.log("attempts: ", attempts);
	// 		if (attempts > MAX_LOGIN_ATTEMPTS) {
	// 			return reply.code(429).send({
	// 				code: "TOO_MANY_ATTEMPTS",
	// 				message: "Too many login attempts. Try again in five minutes."
	// 			});
	// 		}

	// 		let username;

	// 		if (identifier.includes("@")) {
	// 			username = await redisClient.get(`email:${identifier}`);
	// 			if (!username) {
	// 				return reply.code(401).send({
	// 					code: "INVALID_CREDENTIALS",
	// 					message: "Invalid username/email or password",
	// 				});
	// 			}
	// 		} else {
	// 			username = identifier;
	// 		}

	// 		const userKey = `user:${username}`;
	// 		console.log("userKey: ", userKey);

	// 		const existingUser = await redisClient.exists(userKey);
	// 		if (!existingUser) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_CREDENTIALS",
	// 				message: "Invalid username/email or password",
	// 			});
	// 		}
	// 		// Retrieve all user fields from Redis by username or email key.
	// 		const user = await redisClient.hGetAll(userKey);

	// 		// If the user exists, we compare the entered password with the stored hashed password.
	// 		const isMatch = await bcrypt.compare(password, user.hashedPassword);
	// 		if (!isMatch) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_CREDENTIALS",
	// 				message: "Invalid username or password",
	// 			});
	// 		}

	// 		// Reset rate limite on success
	// 		await redisClient.del(rlKey);

	// 		// Create session
	// 		const sessionId = crypto.randomUUID();
	// 		console.log("sessionId: ", sessionId);
	// 		const now = new Date().toISOString();

	// 		await redisClient
	// 		.multi()
	// 		.hSet(`session:${sessionId}`, {
	// 			id: sessionId,
	// 			deviceInfo: req.headers["user-agent"] ?? "unknown",
	// 			ipAddress: ip,
	// 			location: "unknown",
	// 			createdAt: now,
	// 			lastActiveAt: now,
	// 			isCurrent: "true"
	// 		})
	// 		.sAdd(`user:sessions:${user.username}`, sessionId)
	// 		.exec();

	// 		// Access Token (short-lived JWT)
	// 		const accessToken = jwt.sign(
	// 			{
	// 				userId: user.id,
	// 				username: user.username,
	// 				sessionId,
	// 			},
	// 			process.env.SECRET_TOKEN,
	// 			{ expiresIn: ACCESS_TOKEN_TTL }
	// 		);
	// 		console.log("ACCESS TOKEN: ", accessToken);

	// 		// Refresh Token
	// 		// Generate a random salt (64 bytes)
	// 		const refreshToken = crypto.randomBytes(64).toString("hex");
	// 		console.log("REFRESH_TOKEN: ", refreshToken);

	// 		// Store refresh token in Redis
	// 		await redisClient.set(
	// 			`refresh:${refreshToken}`,
	// 			user.id,
	// 			{ EX: REFRESH_TOKEN_TTL }
	// 		);
	// 		const storedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
	// 		// console.log("storedRefreshToken: ", storedRefreshToken);

	// 		const requires2FA = user.has2FAEnabled === "1";

	// 		return reply.code(200).send({
	// 			code: "LOGIN_SUCCESS",
	// 			message: "User successfully logged in",
	// 			accessToken,
	// 			refreshToken,
	// 			tokenType: "Bearer",
	// 			expiresIn : ACCESS_TOKEN_TTL,
	// 			user: {
	// 				id : user.uuid,
	// 				username: user.username,
	// 				displayName: user.displayName,
	// 				email: user.email,
	// 				avatarUrl: user.avatar,
	// 				has2FAEnabled: user.has2FAEnabled,
	// 			},
	// 			requires2FA
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to log in user",
	// 		});
	// 	}
	// }

	// // LOGOUT
	// async logout(req, reply) {
	// 	try {
	// 		const token = req.headers.authorization?.split(" ")[1];
	// 		console.log("LOGOUT TOKEN: ", token);
	// 		if (!token) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_REQUIRED",
	// 				message: "Authentication required",
	// 			});
	// 		}

	// 		let decoded;
	// 		try {
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch (error) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_REQUIRED/INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}

	// 		// Hash token before blacklisting ?
	// 		// const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

	// 		// Add JWT token to blacklist
	// 		await redisClient.set(
	// 			`blacklist:${token}`,
	// 			"1",
	// 			{ EX: JWT_TTL }
	// 		);

	// 		reply.code(204).send({
	// 			code: "LOGOUT_SUCCESS",
	// 			message: "User successfully logged out",
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to log out user",
	// 		});
	// 	}
	// }

	// REFRESH TOKEN
	// async refreshToken(req, reply) {
	// 	const { refreshToken } = req.body;
	// 	console.log("REFRESH TOKEN: ", refreshToken);
	// 	if (!refreshToken) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_REQUEST",
	// 			message: "Refresh token required",
	// 		});
	// 	}

	// 	try {
	// 		// Check if refresh token exists
	// 		const userId = await redisClient.get(`refresh:${refreshToken}`);
	// 		console.log("refreshtoken storedRefreshToken: ", userId);
	// 		if (!userId) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_REFRESH_TOKEN",
	// 				message: "Invalid or expired refresh token",
	// 			});
	// 		}

	// 		await redisClient.del(`refresh:${refreshToken}`);

	// 		const username = await redisClient.get(`userid:${userId}`);
	// 		if (!username) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_REFRESH_TOKEN",
	// 				message: "Invalid refresh token",
	// 			});
	// 		}
	// 		// console.log("REFRESH TOKEN USERNAME: ", username);

	// 		const user = await redisClient.hGetAll(`user:${username}`);

	// 		const newRefreshToken = crypto.randomBytes(64).toString("hex");
	// 		// console.log("NEW REFRESH TOKEN: ", newRefreshToken);

	// 		await redisClient.set(
	// 			`refresh:${newRefreshToken}`,
	// 			userId,
	// 			{ EX: REFRESH_TOKEN_TTL }
	// 		);

	// 		const accessToken = jwt.sign(
	// 			{
	// 				userId,
	// 				username: user.username
	// 			},
	// 			process.env.SECRET_TOKEN,
	// 			{ expiresIn: ACCESS_TOKEN_TTL }
	// 		);
	// 		console.log("ACCES TOKEN: ", accessToken);

	// 		const requires2FA = user.has2FAEnabled === "1";
	// 		console.log("requires2FA: ", requires2FA);

	// 		return reply.code(200).send({
	// 			accessToken,
	// 			refreshToken: newRefreshToken,
	// 			tokenType: "Bearer",
	// 			expiresIn: ACCESS_TOKEN_TTL,
	// 			user: {
	// 				id: user.id,
	// 				username: user.username,
	// 				displayName: user.displayName,
	// 				email: user.email,
	// 				avatarUrl: user.avatarUrl,
	// 				has2FAEnabled: user.has2FAEnabled,
	// 			},
	// 			requires2FA
	// 		});
	// 	} catch (err) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to refresh token",
	// 		});
	// 	}
	// }

	// VERIFY TOKEN
	// async verifyToken(req, reply) {
	// 	try {
	// 		const token = req.headers.authorization?.split(" ")[1];
	// 		console.log("VERIFY TOKEN: ", token);
	// 		if (!token) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_REQUIRED",
	// 				message: "Authentication required",
	// 			});
	// 		}

	// 		let decoded;
	// 		try {
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch (error) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_REQUIRED/INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}
	// 		console.log("DECODED: ", decoded);

	// 		return reply.code(200).send({
	// 			valid: true,
	// 			userId: decoded.userId,
	// 			username: decoded.username,
	// 			issuedAt: new Date(decoded.iat * 1000).toISOString(),
	// 			expiresAt: new Date(decoded.exp * 1000).toISOString(),
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to verify token",
	// 		});
	// 	}
	// }

	// FORGOT PASSWORD
	// async forgotPassword(req, reply) {
	// 	const { email } = req.body;
	// 	console.log("REQ BODY email: ", req.body);
	// 	if (!email) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid request parameters",
	// 		});
	// 	}

	// 	const validation = validateEmail(email);
	// 	if (!validation) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid field",
	// 		});
	// 	}
	// 	const ip = req.ip;

	// 	try {
	// 		// Rate limit check
	// 		const rlKey = `login:rl:${email}:${ip}`;
	// 		console.log("rlKey: ", rlKey);
	// 		const attempts = await redisClient.incr(rlKey);
	// 		if (attempts === 1) {
	// 			await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
	// 		}
	// 		// console.log("attempts: ", attempts);
	// 		if (attempts > MAX_LOGIN_ATTEMPTS) {
	// 			return reply.code(429).send({
	// 				code: "TOO_MANY_ATTEMPTS",
	// 				message: "Too many login attempts. Try again in five minutes."
	// 			});
	// 		}

	// 		// Return 202 to avoid revealing whether the email exists
	// 		const username = await redisClient.get(`email:${email}`);
	// 		if (!username) {
	// 			return reply.code(202).send({
	// 				code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
	// 				message: "If an account exists for this email address, a password reset link has been sent.",
	// 			});
	// 		}

	// 		// Reset rate limite on success
	// 		await redisClient.del(rlKey);

	// 		return reply.code(202).send({
	// 			code: "PASSWORD_RESET_EMAIL_SENT_SUCCESS",
	// 			message: "Password reset email sent",
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to log in user",
	// 		});
	// 	}
	// }

	// RESET PASSWORD
	// async resetPassword(req, reply) {
	// 	const { token, password } = req.body;
	// 	console.log("REQ BODY:", req.body);

	// 	const validation = validatePassword(password);
	// 	if (!validation) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid fields",
	// 		});
	// 	}

	// 	try {
	// 		// Look up user by token
	// 		const userId = await redisClient.get(`resetToken:${token}`);
	// 		console.log("userId: ", userId);
	// 		if (!userId) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired reset token",
	// 			});
	// 		}
	// 		const username = await redisClient.get(`userid:${userId}`);
	// 		console.log("username: ", username);
	// 		if (!username) {
	// 			return reply.code(401).send({
	// 				code: "USER_NOT_FOUND",
	// 				message: "User does not exist",
	// 			});
	// 		}

	// 		const userKey = `user:${username}`;
	// 		const user = await redisClient.hGetAll(userKey);
	// 		if (!user || !user.hashedPassword) {
	// 			return reply.code(401).send({
	// 				code: "USER_NOT_FOUND",
	// 				message: "User does not exist",
	// 			});
	// 		}
	// 		// Hash new password
	// 		const hashedPassword = await bcrypt.hash(password, 10);
	// 		// console.log("hasedPassword: ", hashedPassword);

	// 		// Update user
	// 		await redisClient.hSet(userKey, {...user, hashedPassword,});

	// 		// const userUpdated = await redisClient.hGetAll(userKey);
	// 		// console.log("userUpdated: ", userUpdated);

	// 		// Delete token
	// 		await redisClient.del(`resetToken:${token}`);

	// 		return reply.code(200).send({
	// 			code: "PASSWORD_RESET_SUCCESS",
	// 			message: "Password successfully reset",
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to reset password",
	// 		});
	// 	}
	// }

	// CHANGE PASSWORD
	// async changePassword(req, reply) {
	// 	const { currentPassword, newPassword } = req.body;
	// 	console.log("REQ BODY:", req.body);

	// 	if (!validatePassword(newPassword)) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid fields",
	// 		});
	// 	}
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
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}
	// 		const username = decoded.username;
	// 		const userKey = `user:${username}`;
	// 		const user = await redisClient.hGetAll(userKey);
	// 		if (!user || !user.hashedPassword) {
	// 			return reply.code(401).send({
	// 				code: "USER_NOT_FOUND",
	// 				message: "User does not exist",
	// 			});
	// 		}
	// 		console.log("CURRENT PASSWORD: ", currentPassword);
	// 		console.log("DB PASSWORD: ", user.hashedPassword);
	// 		// Verify current password
	// 		const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
	// 		if (!isValid) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_CREDENTIALS",
	// 				message: "Current password is incorrect",
	// 			});
	// 		}
	// 		// Prevent same password reuse
	// 		const isSame = await bcrypt.compare(newPassword, user.hashedPassword);
	// 		if (isSame) {
	// 			return reply.code(400).send({
	// 			code: "PASSWORD_UNCHANGED",
	// 			message: "New password must be different from current password",
	// 			});
	// 		}
	// 		// Hash new password
	// 		const hashedPassword = await bcrypt.hash(newPassword, 10);
	// 		// Update user
	// 		await redisClient.hSet(userKey, {
	// 			...user,
	// 			hashedPassword,
	// 		});
	// 		return reply.code(200).send({
	// 			code: "PASSWORD_CHANGE_SUCCESS",
	// 			message: "Password successfully changed",
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to change password",
	// 		});
	// 	}
	// }

	// Operation: initiateOAuth
	// URL: /auth/oauth/:provider
	// summary:	Initiate OAuth login
	// req.params
	//   type: object
	//   properties:
	//     provider:
	//       type: string
	//       enum:
	//         - google
	//         - github
	//         - fortytwo
	//       description: OAuth provider name
	//   required:
	//     - provider
	//
	// req.query
	//   type: object
	//   properties:
	//     redirect_uri:
	//       type: string
	//       format: uri
	//       description: URL to redirect after authentication
	//
	// valid responses
	//   '302':
	//     description: Redirect to OAuth provider
	//     headers:
	//       Location:
	//         description: OAuth provider authorization URL
	//         schema:
	//           type: string
	//           format: uri
	//   '400':
	//     description: Invalid request parameters
	//     content:
	//       application/json:
	//         schema: &ref_0
	//           type: object
	//           required:
	//             - code
	//             - message
	//           properties:
	//             code:
	//               type: string
	//               description: Error code for client handling
	//             message:
	//               type: string
	//               description: Human-readable error message
	//             details:
	//               type: object
	//               additionalProperties: true
	//               description: Additional error details
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async initiateOAuth(req, reply) {
	// 	const { provider } = req.params;
	// 	const redirectUri = req.query.redirect_uri || "https://example.com/callback";

	// 	console.log("initiateOAuth", provider, redirectUri);

	// 	const oauthUrl = `https://oauth.example.com/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
	// 	return reply.redirect(oauthUrl);
	// }

	// Operation: oauthCallback
	// URL: /auth/oauth/:provider/callback
	// summary:	OAuth callback
	// req.params
	//   type: object
	//   properties:
	//     provider:
	//       type: string
	//       enum:
	//         - google
	//         - github
	//         - fortytwo
	//       description: OAuth provider name
	//   required:
	//     - provider
	//
	// req.query
	//   type: object
	//   properties:
	//     code:
	//       type: string
	//       description: Authorization code from OAuth provider
	//     state:
	//       type: string
	//       description: State parameter for CSRF protection
	//   required:
	//     - code
	//     - state
	//
	// valid responses
	//   '302':
	//     description: Redirect to application with tokens
	//     headers:
	//       Location:
	//         description: Application URL with auth tokens
	//         schema:
	//           type: string
	//           format: uri
	//   '400':
	//     description: Invalid request parameters
	//     content:
	//       application/json:
	//         schema: &ref_0
	//           type: object
	//           required:
	//             - code
	//             - message
	//           properties:
	//             code:
	//               type: string
	//               description: Error code for client handling
	//             message:
	//               type: string
	//               description: Human-readable error message
	//             details:
	//               type: object
	//               additionalProperties: true
	//               description: Additional error details
	//   '401':
	//     description: OAuth authentication failed
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async oauthCallback(req, reply) {
	// 	const { provider } = req.params;
	// 	const { code, state } = req.query;

	// 	console.log("oauthCallback", provider, code, state);

	// 	const redirectUrl = `https://myapp.example.com/auth/success?accessToken=mock-access-token&refreshToken=mock-refresh-token`;
	// 	return reply.redirect(redirectUrl);
	// }

	// ENABLE2FA
	// async enable2FA(req, reply) {
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
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}

	// 		const username = decoded.username;
	// 		const userKey = `user:${username}`;
	// 		const user = await redisClient.hGetAll(userKey);
	// 		if (!user) {
	// 			return reply.code(401).send({
	// 				code: "USER_NOT_FOUND",
	// 				message: "User does not exist",
	// 			});
	// 		}

	// 		console.log("has2FAEnabled: ", user.has2FAEnabled);
	// 		const has2FAEnabled = user.has2FAEnabled === "true";
	// 		if (has2FAEnabled) {
	// 			return reply.code(409).send({
	// 				code: "2FA_ALREADY_ENABLED",
	// 				message: "2FA already enabled",
	// 			});
	// 		}

	// 		// Generate TOTP secret
	// 		const secret = speakeasy.generateSecret({ name: "Transcendence" });
	// 		console.log("secret: ", secret);

	// 		// Generate QR code
	// 		const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
	// 		console.log("qrcode: ", qrCodeUrl);


	// 		// Generate and hashed backup codes
	// 		const { codes, backupCodes } = generateBackupCodes();
	// 		console.log("codes: ", codes);

	// 		// Store 2FA data
	// 		await redisClient.hSet(userKey, {
	// 			twoFASecret: secret.base32,
	// 			twoFABackupCodes: JSON.stringify(backupCodes),
	// 			has2FAEnabled: "false",
	// 		});

	// 		return reply.code(200).send({
	// 			secret: secret.base32,
	// 			qrCodeUrl,
	// 			backupCodes,
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to enable 2FA",
	// 		});
	// 	}
	// }

	// VERIFY 2FA
	// async verify2FA(req, reply) {
	// 	const { code } = req.body;
	// 	console.log("code: ", code);

	// 	// const validation = validate2FACode(code);
	// 	// if (!validation) {
	// 	// 	return reply.code(401).send({
	// 	// 		code: "INVALID_CREDENTIALS",
	// 	// 		message: "Invalid 2FA code",
	// 	// 	});
	// 	// }
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
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}

	// 		const username = decoded.username;
	// 		console.log("username: ", username);
	// 		const userKey = `user:${username}`;
	// 		console.log("userKey: ", userKey);
	// 		const user = await redisClient.hGetAll(userKey);
	// 		console.log("user:" ,user);
	// 		if (!user || !user.twoFASecret) {
	// 			return reply.code(401).send({
	// 				code: "UNAUTHORIZED",
	// 				message: "Invalid token",
	// 			});
	// 		}

	// 		// Verify TOTP
	// 		const verified = speakeasy.totp.verify({
	// 			secret: user.twoFASecret,
	// 			encoding: "base32",
	// 			token: code,
	// 			window: 1,
	// 		});
	// 		console.log("verified: ", verified);
	// 		if (!verified) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_2FA_CODE",
	// 				message: "Invalid 2FA code",
	// 		  });
	// 		}

	// 		await redisClient.hSet(userKey, "has2FAEnabled", "1");

	// 		// Access Token (short-lived JWT)
	// 		const accessToken = jwt.sign(
	// 			{
	// 				userId: user.id,
	// 				username: user.username,
	// 			},
	// 			process.env.SECRET_TOKEN,
	// 			{ expiresIn: ACCESS_TOKEN_TTL }
	// 		);
	// 		// console.log("ACCESS TOKEN: ", accessToken);

	// 		// Refresh Token
	// 		// Generate a random salt (64 bytes)
	// 		const refreshToken = crypto.randomBytes(64).toString("hex");
	// 		// console.log("REFRESH_TOKEN: ", refreshToken);

	// 		// Store refresh token in Redis
	// 		await redisClient.set(
	// 			`refresh:${refreshToken}`,
	// 			user.id,
	// 			{ EX: REFRESH_TOKEN_TTL }
	// 		);
	// 		const storedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
	// 		// console.log("storedRefreshToken: ", storedRefreshToken);

	// 		return reply.code(200).send({
	// 			accessToken,
	// 			refreshToken,
	// 			tokenType: "Bearer",
	// 			expiresIn : ACCESS_TOKEN_TTL,
	// 			user: {
	// 				id : user.uuid,
	// 				username: user.username,
	// 				displayName: user.displayName,
	// 				email: user.email,
	// 				avatarUrl: user.avatar,
	// 				has2FAEnabled: "1",
	// 			},
	// 			requires2FA: "false",
	// 		});
	// 	} catch (error) {
	// 		console.log("error: ", error);
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to verify 2FA",
	// 		});
	// 	}
	// }

	// DISABLE 2FA
	// async disable2FA(req, reply) {
	// 	const { code, password } = req.body;
	// 	console.log("code: ", code);
	// 	console.log("password: ", password);

	// 	if (!validate2FACode(code) || !validatePassword(password)) {
	// 		return reply.code(400).send({
	// 			code: "INVALID_CREDENTIALS",
	// 			message: "Invalid fields",
	// 		});
	// 	}
	// 	try {
	// 		const token = req.headers.authorization.split(" ")[1];
	// 		if (!token) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_REQUIRED",
	// 				message: "Authentication required",
	// 			});
	// 		}

	// 		let decoded;
	// 		try {
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}

	// 		const username = decoded.username;
	// 		console.log("username: ", username);
	// 		const userKey = `user:${username}`;
	// 		console.log("userKey: ", userKey);
	// 		const user = await redisClient.hGetAll(userKey);
	// 		console.log("user:" ,user);
	// 		if (!user || !user.hashedPassword || user.has2FAEnabled !== "1" || !user.twoFASecret) {
	// 			return reply.code(401).send({
	// 				code: "AUTH_FAILED",
	// 				message: "Authentication failed",
	// 			});
	// 		}
	// 		// Verify password
	// 		const isValid = await bcrypt.compare(password, user.hashedPassword);
	// 		if (!isValid) {
	// 			return reply.code(401).send({
	// 				code: "INVALID_CREDENTIALS",
	// 				message: "Password is incorrect",
	// 			});
	// 		}

	// 		// Verify TOTP
	// 		const verified = speakeasy.totp.verify({
	// 			secret: user.twoFASecret,
	// 			encoding: "base32",
	// 			token: code,
	// 			window: 1,
	// 		});
	// 		console.log("verified: ", verified);
	// 		if (!verified) {
	// 			return reply.code(400).send({
	// 				code: "INVALID_2FA_CODE",
	// 				message: "Invalid 2FA code",
	// 		  });
	// 		}

	// 		await redisClient.hDel(userKey, "twoFASecret");
	// 		await redisClient.hDel(userKey, "twoFABackupCodes");
	// 		await redisClient.hSet(userKey, "has2FAEnabled", "0");

	// 		return reply.code(200).send({
	// 			code: "2FA_DISABLED_SUCCESS",
	// 			message: "2FA successfully disabled",
	// 		});
	// 	} catch (error) {
	// 		console.log("error: ", error);
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Unable to disable 2FA",
	// 		});
	// 	}
	// }

	// LIST SESSIONS
	// async listSessions(req, reply) {
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
	// 			decoded = jwt.verify(token, process.env.SECRET_TOKEN);
	// 		} catch {
	// 			return reply.code(401).send({
	// 				code: "INVALID_TOKEN",
	// 				message: "Invalid or expired token",
	// 			});
	// 		}

	// 		const { username, sessionId: currentSessionId } = decoded;
	// 		console.log("decoded: ", decoded);
	// 		// Retrieve all sessions for the current user
	// 		const sessionIds = await redisClient.sMembers(`user:sessions:${username}`);
	// 		console.log("sessionIds: ", sessionIds);

	// 		const sessions = await Promise.all(
	// 			sessionIds.map(async (id) => {
	// 				try {
	// 					const data = await redisClient.hGetAll(`session:${id}`);
	// 					console.log("data:", data);

	// 					if (!data || Object.keys(data).length === 0) {
	// 						return null;
	// 					}

	// 					return {
	// 						id,
	// 						deviceInfo: data.deviceInfo,
	// 						ipAddress: data.ipAddress,
	// 						location: data.location,
	// 						createdAt: data.createdAt,
	// 						lastActiveAt: data.lastActiveAt,
	// 						isCurrent: id === currentSessionId,
	// 					};
	// 				} catch (error) {
	// 					console.error(`Erreur pour la session ${id}:`, error);
	// 					return null;
	// 				}
	// 			})
	// 		);
	// 		console.log("sessions: ", sessions);
	// 		return reply.code(200).send({
	// 			sessions
	// 		});
	// 	} catch (error) {
	// 		return reply.code(500).send({
	// 			code: "INTERNAL_ERROR",
	// 			message: "Internal server error",
	// 		});
	// 	}
	// }

	// REVOKE SESSION
	async revokeSession(req, reply) {
		try {
			const token = req.headers.authorization.split(" ")[1];
			if (!token) {
				return reply.code(401).send({
					code: "AUTH_REQUIRED",
					message: "Authentication required",
				});
			}

			let decoded;
			try {
				decoded = jwt.verify(token, process.env.SECRET_TOKEN);
			} catch {
				return reply.code(401).send({
					code: "INVALID_TOKEN",
					message: "Invalid or expired token",
				});
			}
			const { username } = decoded;
			if (!username) {
				return reply.code(401).send({
					code: "INVALID_TOKEN",
					message: "Token invalid",
			  });
			}
			const { sessionId } = req.params;
			// const sessionId = "49756f1a-e9be-45ae-81e6-094f8d1e0408";
			if (!sessionId) {
				return reply.code(400).send({
					code: "INVALID_REQUEST_PARAMETERS",
					message: "Session ID is required",
				});
			}
			// Check if the session exists
			const sessionKey = `session:${sessionId}`;
			const session = await redisClient.hGetAll(sessionKey);
			console.log("session: ", session);
			if (!session || Object.keys(session).length === 0){
				return reply.code(404).send({
					code: "SESSION_NOT_FOUND",
					message: "Ressource not found",
				});
			}

			// Check if the session belongs to the user
			const userSessionsKey = `user:sessions:${username}`;
			const belongsToUser = await redisClient.sIsMember(
				userSessionsKey,
				sessionId
			);
			if (!belongsToUser) {
				return reply.code(404).send({
					code: "SESSION_NOT_FOUND",
					message: "Resource not found",
				});
			}

			// Delete the session
			await redisClient
				.multi()
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

	// Operation: revokeAllSessions
	// URL: /auth/sessions/revoke-all
	// summary:	Revoke all sessions
	// valid responses
	//   '200':
	//     description: All other sessions revoked
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             revokedCount:
	//               type: integer
	//               description: Number of sessions revoked
	//   '401':
	//     description: Authentication required or token invalid
	//     content:
	//       application/json:
	//         schema: &ref_0
	//           type: object
	//           required:
	//             - code
	//             - message
	//           properties:
	//             code:
	//               type: string
	//               description: Error code for client handling
	//             message:
	//               type: string
	//               description: Human-readable error message
	//             details:
	//               type: object
	//               additionalProperties: true
	//               description: Additional error details
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async revokeAllSessions(req, reply) {
	// 	console.log("revokeAllSessions", req.params);
	// 	const revokedCount = 5;
	// 	reply.code(200).send({ revokedCount });
	// }
}
