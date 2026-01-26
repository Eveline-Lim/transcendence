// implementation of the operations in the openapi specification
import { redisClient } from "./redisClient.js";
import { validateInputs } from "./utils/validators.js";
import bcrypt from "bcrypt";
import crypto from 'node:crypto';
import jwt from "jsonwebtoken";

const MAX_LOGIN_ATTEMPTS = 5; // per 15 minutes
const RATE_LIMIT_WINDOW_SECONDS = 5 * 60;
const ACCESS_TOKEN = 60 * 24; // 24h
const REFRESH_TOKEN = 60 * 60 * 24; // 24h in seconds
const JWT_TTL_SECONDS = 60 * 60; // 1h for logout token blacklist

export class Service {
	// REGISTER
	async register(req, reply) {
		const { username, displayName, password, email, avatarUrl, has2FAEnabled } = req.body;
		// console.log("BODY: ", req.body);

		const validation = validateInputs({ username, email, password }, false);
		if (!validation.success) {
			return reply.code(400).send({
				code: "INVALID_CREDENTIALS",
				message: "Invalid fields",
			});
		}

		try {
			const userKey = `user:${username}`;
			// console.log("userKey: ", userKey);
			const emailKey = `email:${email}`;
			// console.log("emailKey: ", emailKey);

			// Check username uniqueness
			const existingUser = await redisClient.exists(userKey);
			if (existingUser) {
				return reply.code(409).send({
					code: "USER_ALREADY_EXISTS",
					message: "Username already exists",
				});
			}

			// Check email uniqueness
			const existingEmail = await redisClient.exists(emailKey);
			if (existingEmail) {
				return reply.code(409).send({
					code: "EMAIL_ALREADY_EXISTS",
					message: "Email already exists",
				});
			}

			const hashedPassword = await bcrypt.hash(password, 10);
			// console.log("hashedPassword: ", hashedPassword);

			const uuid = crypto.randomUUID();
			console.log(uuid);

			// Save user
			await redisClient.hSet(userKey, {
				uuid,
				username,
				displayName,
				hashedPassword,
				email,
				avatarUrl,
				has2FAEnabled: has2FAEnabled.toString()
			});

			await redisClient.set(emailKey, username);

			return reply.code(201).send({
				code: "USER_CREATED",
				message: "User successfully registered",
			});

		} catch (error) {
			return reply.code(500).send({
				code: "INTERNAL_ERROR",
				message: "Unable to register user",
			});
		}
	}

