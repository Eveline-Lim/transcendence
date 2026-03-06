"use strict";
/***********/
/*	IMPORT	*/
/***********/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = require("fs");
/***********/
/*	HELPER	*/
/***********/
function getRedisPassword() {
    if (process.env.REDIS_PASSWORD_FILE) {
        try {
            return (0, fs_1.readFileSync)(process.env.REDIS_PASSWORD_FILE, 'utf8').trim();
        }
        catch (err) {
            console.error('Failed to read Redis password file:', err.message);
        }
    }
    return process.env.REDIS_PASSWORD;
}
function safeParseInt(value, fallback) {
    if (value === undefined)
        return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}
/***********/
/*	CLASS	*/
/***********/
class RedisService {
    constructor() {
        // Use REDIS_URL if provided, otherwise fall back to individual params
        const redisUrl = process.env.REDIS_URL;
        const password = getRedisPassword();
        if (redisUrl) {
            this.client = new ioredis_1.default(redisUrl, {
                password,
            });
        }
        else {
            this.client = new ioredis_1.default({
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
    async disconnect() {
        await this.client.quit();
    }
    // Sauvegarder une donnée
    async set(key, value) {
        await this.client.set(key, value);
    }
    // Récupérer une donnée
    async get(key) {
        return await this.client.get(key);
    }
    async createGame(gameId, player1_id, player2_id) {
        if (!this.client)
            throw new Error('Redis not initialized');
        const direction = Math.random() > 0.5 ? 1 : -1;
        const vx = 0.5 * direction;
        const vy = (Math.random() - 0.5) * 0.5;
        const gameState = {
            gameId: gameId,
            player1_id,
            player2_id,
            status: 'waiting',
            score: { player1: 0, player2: 0 },
            ball: { x: 50, y: 50, vx: vx, vy: vy },
            paddles: { player1: 50, player2: 50 },
            created_at: Date.now(),
            inputs: { player1_up: false, player1_down: false, player2_up: false, player2_down: false },
        };
        await this.client.setex(`game:${gameId}`, 3600, JSON.stringify(gameState));
    }
    //return GameState avec JSON.parse
    async getGameState(gameId) {
        if (!this.client)
            throw new Error('Redis not initialized');
        const data = await this.client.get(`game:${gameId}`);
        return data ? JSON.parse(data) : null;
    }
    async updateGameState(gameId, gameState) {
        if (!this.client)
            throw new Error('Redis not initialized');
        gameState.updated_at = Date.now();
        await this.client.setex(`game:${gameId}`, 3600, JSON.stringify(gameState));
    }
    async deleteGame(gameId) {
        if (!this.client)
            throw new Error('Redis not initialized');
        await this.client.del(`game:${gameId}`);
    }
    // create an Index player <=> id game
    async setPlayerGame(playerId, gameId) {
        if (!this.client)
            throw new Error('Redis not initialized');
        await this.client.setex(`player:${playerId}:game`, 3600, gameId);
    }
    // get ID game of the player
    async getPlayerGame(playerId) {
        if (!this.client)
            throw new Error('Redis not initialized');
        return await this.client.get(`player:${playerId}:game`);
    }
}
exports.RedisService = RedisService;
