  /***********/
 /*	IMPORT	*/
/***********/

import Redis from 'ioredis';
import { GameState } from '../models/GameState';

  /***********/
 /*	CLASS	*/
/***********/

export class RedisService {
	private client: Redis;

	constructor() {
		// Connexion à Redis sur le port 6379
		this.client = new Redis({
			host: 'localhost',
			port: 6379,
		});

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


	async createGameMatchmaking(gameId: string, player1_id: string, player2_id: string): Promise<void> {
		
		if (!this.client) throw new Error('Redis not initialized');

		const direction = Math.random() > 0.5 ? 1 : -1;
		const vx = 0.5 * direction;
		const vy = (Math.random() - 0.5) * 0.5;

		const gameState: GameState = {
			gameId: gameId,
			player1_id,
			player2_id,
			IA_level: null,
			mode: 'matchmaking',
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

	async createGameIA(gameId: string, player: string | null, IA_level: 'easy' | 'medium' | 'hard'): Promise<void> {
		
		if (!this.client) throw new Error('Redis not initialized');

		const direction = Math.random() > 0.5 ? 1 : -1;
		const vx = 0.5 * direction;
		const vy = (Math.random() - 0.5) * 0.5;

		const gameState: GameState = {
			gameId: gameId,
			player1_id: player ?? 'player',
			player2_id: 'IA_' + IA_level,
			IA_level: IA_level,
			mode: 'IA',
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

	async createGameLocal(gameId: string, player: string | null): Promise<void> {

		if (!this.client) throw new Error('Redis not initialized');

		const direction = Math.random() > 0.5 ? 1 : -1;
		const vx = 0.5 * direction;
		const vy = (Math.random() - 0.5) * 0.5;

		const gameState: GameState = {
			gameId: gameId,
			player1_id: player ?? 'player_1',
			player2_id: 'player_2',
			IA_level: null,
			mode: 'local',
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

	// suppress playergame
	async deletePlayerGame(playerId: string): Promise<void> {
    if (!this.client) throw new Error('Redis not initialized');
    
    await this.client.del(`player:${playerId}:game`);
}
}
