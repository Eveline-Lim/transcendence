import { signup } from "../controllers/auth.js";

export default async function authRoutes(fastify) {
	fastify.post("/signup", signup);
}
