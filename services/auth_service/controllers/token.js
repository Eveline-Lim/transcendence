import TokenInfo from "../models/TokenInfo.js";

export async function verifyToken(req, reply) {
	console.log("VERIFY TOKEN");

	const tokenInfo = new TokenInfo({
		valid: true,
		userId: req.user.userId,
		username: req.user.username,
		issuedAt: new Date(req.user.iat * 1000),
		expiresAt: new Date(req.user.exp * 1000),
	});

	return reply
		.header('X-User-Id', tokenInfo.userId)
		.header('X-Username', tokenInfo.username)
		.code(200)
		.send(tokenInfo.toJSON());
}
