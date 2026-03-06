"use strict";
/***********/
/*	IMPORT	*/
/***********/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketService = void 0;
const RedisInstance_1 = require("./RedisInstance");
const GameLoopService_1 = require("./GameLoopService");
/***********/
/*	CLASS	*/
/***********/
class WebsocketService {
    constructor(io) {
        this.io = io;
        this.gameLoopService = new GameLoopService_1.GameLoopService(io);
        this.setupHandlers();
    }
    setupHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`WebSocket connected: ${socket.id}`);
            this.handlePing(socket);
            this.handleDisconnect(socket);
            this.handleJoinGame(socket);
            this.handlePlayerInput(socket);
        });
    }
    handlePing(socket) {
        socket.on('ping', () => {
            console.log('Received ping');
            socket.emit('pong', { message: 'Pong!' });
        });
    }
    handleDisconnect(socket) {
        socket.on('disconnect', async () => {
            try {
                const player_id = socket.handshake.headers['x-user-id'];
                if (!player_id)
                    return;
                console.log(`WebSocket disconnected: ${socket.id} (player ${player_id})`);
                const gameId = await RedisInstance_1.redis.getPlayerGame(player_id);
                if (!gameId)
                    return;
                const gameState = await RedisInstance_1.redis.getGameState(gameId);
                if (!gameState || gameState.status === 'finished')
                    return;
                // Forfeit: the disconnected player loses
                gameState.status = 'finished';
                gameState.winner = (player_id === gameState.player1_id)
                    ? gameState.player2_id
                    : gameState.player1_id;
                await RedisInstance_1.redis.updateGameState(gameId, gameState);
                this.gameLoopService.stopGameLoop(gameId);
                this.io.to(gameId).emit('game-over', {
                    message: `Player ${player_id} disconnected. Game forfeited.`,
                    winner: gameState.winner,
                    game_state: gameState
                });
            }
            catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    }
    handleJoinGame(socket) {
        socket.on('join-game', async () => {
            try {
                // User ID and username injected by the API gateway via X-User-Id / X-Username headers
                const player_id = socket.handshake.headers['x-user-id'];
                const username = socket.handshake.headers['x-username'];
                if (!player_id) {
                    socket.emit('error', { message: 'Unauthorized: missing X-User-Id header' });
                    return;
                }
                const gameId = await RedisInstance_1.redis.getPlayerGame(player_id);
                if (!gameId) {
                    socket.emit('error', { message: 'No game found for this player' });
                    return;
                }
                const gameState = await RedisInstance_1.redis.getGameState(gameId);
                if (!gameState) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }
                if (gameState.player1_id !== player_id && gameState.player2_id !== player_id) {
                    socket.emit('error', { message: 'Player not in this game' });
                    return;
                }
                socket.join(gameId);
                console.log(`Player ${player_id} joined game ${gameId}`);
                socket.emit('joined-game', {
                    game_id: gameId,
                    game_state: gameState
                });
                const socketsInRoom = await this.io.in(gameId).fetchSockets();
                if (socketsInRoom.length === 2) {
                    gameState.status = 'playing';
                    await RedisInstance_1.redis.updateGameState(gameId, gameState);
                    this.io.to(gameId).emit('game-start', {
                        message: 'Both players connected, game starting!',
                        game_state: gameState
                    });
                    this.gameLoopService.startGameLoop(gameId);
                }
            }
            catch (error) {
                console.error('Error in join-game', error);
                socket.emit('error', { message: 'Failed to join game' });
            }
        });
    }
    handlePlayerInput(socket) {
        socket.on('paddle-input', async (data) => {
            try {
                // User ID injected by the API gateway via X-User-Id header
                const player_id = socket.handshake.headers['x-user-id'];
                if (!player_id)
                    return;
                const { action } = data;
                const gameId = await RedisInstance_1.redis.getPlayerGame(player_id);
                if (!gameId)
                    return;
                // Write directly to the in-memory game loop cache to avoid desync
                const cachedState = this.gameLoopService.getCachedGameState(gameId);
                if (!cachedState)
                    return;
                const isPlayerOne = (player_id === cachedState.player1_id);
                switch (action) {
                    case 'up-pressed':
                        if (isPlayerOne)
                            cachedState.inputs.player1_up = true;
                        else
                            cachedState.inputs.player2_up = true;
                        break;
                    case 'up-released':
                        if (isPlayerOne)
                            cachedState.inputs.player1_up = false;
                        else
                            cachedState.inputs.player2_up = false;
                        break;
                    case 'down-pressed':
                        if (isPlayerOne)
                            cachedState.inputs.player1_down = true;
                        else
                            cachedState.inputs.player2_down = true;
                        break;
                    case 'down-released':
                        if (isPlayerOne)
                            cachedState.inputs.player1_down = false;
                        else
                            cachedState.inputs.player2_down = false;
                        break;
                }
            }
            catch (error) {
                console.error('Error in Player-input', error);
            }
        });
    }
}
exports.WebsocketService = WebsocketService;
