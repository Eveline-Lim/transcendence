import { retrieveUser } from "../controllers/players.js";
import { authenticate } from "../middleware/auth.js";

export default async function authRoutes(fastify) {
	fastify.get("/me", { preHandler: authenticate }, retrieveUser);
}
