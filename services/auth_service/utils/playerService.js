import dns from "node:dns/promises";

/**
 * Resolve the player service URL, converting hostname to IP
 * to avoid Tomcat rejecting underscores in the Host header.
 */
async function getPlayerServiceUrl() {
	const baseUrl = process.env.PLAYER_SERVICE_URL || "http://player_service:8080";
	const url = new URL(baseUrl);
	try {
		const { address } = await dns.lookup(url.hostname);
		url.hostname = address;
	} catch {
		// Fallback: use original URL if DNS resolution fails
	}
	return url.origin;
}

/**
 * Create a player profile in the player service.
 * @param {{ username: string, displayName: string, email: string, password: string }} playerData
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createPlayerProfile(playerData) {
	const baseUrl = await getPlayerServiceUrl();
	const response = await fetch(`${baseUrl}/api/v1/players`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(playerData)
	});

	const data = await response.json().catch(() => ({}));
	return { ok: response.ok, status: response.status, data };
}
