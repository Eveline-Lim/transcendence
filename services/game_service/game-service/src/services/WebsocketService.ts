  /***********/
 /*	IMPORT	*/
/***********/

import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';
import { GameLoopService } from './GameLoopService';
import { PlayerServiceClient } from './PlayerServiceClient';
import { PlayersInputs } from '../models/GameState';
import { RECONNECT_TIMEOUT_MS } from '../config/env';


  /***********/
 /*	CLASS	*/
/***********/

export class WebsocketService {
	private io: Server;
	private gameLoopService: GameLoopService;
	/** Pending forfeit timers keyed by gameId – cleared when the player reconnects. */
	private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

	constructor(io: Server) {
		this.io = io;
		this.gameLoopService = new GameLoopService(io);
		this.setupHandlers();
	}

	private setupHandlers() {
		this.io.on('connection', (socket: Socket) => {
			console.log(`WebSocket connected: ${socket.id}`);

			this.handlePing(socket);
			this.handleDisconnect(socket);
			this.handleJoinGame(socket);
			this.handlePlayerInput(socket);
		});
	}

	private handlePing(socket: Socket) {
		socket.on('ping', () => {
			console.log('Received ping');
			socket.emit('pong', { message: 'Pong!' });
		});
	}

	private handleDisconnect(socket: Socket) {
		socket.on('disconnect', async () => {
			try {
				const player_id = socket.handshake.headers['x-user-id'] as string;
				if (!player_id) return;

				console.log(`WebSocket disconnected: ${socket.id} (player ${player_id})`);

				const gameId = await redis!.getPlayerGame(player_id);
				if (!gameId) return;

				const gameState = await redis!.getGameState(gameId);
				if (!gameState || gameState.status === 'finished') return;

				// If the game hasn't started yet, just clean up
				if (gameState.status === 'waiting') {
					gameState.status = 'finished';
					await redis!.updateGameState(gameId, gameState);
					this.gameLoopService.stopGameLoop(gameId);
					return;
				}

				// Game keeps running — just freeze the disconnected player's paddle
				this.gameLoopService.resetPlayerInputs(gameId, player_id);

				// If a timer already exists (e.g. rapid disconnect/reconnect cycle), skip
				if (this.disconnectTimers.has(gameId)) return;

				// Track who disconnected
				gameState.disconnected_player = player_id;
				gameState.disconnect_time = Date.now();
				await redis!.updateGameState(gameId, gameState);

				// Notify the opponent
				this.io.to(gameId).emit('player-disconnected', {
					message: `Opponent disconnected. They have ${RECONNECT_TIMEOUT_MS / 1000}s to reconnect.`,
					disconnected_player: player_id,
					timeout: RECONNECT_TIMEOUT_MS,
				});

				// Start forfeit timer — if the player doesn't reconnect in time, they lose
				const timer = setTimeout(async () => {
					this.disconnectTimers.delete(gameId);
					await this.forfeitGame(gameId, player_id);
				}, RECONNECT_TIMEOUT_MS);

				this.disconnectTimers.set(gameId, timer);
			}
			catch(error) {
				console.error('Error handling disconnect:', error);
			}
		});
	}

	/**
	 * Forfeit a game when the reconnection grace period expires.
	 */
	private async forfeitGame(gameId: string, disconnectedPlayerId: string) {
		try {
			const gameState = await redis!.getGameState(gameId);
			if (!gameState || gameState.status === 'finished') return;

			// Player reconnected in the meantime — do not forfeit
			if (gameState.disconnected_player !== disconnectedPlayerId) return;

			gameState.status = 'finished';
			gameState.winner = (disconnectedPlayerId === gameState.player1_id)
				? gameState.player2_id
				: gameState.player1_id;
			gameState.disconnected_player = undefined;
			gameState.disconnect_time = undefined;

			await redis!.updateGameState(gameId, gameState);
			this.gameLoopService.stopGameLoop(gameId);

			if (gameState.game_mode !== 'ai') {
				const loserId  = disconnectedPlayerId;
				const winnerId = gameState.winner!;
				const winnerScore = winnerId === gameState.player1_id
					? gameState.score.player1 : gameState.score.player2;
				const loserScore  = winnerId === gameState.player1_id
					? gameState.score.player2 : gameState.score.player1;
				const durationSec = Math.round((Date.now() - gameState.created_at) / 1000);
				PlayerServiceClient.reportMatchResult({
					winnerId, loserId,
					winnerScore, loserScore,
					gameMode: gameState.game_mode,
					duration: durationSec,
				});
			}

			this.io.to(gameId).emit('game-over', {
				message: `Player ${disconnectedPlayerId} did not reconnect in time. Game forfeited.`,
				winner: gameState.winner,
				game_state: gameState
			});
		} catch (error) {
			console.error('Error forfeiting game:', error);
		}
	}

