export async function signup(req, reply) {
	const { username, displayName, password, email, enable2FA } = req.body;

	console.log("REQ BODY:", req.body);

	try {
		return reply.code(201).send({
			code: "USER_CREATED",
			message: "User successfully registered",
			user: {
				username,
				displayName,
				password,
				email,
				enable2FA
			}
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to register user",
		});
	}
}
