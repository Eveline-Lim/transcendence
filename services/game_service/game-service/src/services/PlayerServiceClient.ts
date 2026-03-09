  /***********/
 /*	IMPORT	*/
/***********/

import http from 'http';
import { PLAYER_SERVICE_URL } from '../config/env';

  /***********/
 /*	CLASS	*/
/***********/

export interface MatchResultPayload {
	winnerId: string;
	loserId: string;
	winnerScore: number;
	loserScore: number;
	gameMode: string;   // "casual" | "ranked"
	duration: number;   // seconds
}

/**
 * HTTP client for the player service.
 * Reports match results so stats, ELO, and match history are updated.
 */
export class PlayerServiceClient {

	/**
	 * POST the match result to the player service's internal endpoint.
	 * Fire-and-forget — failures are logged but do not affect the game flow.
	 */
	static reportMatchResult(payload: MatchResultPayload): void {
		const url = `${PLAYER_SERVICE_URL}/api/v1/internal/match-result`;
		const body = JSON.stringify(payload);

		const parsedUrl = new URL(url);

		const options: http.RequestOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || 80,
			path: parsedUrl.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
				// Tomcat rejects underscores in the Host header (e.g. player_service).
				// Override with a plain value so the request isn't rejected.
				'Host': `localhost:${parsedUrl.port || 80}`,
			},
		};

		const req = http.request(options, (res) => {
			if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
				console.log(`Match result reported: ${payload.winnerId} beat ${payload.loserId} (${payload.winnerScore}-${payload.loserScore})`);
			} else {
				console.error(`Failed to report match result: ${res.statusCode} ${res.statusMessage}`);
			}
			// Consume response to free resources
			res.resume();
		});

		req.on('error', (error) => {
			console.error('Error reporting match result to player service:', error.message);
		});

		req.write(body);
		req.end();
	}
}
