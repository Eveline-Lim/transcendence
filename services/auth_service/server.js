import authRoutes from "./routes/auth.js";
import playersRoutes from "./routes/players.js";
import Fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({
	logger: true
});

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Register auth routes with prefix /auth
app.register(authRoutes, {
	prefix: "api/auth"
});

// Register players routes with prefix /players
app.register(playersRoutes, {
	prefix: "api/players"
});

// Run the server
const start = async () => {
	try {
		const address = await app.listen({ port: 3000, host: "0.0.0.0" });
		console.log(`Server running at ${address}`);
	} catch (error) {
		app.log.error(error);
		process.exit(1);
	}
};

start();
