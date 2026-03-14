  /***********/
 /*	IMPORT	*/
/***********/

import { Router } from 'express';
import { redis } from '../services/RedisInstance'
import { RedisService } from '../services/RedisService';
import { IS_TEST } from '../config/env';
import { extractUserIdOnly } from '../middleware/auth.middleware';

/* ------------------------------------------------- */


/*
 * 
 * 		ATTENTION a commencer avec /API 
 */

export const	gameRouter = Router();

gameRouter.post('/create-game', extractUserIdOnly, async (req, res) => {
	
	if (!redis) return res.status(503).json({error: 'Redis unavailable'});

	const userId = req.userId as string; // authenticated user from API gateway
	const { player1_id, player2_id, game_mode } = req.body;
	const resolvedMode: 'casual' | 'ranked' = game_mode === 'ranked' ? 'ranked' : 'casual';

	if (!player1_id || !player2_id) {
		return res.status(400).json({error: 'Missing player IDs'});
	}

	// Verify the authenticated user is one of the players
	if (userId !== player1_id && userId !== player2_id) {
		return res.status(403).json({error: 'You can only create a game you are part of'});
	}

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

		await redis.createGame(gameId, player1_id, player2_id, resolvedMode);

		await redis.setPlayerGame(player1_id, gameId);
		await redis.setPlayerGame(player2_id, gameId);

		res.status(201).json({
			gameId: gameId,
			status: 'created',
			message: 'Game created successfully',
		});
	}
	catch (error) {
		console.error('Error creating game:', error);
		res.status(500).json({ error: 'Failed to create game' });
	}

})

/**
 * POST /api/create-ai-game
 * Creates a single-player game against the AI opponent service.
 * player2_id is set to the reserved value 'ai'.
 * Requires a valid JWT (X-User-Id injected by nginx gateway).
 */
gameRouter.post('/create-ai-game', extractUserIdOnly, async (req, res) => {

	if (!redis) return res.status(503).json({ error: 'Redis unavailable' });

	const userId = req.userId as string;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	// Validate difficulty: 1=Easy, 2=Medium, 3=Hard, 4=Impossible
	const rawDifficulty = parseInt(req.body?.difficulty, 10);
	const difficulty = [1, 2, 3, 4].includes(rawDifficulty) ? rawDifficulty : 2;

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

		await redis.createGame(gameId, userId, 'ai', 'ai', difficulty);
		await redis.setPlayerGame(userId, gameId);
		// No Redis mapping for the 'ai' pseudo-player

		res.status(201).json({
			gameId,
			status: 'created',
			message: 'AI game created successfully',
		});
	}
	catch (error) {
		console.error('Error creating AI game:', error);
		res.status(500).json({ error: 'Failed to create AI game' });
	}

})