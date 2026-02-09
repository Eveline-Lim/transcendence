import { validateInputs } from "../utils/validators.js"
import { redisClient } from "../redisClient.js";
import bcrypt from "bcrypt";

export async function signup(req, reply) {
	const { username, displayName, password, email, has2FAEnabled } = req.body;
	console.log("REQ BODY:", req.body);
	// avatarUrl = "assets/avatar.jpg";

	// const validation = validateInputs({ username, email, password }, false);
	const validation = validateInputs({ username, email }, false);
	if (!validation.success) {
		return reply.code(400).send({
			code: "INVALID_CREDENTIALS",
			message: "Invalid fields",
		});
	}

	try {
		const userKey = `user:${username}`;
		console.log("userKey: ", userKey);
		const emailKey = `email:${email}`;
		console.log("emailKey: ", emailKey);
		// Check username uniqueness
		const existingUser = await redisClient.exists(userKey);
		if (existingUser) {
			return reply.code(409).send({
				code: "USER_ALREADY_EXISTS",
				message: "Username already exists",
			});
		}
		// Check email uniqueness
		const existingEmail = await redisClient.exists(emailKey);
		if (existingEmail) {
			return reply.code(409).send({
				code: "EMAIL_ALREADY_EXISTS",
				message: "Email already exists",
			});
		}
		const uuid = crypto.randomUUID();
		console.log("UUID: ", uuid);
		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log("hashedPassword: ", hashedPassword);
		// Save user
		await redisClient.hSet(userKey, {
			id: uuid,
			username,
			displayName,
			hashedPassword,
			email,
			// avatarUrl,
			has2FAEnabled: "0"
		});
		await redisClient.set(emailKey, username);
		await redisClient.set(`userid:${uuid}`, username);
		return reply.code(201).send({
			code: "USER_CREATED",
			message: "User successfully registered",
			user: {
				username,
				displayName,
				password,
				email,
				// avatarUrl,
				has2FAEnabled
			}
		});
	} catch (error) {
		return reply.code(500).send({
			code: "INTERNAL_ERROR",
			message: "Unable to register user",
		});
	}
}
