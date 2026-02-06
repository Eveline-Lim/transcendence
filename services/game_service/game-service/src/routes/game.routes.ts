  /***********/
 /*	IMPORT	*/
/***********/

import { Router } from 'express';
import { redis } from '../services/RedisInstance'
import { RedisService } from '../services/RedisService';
import { IS_TEST } from '../config/env';

/* ------------------------------------------------- */


/*
 * 
 * 		ATTENTION a commencer avec /API 
 */

export const	gameRouter = Router();

gameRouter.post('/create-game', async (req, res) => {
	
	if (!redis) return res.status(503).json({error: 'Redis unavailable'});

	const { player1_id, player2_id } = req.body;

	if (!player1_id || !player2_id) {
		return res.status(400).json({error: 'Missing player IDs'});
	}

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

		await redis.createGame(gameId, player1_id, player2_id);

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