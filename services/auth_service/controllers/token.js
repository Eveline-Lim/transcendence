export async function verifyToken(req, reply ) {
	console.log("VERIFY TOKEN");
	return reply.code(200).send({
		valid: true,
		userId: req.user.userId,
		username: req.user.username,
		issuedAt: new Date(req.user.iat * 1000).toISOString(),
		expiresAt: new Date(req.user.exp * 1000).toISOString(),
	});
}
