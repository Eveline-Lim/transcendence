import { signup, login, logout } from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";
import { forgotPassword, resetPassword } from "../controllers/password.js";
import { changePassword } from "../controllers/changePassword.js";
import { refreshToken } from "../controllers/refresh.js";
import { disable2FA, enableTwoFA, verifyTwoFA } from "../controllers/twofa.js";
import { initiateOauth, oauthCallback } from "../controllers/oauth.js";
import { verifyToken } from "../controllers/token.js";
import { listSessions, revokeSession, revokeAllSessions } from "../controllers/session.js";
import { acceptPrivacyPolicy } from "../controllers/privacyPolicy.js";
import { acceptTermsOfService } from "../controllers/termsOfService.js";

export default async function authRoutes(fastify) {
	// Auth
	fastify.post("/register", signup);
	fastify.post("/login", login);
	fastify.post("/logout", { preHandler: authenticate }, logout);

	// Token
	fastify.get("/verify", { preHandler: authenticate }, verifyToken);
	fastify.post("/refresh", refreshToken);

	// Password
	fastify.post("/password/forgot", forgotPassword);
	fastify.post("/password/reset", resetPassword);
	fastify.post("/password/change", { preHandler: authenticate }, changePassword);

	// 2FA
	fastify.post("/2fa/enable", { preHandler: authenticate }, enableTwoFA);
	fastify.post("/2fa/verify", { preHandler: authenticate }, verifyTwoFA);
	fastify.post("/2fa/disable", { preHandler: authenticate }, disable2FA);

	// Session
	fastify.get("/sessions", { preHandler: authenticate }, listSessions);
	fastify.delete("/sessions/:sessionId", { preHandler: authenticate }, revokeSession);
	fastify.post("/sessions/revoke-all", { preHandler: authenticate }, revokeAllSessions);

	// OAuth
	fastify.get("/oauth/:provider", initiateOauth);
	fastify.get("/oauth/:provider/callback", oauthCallback);

	// Privacy Policy and Terms of Service
	fastify.post("/accept/privacy-policy", { preHandler: authenticate }, acceptPrivacyPolicy);
	fastify.post("/accept/terms-service", { preHandler: authenticate }, acceptTermsOfService);
}
