import { signup, login, logout } from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";
import { forgotPassword, resetPassword } from "../controllers/password.js";
import { changePassword } from "../controllers/changePassword.js";
import { refreshToken } from "../controllers/refresh.js";
import { disable2FA, enableTwoFA, verifyTwoFA } from "../controllers/twofa.js";
import { initiateOauth, oauthCallback } from "../controllers/oauth.js";
import { verifyToken } from "../controllers/token.js";
import { listSessions, revokeSession, revokeAllSessions } from "../controllers/session.js";

export default async function authRoutes(fastify) {
	// Auth
	fastify.post("/register", signup);
	fastify.post("/login", login);
	fastify.post("/logout", logout);

	// Token
	fastify.get("/verify", { preHandler: authenticate }, verifyToken);
	fastify.post("/refresh", refreshToken);

	// Password
	fastify.post("/password/forgot", forgotPassword);
	fastify.post("/password/reset", resetPassword);
	fastify.post("/password/change", changePassword);

	// 2FA
	fastify.post("/2fa/enable", enableTwoFA);
	fastify.post("/2fa/verify", verifyTwoFA);
	fastify.post("/2fa/disable", disable2FA);

	// Session
	fastify.get("/sessions", listSessions);
	fastify.delete("/sessions/:sessionId", revokeSession);
	fastify.post("/sessions/revoke-all", revokeAllSessions);

	// OAuth
	fastify.get("/oauth/:provider", initiateOauth);
	fastify.get("/oauth/:provider/callback", oauthCallback);
}
