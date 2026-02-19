import jwt from "jsonwebtoken";

export async function authenticate(req, reply) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({
				error: "Missing token"
			});
		}

		const token = authHeader.split(" ")[1];
		console.log("middleware token: ", token);

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// console.log("decoded token: ", decoded);

		req.user = decoded;
	} catch (err) {
		return reply.code(401).send({
			error: "Invalid token"
		});
	}
}
