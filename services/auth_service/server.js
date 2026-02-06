import Fastify from "fastify";
import authRoutes from "./routes/auth.js";
import cors from '@fastify/cors';

const app = Fastify({
	logger: true
});

// Enable CORS for frontend
app.register(cors, {
	// origin: *,
	origin: "http://localhost:5173", // frontend URL
	credentials: true,
});

// app.listen({ port: 3000, host: "0.0.0.0" })
// 	.then(() => console.log("Backend running on http://localhost:3000"))
// 	.catch(error => {
// 		console.error(error);
// 		process.exit(1);
// 	});

// Register auth routes with prefix /auth
app.register(authRoutes, { prefix: "/auth" });

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
