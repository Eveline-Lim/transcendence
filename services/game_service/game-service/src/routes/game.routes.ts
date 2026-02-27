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

gameRouter.post('/game/matchmaking', async (req, res) => {
	
	if (!redis) return res.status(503).json({error: 'Redis unavailable'});

	//receive data in HEADER, not BODY !
	const { player1_id, player2_id } = req.body;

	if (!player1_id || !player2_id) {
		return res.status(400).json({error: 'Missing player IDs'});
	}

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

		await redis.createGameMatchmaking(gameId, player1_id, player2_id);

		await redis.setPlayerGame(player1_id, gameId);
		await redis.setPlayerGame(player2_id, gameId);

		res.status(201).json({
			gameId: gameId,
			status: 'created',
			message: 'Game created successfully',
		});
	}
	catch (error) {
		console.error('Error CreateGame in Matchmaking:', error);
		res.status(500).json({ error: 'Failed to create game' });
	}

})

gameRouter.post('/game/IA', async (req, res) => {

	if (!redis) return res.status(503).json({error: 'Redis unavailable'});

	const { player, IA_level } = req.body;


	if (!player) return res.status(400).json({error: 'Missing player IDs'});
	// if (!IA_level || IA_level < 0 || IA_level > 3) return res.status(400).json({error: 'Missing or forbidden IA level'});

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}_${IA_level}`;

		await redis.createGameIA(gameId, player, IA_level);
		await redis.setPlayerGame(player, gameId);

		res.status(201).json({
			gameId: gameId,
			status: 'created',
			message: 'Game created successfully',
		});
	}
	catch (error) {
		console.error('Error CreateGame in IA:', error);
		res.status(500).json({ error: 'Failed to create game' });
	}
})

gameRouter.post('/game/local', async (req, res) => {

	if (!redis) return res.status(503).json({error: 'Redis unavailable'});

	const player = req.body?.player_id ?? null;

	try {
		const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}_local`;

		await redis.createGameLocal(gameId, player);
		if (player) await redis.setPlayerGame(player, gameId);

		res.status(201).json({
			gameId: gameId,
			status: 'created',
			message: 'Game created successfully',
		});
	}
	catch(error) {
		console.error('Error CreateGame in local:', error);
		res.status(500).json({ error: 'Failed to create game' });
	}
})