	// LOGIN
	async login(req, reply) {
		const { identifier, password } = req.body;
		// console.log("REQ BODY: ", req.body);
		const ip = req.ip; // For rate limiting per IP
		// console.log("IP: ", ip);

		const validation = validateInputs({ identifier, password }, true);
		if (!validation.success) {
			return reply.code(400).send({
				code: "INVALID REQUEST PARAMETERS",
				message: "Invalid fields",
			});
		}

		try {
			// Rate limit check
			const rlKey = `login:rl:${identifier}:${ip}`;
			console.log("rlKey: ", rlKey);
			const attempts = await redisClient.incr(rlKey);
			if (attempts === 1) {
				await redisClient.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS);
			}
			// console.log("attempts: ", attempts);
			if (attempts > MAX_LOGIN_ATTEMPTS) {
				return reply.code(429).send({
					code: "TOO_MANY_ATTEMPTS",
					message: "Too many login attempts. Try again in five minutes."
				});
			}

			let username;

			if (identifier.includes("@")) {
				username = await redisClient.get(`email:${identifier}`);
				if (!username) {
					return reply.code(401).send({
						code: "INVALID_CREDENTIALS",
						message: "Invalid username/email or password",
					});
				}
			} else {
				username = identifier;
			}

			const userKey = `user:${username}`;
			console.log("userKey: ", userKey);

			const existingUser = await redisClient.exists(userKey);
			if (!existingUser) {
				return reply.code(401).send({
					code: "INVALID_CREDENTIALS",
					message: "Invalid username/email or password",
				});
			}
			// Retrieve all user fields from Redis by username or email key.
			const user = await redisClient.hGetAll(userKey);

			// If the user exists, we compare the entered password with the stored hashed password.
			const isMatch = await bcrypt.compare(password, user.hashedPassword);
			if (!isMatch) {
				return reply.code(401).send({
					code: "INVALID_CREDENTIALS",
					message: "Invalid username or password",
				});
			}

			// Reset rate limite on success
			await redisClient.del(rlKey);

			// Access Token (short-lived JWT)
			const accessToken = jwt.sign(
				{
					userId: user.uuid,
					username: user.username,
				},
				// process.env.ACCESS_TOKEN_SECRET,
				"RANDOM_ACCESS_TOKEN",
				{ expiresIn: '24h' }
			);
			console.log("ACCESS TOKEN: ", accessToken);

			// Refresh Token
			// Generate a random salt (64 bytes)
			const refreshToken = crypto.randomBytes(64).toString("hex");

			// Store refresh token in Redis
			await redisClient.set(
				`refresh:${refreshToken}`,
				user.uuid,
				{ EX: REFRESH_TOKEN }
			);
			console.log("REFRESH TOKEN: ", refreshToken);

			const requires2FA = user.has2FAEnabled === "1";

			return reply.code(200).send({
				code: "LOGIN_SUCCESS",
				message: "User successfully logged in",
				accessToken,
				refreshToken,
				tokenType: "Bearer",
				expiresIn : 900, // 15 minutes in seconds
				user: {
					id : user.uuid,
					username: user.username,
					displayName: user.displayName,
					email: user.email,
					avatarUrl: user.avatar,
					has2FAEnabled: user.has2FAEnabled,
				},
				requires2FA
			});
		} catch (error) {
			return reply.code(500).send({
				code: "INTERNAL_ERROR",
				message: "Unable to log in user",
			});
		}
	}

	// LOGOUT
	async logout(req, reply) {
		try {
			const token = req.headers.authorization?.split(" ")[1];
			console.log("LOGOUT TOKEN: ", token);
			if (!token) {
				return reply.code(401).send({
					code: "AUTH_REQUIRED",
					message: "Authentication required",
				});
			}

			let decoded;
			try {
				decoded = jwt.verify(token, "RANDOM_ACCESS_TOKEN");
			} catch (error) {
				return reply.code(401).send({
					code: "AUTH_REQUIRED/INVALID_TOKEN",
					message: "Invalid or expired token",
				});
			}

			// Hash token before blacklisting ?
			// const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

			// Add JWT token to blacklist
			await redisClient.set(
				`blacklist:${token}`,
				"1",
				{ EX: JWT_TTL_SECONDS }
			);

			reply.code(204).send({
				code: "LOGOUT_SUCCESS",
				message: "User successfully logged out",
			});
		} catch (error) {
			return reply.code(500).send({
				code: "INTERNAL_ERROR",
				message: "Unable to log out user",
			});
		}
	}

	// Operation: refreshToken
	// URL: /auth/refresh
	// summary:	Refresh access token
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - refreshToken
	//         properties:
	//           refreshToken:
	//             type: string
	//
	// valid responses
	//   '200':
	//     description: Token refreshed successfully
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             accessToken:
	//               type: string
	//               description: JWT access token
	//             refreshToken:
	//               type: string
	//               description: Refresh token for obtaining new access tokens
	//             tokenType:
	//               type: string
	//               default: Bearer
	//             expiresIn:
	//               type: integer
	//               description: Access token expiration time in seconds
	//             user:
	//               type: object
	//               properties:
	//                 id:
	//                   type: string
	//                   format: uuid
	//                 email:
	//                   type: string
	//                   format: email
	//                 username:
	//                   type: string
	//                 displayName:
	//                   type: string
	//                 avatarUrl:
	//                   type: string
	//                   format: uri
	//                 has2FAEnabled:
	//                   type: boolean
	//             requires2FA:
	//               type: boolean
	//               description: Whether 2FA verification is required to complete login
	//   '401':
	//     description: Invalid or expired refresh token
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

	// async refreshToken(req, reply) {
	// 	console.log("refreshToken", req.params);
	// 	reply.code(200);
	// 	return {
	// 		accessToken: "mock-access-token",
	// 		refreshToken: "mock-refresh-token",
	// 		tokenType: "Bearer",
	// 		expiresIn: 3600,
	// 		requires2FA: false,
	// 		user: {
	// 			id: "00000000-0000-0000-0000-000000000000",
	// 			email: req.body.email,
	// 			username: req.body.username,
	// 			displayName: req.body.displayName,
	// 			avatarUrl: null,
	// 			has2FAEnabled: false
	// 		}
	// 	};
	// }

	// Operation: verifyToken
	// URL: /auth/verify
	// summary:	Verify access token
	// valid responses
	//   '200':
	//     description: Token is valid
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             valid:
	//               type: boolean
	//             userId:
	//               type: string
	//               format: uuid
	//             username:
	//               type: string
	//             expiresAt:
	//               type: string
	//               format: date-time
	//             issuedAt:
	//               type: string
	//               format: date-time
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

	// async verifyToken(req, reply) {
	// 	reply.code(200);
	// 	return {
	// 		valid: true,
	// 		userId: "00000000-0000-0000-0000-000000000000",
	// 		username: "testuser",
	// 		issuedAt: new Date().toISOString(),
	// 		expiresAt: new Date(Date.now() + 3600_000).toISOString(),
	// 	};
	// }

	// Operation: forgotPassword
	// URL: /auth/password/forgot
	// summary:	Request password reset
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - email
	//         properties:
	//           email:
	//             type: string
	//             format: email
	//
	// valid responses
	//   '202':
	//     description: Password reset email sent (if account exists)
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
	//   '429':
	//     description: Too many requests
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async forgotPassword(req, reply) {
	// 	reply.code(202).send();
	// }

	// Operation: resetPassword
	// URL: /auth/password/reset
	// summary:	Reset password
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - token
	//           - password
	//         properties:
	//           token:
	//             type: string
	//             description: Password reset token from email
	//           password:
	//             type: string
	//             minLength: 8
	//             maxLength: 128
	//
	// valid responses
	//   '200':
	//     description: Password reset successful
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
	//     description: Invalid or expired reset token
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async resetPassword(req, reply) {
	// 	reply.code(200).send();
	// }

	// Operation: changePassword
	// URL: /auth/password/change
	// summary:	Change password
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - currentPassword
	//           - newPassword
	//         properties:
	//           currentPassword:
	//             type: string
	//           newPassword:
	//             type: string
	//             minLength: 8
	//             maxLength: 128
	//
	// valid responses
	//   '200':
	//     description: Password changed successfully
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
	//     description: Authentication required or token invalid
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0

	// async changePassword(req, reply) {
	// 	reply.code(200).send();
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

	// Operation: enable2FA
	// URL: /auth/2fa/enable
	// summary:	Enable 2FA
	// valid responses
	//   '200':
	//     description: 2FA setup initiated
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             secret:
	//               type: string
	//               description: TOTP secret key
	//             qrCodeUrl:
	//               type: string
	//               format: uri
	//               description: URL to QR code image for authenticator app
	//             backupCodes:
	//               type: array
	//               items:
	//                 type: string
	//               description: One-time backup codes
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
	//   '409':
	//     description: 2FA already enabled
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async enable2FA(req, reply) {
	// 	console.log("enable2FA", req.params);
	// 	reply.code(200);
	// 	return {
	// 		secret: "MOCKTOTPSECRET",
	// 		qrCodeUrl: "https://example.com/qr.png",
	// 		 backupCodes: [
	// 			"BACKUP1",
	// 			"BACKUP2",
	// 			"BACKUP3"
	// 		]
	// 	};
	// }

	// Operation: verify2FA
	// URL: /auth/2fa/verify
	// summary:	Verify 2FA code
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - code
	//         properties:
	//           code:
	//             type: string
	//             pattern: ^[0-9]{6}$
	//             description: 6-digit TOTP code
	//
	// valid responses
	//   '200':
	//     description: 2FA verified successfully
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             accessToken:
	//               type: string
	//               description: JWT access token
	//             refreshToken:
	//               type: string
	//               description: Refresh token for obtaining new access tokens
	//             tokenType:
	//               type: string
	//               default: Bearer
	//             expiresIn:
	//               type: integer
	//               description: Access token expiration time in seconds
	//             user:
	//               type: object
	//               properties:
	//                 id:
	//                   type: string
	//                   format: uuid
	//                 email:
	//                   type: string
	//                   format: email
	//                 username:
	//                   type: string
	//                 displayName:
	//                   type: string
	//                 avatarUrl:
	//                   type: string
	//                   format: uri
	//                 has2FAEnabled:
	//                   type: boolean
	//             requires2FA:
	//               type: boolean
	//               description: Whether 2FA verification is required to complete login
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
	//     description: Invalid 2FA code
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async verify2FA(req, reply) {
	// 	console.log("verify2FA", req.params);
	// 	reply.code(200);
	// 	return {
	// 		accessToken: "mock-access-token",
	// 		refreshToken: "mock-refresh-token",
	// 		tokenType: "Bearer",
	// 		expiresIn: 3600,
	// 		requires2FA: false,
	// 		user: {
	// 			id: "00000000-0000-0000-0000-000000000000",
	// 			email: req.body.email,
	// 			username: req.body.username,
	// 			displayName: req.body.displayName,
	// 			avatarUrl: null,
	// 			has2FAEnabled: false
	// 		}
	// 	};
	// }

	// Operation: disable2FA
	// URL: /auth/2fa/disable
	// summary:	Disable 2FA
	// req.body
	//   content:
	//     application/json:
	//       schema:
	//         type: object
	//         required:
	//           - code
	//           - password
	//         properties:
	//           code:
	//             type: string
	//             pattern: ^[0-9]{6}$
	//             description: Current 6-digit TOTP code
	//           password:
	//             type: string
	//             description: Current password for confirmation
	//
	// valid responses
	//   '200':
	//     description: 2FA disabled successfully
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
	//     description: Authentication required or token invalid
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async disable2FA(req, reply) {
	// 	console.log("disable2FA", req.params);
	// 	reply.code(200).send();
	// }

	// Operation: listSessions
	// URL: /auth/sessions
	// summary:	List active sessions
	// valid responses
	//   '200':
	//     description: List of active sessions
	//     content:
	//       application/json:
	//         schema:
	//           type: object
	//           properties:
	//             sessions:
	//               type: array
	//               items:
	//                 type: object
	//                 properties:
	//                   id:
	//                     type: string
	//                     format: uuid
	//                   deviceInfo:
	//                     type: string
	//                     description: Browser/device information
	//                   ipAddress:
	//                     type: string
	//                   location:
	//                     type: string
	//                     description: Approximate geographic location
	//                   createdAt:
	//                     type: string
	//                     format: date-time
	//                   lastActiveAt:
	//                     type: string
	//                     format: date-time
	//                   isCurrent:
	//                     type: boolean
	//                     description: Whether this is the current session
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

	// async listSessions(req, reply) {
	// 	console.log("listSessions", req.params);
	// 	reply.code(200).send({
	// 		sessions: [
	// 			{
	// 				id: "00000000-0000-0000-0000-000000000000",
	// 				deviceInfo: "Chrome on Windows 10",
	// 				ipAddress: "127.0.0.1",
	// 				location: "Localhost",
	// 				createdAt: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
	// 				lastActiveAt: new Date().toISOString(),
	// 				isCurrent: true
	// 			},
	// 			{
	// 				id: "11111111-1111-1111-1111-111111111111",
	// 				deviceInfo: "Firefox on macOS",
	// 				ipAddress: "192.168.0.10",
	// 				location: "Home",
	// 				createdAt: new Date(Date.now() - 7200_000).toISOString(), // 2 hours ago
	// 				lastActiveAt: new Date(Date.now() - 1800_000).toISOString(), // 30 min ago
	// 				isCurrent: false
	// 			}
	// 		]
	// 	});
	// }

	// Operation: revokeSession
	// URL: /auth/sessions/:sessionId
	// summary:	Revoke session
	// req.params
	//   type: object
	//   properties:
	//     sessionId:
	//       type: string
	//       format: uuid
	//   required:
	//     - sessionId
	//
	// valid responses
	//   '204':
	//     description: Session revoked successfully
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
	//   '404':
	//     description: Resource not found
	//     content:
	//       application/json:
	//         schema: *ref_0
	//   '500':
	//     description: Internal server error
	//     content:
	//       application/json:
	//         schema: *ref_0
	//

	// async revokeSession(req, reply) {
	// 	console.log("revokeSession", req.params);
	// 	reply.code(204).send();
	// }

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
