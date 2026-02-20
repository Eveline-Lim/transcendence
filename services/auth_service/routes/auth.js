import { signup, login, logout } from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";
import { forgotPassword } from "../controllers/password.js";
import { resetPassword } from "../controllers/password.js";
import { initiateOauth, oauthCallback } from "../controllers/oauth.js";

export default async function authRoutes(fastify) {
	fastify.post("/signup", signup);
	fastify.post("/login", login);
	fastify.post("/password/forgot", forgotPassword);
	fastify.post("/password/reset", resetPassword);
	fastify.get("/oauth/:provider", initiateOauth);
	fastify.get("/oauth/:provider/callback", oauthCallback);
	fastify.post("/logout", { preHandler: authenticate }, logout);
}
