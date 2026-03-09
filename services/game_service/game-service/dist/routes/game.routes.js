"use strict";
/***********/
/*	IMPORT	*/
/***********/
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRouter = void 0;
const express_1 = require("express");
const RedisInstance_1 = require("../services/RedisInstance");
const auth_middleware_1 = require("../middleware/auth.middleware");
/* ------------------------------------------------- */
/*
 *
 * 		ATTENTION a commencer avec /API
 */
exports.gameRouter = (0, express_1.Router)();
exports.gameRouter.post('/create-game', auth_middleware_1.extractUserId, async (req, res) => {
    if (!RedisInstance_1.redis)
        return res.status(503).json({ error: 'Redis unavailable' });
    const userId = req.userId; // authenticated user from API gateway
    const { player1_id, player2_id } = req.body;
    if (!player1_id || !player2_id) {
        return res.status(400).json({ error: 'Missing player IDs' });
    }
    // Verify the authenticated user is one of the players
    if (userId !== player1_id && userId !== player2_id) {
        return res.status(403).json({ error: 'You can only create a game you are part of' });
    }
    try {
        const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        await RedisInstance_1.redis.createGame(gameId, player1_id, player2_id);
        await RedisInstance_1.redis.setPlayerGame(player1_id, gameId);
        await RedisInstance_1.redis.setPlayerGame(player2_id, gameId);
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
});
