import { signup, login } from "../controllers/auth.js";
import { forgotPassword } from "../controllers/password.js";

export default async function authRoutes(fastify) {
	fastify.post("/signup", signup);
	fastify.post("/login", login);
	fastify.post("/password/forgot", forgotPassword);
}