	private handleJoinGame(socket: Socket) {
		socket.on('join-game', async () => {
			try {
				// User ID and username injected by the API gateway via X-User-Id / X-Username headers
				const player_id = socket.handshake.headers['x-user-id'] as string;
				const username   = socket.handshake.headers['x-username'] as string;
				if (!player_id) {
					socket.emit('error', { message: 'Unauthorized: missing X-User-Id header' });
					return;
				}

				const gameId = await redis!.getPlayerGame(player_id);
				if (!gameId) {
					socket.emit('error', { message: 'No game found for this player' });
					return ;
				}

				const gameState = await redis!.getGameState(gameId);
				if (!gameState) {
					socket.emit('error', {message: 'Game not found'});
					return ;
				}

				if (gameState.player1_id !== player_id && gameState.player2_id !== player_id) {
					socket.emit('error', {message: 'Player not in this game'})
					return ;
				}
				
				socket.join(gameId);
				console.log(`Player ${player_id} joined game ${gameId}`);

				// ── Reconnection: player is rejoining a running game ──
				if (gameState.status === 'playing' && gameState.disconnected_player === player_id) {
					// Cancel the forfeit timer
					const timer = this.disconnectTimers.get(gameId);
					if (timer) {
						clearTimeout(timer);
						this.disconnectTimers.delete(gameId);
					}

					// Clear disconnect tracking
					gameState.disconnected_player = undefined;
					gameState.disconnect_time = undefined;
					await redis!.updateGameState(gameId, gameState);

					console.log(`Player ${player_id} reconnected to game ${gameId}`);

					socket.emit('joined-game', {
						game_id: gameId,
						game_state: gameState
					});

					this.io.to(gameId).emit('player-reconnected', {
						message: 'Opponent reconnected!',
						reconnected_player: player_id,
					});
					return;
				}

				socket.emit('joined-game', {
					game_id: gameId,
					game_state: gameState
				})

				const socketsInRoom = await this.io.in(gameId).fetchSockets();

				// For AI games a single human player is enough to start.
				// For PvP games we wait for both players to connect.
				const readyToStart =
					socketsInRoom.length === 2 ||
					(gameState.game_mode === 'ai' && socketsInRoom.length >= 1);

				if (readyToStart) {
					gameState.status = 'playing';
					await redis!.updateGameState(gameId, gameState);
				
					this.io.to(gameId).emit('game-start', {
						message: 'Both players connected, game starting!',
						game_state: gameState
					});

					this.gameLoopService.startGameLoop(gameId);
				}
			}
			catch(error) {
				console.error('Error in join-game', error);
				socket.emit('error', {message: 'Failed to join game'});
			}
		});
	}

	private handlePlayerInput(socket: Socket) {
		socket.on('paddle-input', async (data: { action: string}) => {
			try {
				// User ID injected by the API gateway via X-User-Id header
				const player_id = socket.handshake.headers['x-user-id'] as string;
				if (!player_id) return;
				const { action } = data;

				const gameId = await redis!.getPlayerGame(player_id);
				if (!gameId) return;

				// Write directly to the in-memory game loop cache to avoid desync
				const cachedState = this.gameLoopService.getCachedGameState(gameId);
				if (!cachedState) return;

				const isPlayerOne = (player_id === cachedState.player1_id);

				switch(action) {
					case 'up-pressed':
						if (isPlayerOne) cachedState.inputs.player1_up = true;
						else cachedState.inputs.player2_up = true;
						break;
					case 'up-released':
						if (isPlayerOne) cachedState.inputs.player1_up = false;
						else cachedState.inputs.player2_up = false;
						break;
					case 'down-pressed':
						if (isPlayerOne) cachedState.inputs.player1_down = true;
						else cachedState.inputs.player2_down = true;
						break;
					case 'down-released':
						if (isPlayerOne) cachedState.inputs.player1_down = false;
						else cachedState.inputs.player2_down = false;
						break;
				}
			}
			catch(error) {
				console.error('Error in Player-input', error);
			}
		})
	}
}