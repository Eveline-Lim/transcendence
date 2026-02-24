import { createClient } from "redis";
import fs from 'fs/promises';

let url = process.env.REDIS_URL || 'redis://localhost:6379/0';

// Inject password from secret file if provided
if (process.env.REDIS_PASSWORD_FILE) {
	try {
		const password = (await fs.readFile(process.env.REDIS_PASSWORD_FILE, 'utf8')).trim();
		const urlObj = new URL(url);
		urlObj.password = password;
		url = urlObj.toString();
	} catch (err) {
		console.error("Failed to read Redis password file:", err.message);
	}
}

export const redisClient = createClient({ url });

redisClient.on("error", (err) => console.error("Redis Client Error:", err));

await redisClient.connect();
