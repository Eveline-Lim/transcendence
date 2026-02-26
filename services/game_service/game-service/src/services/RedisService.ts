  /***********/
 /*	IMPORT	*/
/***********/

import Redis from 'ioredis';
import { GameState } from '../models/GameState';
import { readFileSync } from 'fs';

  /***********/
 /*	HELPER	*/
/***********/

function getRedisPassword(): string | undefined {
	if (process.env.REDIS_PASSWORD_FILE) {
		try {
			return readFileSync(process.env.REDIS_PASSWORD_FILE, 'utf8').trim();
		} catch (err) {
			console.error('Failed to read Redis password file:', (err as Error).message);
		}
	}
	return process.env.REDIS_PASSWORD;
}

function safeParseInt(value: string | undefined, fallback: number): number {
	if (value === undefined) return fallback;
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
}

  /***********/
 /*	CLASS	*/
/***********/

export class RedisService {
	private client: Redis;

	constructor() {
		// Use REDIS_URL if provided, otherwise fall back to individual params
		const redisUrl = process.env.REDIS_URL;
		const password = getRedisPassword();
		
		if (redisUrl) {
			this.client = new Redis(redisUrl, {
				password,
			});
		} else {
			this.client = new Redis({
				host: process.env.REDIS_HOST || 'localhost',
				port: safeParseInt(process.env.REDIS_PORT, 6379),
				password,
				db: safeParseInt(process.env.REDIS_DB, 0),
			});
		}

		// Gestion des événements
		this.client.on('connect', () => {
			console.log('Connected to Redis');
		});

		this.client.on('error', (err) => {
			console.error('Redis error:', err);
		});
	}

	// Fermeture propre
	async disconnect(): Promise<void> {
		await this.client.quit();
	}

	// Sauvegarder une donnée
	async set(key: string, value: string): Promise<void> {
		await this.client.set(key, value);
	}

	// Récupérer une donnée
	async get(key: string): Promise<string | null> {
		return await this.client.get(key);
	}


	async createGame(gameId: string, player1_id: string, player2_id: string): Promise<void> {
		
		if (!this.client) throw new Error('Redis not initialized');

		const direction = Math.random() > 0.5 ? 1 : -1;
		const vx = 0.5 * direction;
		const vy = (Math.random() - 0.5) * 0.5;

		const gameState: GameState = {
			gameId: gameId,
			player1_id,
			player2_id,
			status: 'waiting',
			score: { player1: 0, player2: 0},
			ball: { x: 50, y: 50, vx: vx, vy: vy},
			paddles: { player1: 50, player2: 50},
			created_at: Date.now(),
			inputs: { player1_up: false, player1_down: false, player2_up: false, player2_down: false },
		};

		await this.client.setex(
			`game:${gameId}`,
			3600,
			JSON.stringify(gameState)
		);
	}

	//return GameState avec JSON.parse
	async getGameState(gameId: string): Promise<GameState | null> {

		if (!this.client) throw new Error('Redis not initialized');

		const data = await this.client.get(`game:${gameId}`);
		return data ? JSON.parse(data) : null;
	}

	async updateGameState(gameId: string, gameState: GameState): Promise<void> {

		if (!this.client) throw new Error('Redis not initialized');

		gameState.updated_at = Date.now();

		await this.client.setex(
			`game:${gameId}`,
			3600,
			JSON.stringify(gameState)
		);
	}

	async deleteGame(gameId: string): Promise<void> {
		if (!this.client) throw new Error('Redis not initialized');
	
		await this.client.del(`game:${gameId}`);
	}

	// create an Index player <=> id game
	async setPlayerGame(playerId: string, gameId: string): Promise<void> {
		if (!this.client) throw new Error('Redis not initialized');
		
		await this.client.setex(`player:${playerId}:game`, 3600, gameId);
	}

	// get ID game of the player
	async getPlayerGame(playerId: string): Promise<string | null> {
		if (!this.client) throw new Error('Redis not initialized');
		
		return await this.client.get(`player:${playerId}:game`);
	}
}
