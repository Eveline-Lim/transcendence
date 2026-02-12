import authRoutes from "./routes/auth.js";
import Fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({
	logger: true
});

// Register auth routes with prefix /auth
app.register(authRoutes, {
	prefix: "api/auth"
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
