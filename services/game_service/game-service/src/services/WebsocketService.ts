  /***********/
 /*	IMPORT	*/
/***********/

import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';
import { GameLoopService } from './GameLoopService';
import { INSPECT_MAX_BYTES } from 'buffer';
import { handleJoinGameLocal, handlePingLocal } from './handle.Local';
import { start } from 'repl';
import { handleJoinGameMatchmaking, handlePingMatchmaking } from './handle.Matchmaking';
import { handleJoinGameIA, handlePingIA } from './handle.IA';


  /***********/
 /*	CLASS	*/
/***********/

export class WebsocketService {
	private io: Server;
	private gameLoopService: GameLoopService;

	constructor(io: Server) {
		this.io = io;
		this.gameLoopService = new GameLoopService(io);
		this.setupHandlers();
	}

	private setupHandlers() {
		this.io.on('connection', async (socket: Socket) => {
			console.log(`WebSocket connected: ${socket.id}`);

			// Save playerId && mode in socket from header

			const player_id: string = socket.handshake.headers['player_id'] as string ?? null;
			if (!player_id) { return; }

			const gameId = await redis!.getPlayerGame(player_id);
			if (!gameId) return;

			const gameState = await redis!.getGameState(gameId);
			if (!gameState) return;

			socket.data.playerId = player_id ?? null;
			socket.data.gameId = gameId;
			socket.data.mode = gameState.mode;

			// same handle for everyone mode
			this.handlePing(socket); // DONE

			// different handler
			this.handleJoinGame(socket); // IN PROGRESS
			// this.handleDisconnect(socket);
			// this.handlePlayerInput(socket);
		});
	}

	private handlePing(socket: Socket) {
		switch(socket.data.mode) {
			case 'matchmaking':
				handlePingMatchmaking(socket);
				break;
			case 'local':
				handlePingLocal(socket);
				break;
			case 'IA':
				handlePingIA(socket);
				break;
		}
	}

	private handleDisconnect(socket: Socket) {
		socket.on('disconnect', () => {
			console.log(`WebSocket disconnected: ${socket.id}`);
		});
	}

	private async handleJoinGame(socket: Socket) {

		const mode = socket.data.mode;
		
				if (mode === 'local') {
					await handleJoinGameLocal(socket, this.io, this.gameLoopService);
				}
				else if (mode === 'matchmaking') {
					await handleJoinGameMatchmaking(socket, this.io, this.gameLoopService);
				}
				else if (mode === 'IA') {
					await handleJoinGameIA(socket, this.io, this.gameLoopService);
				}
			}
}

	// private handlePlayerInput(socket: Socket) {
	// 	socket.on('paddle-input', async (data: {player_id: string, action: string}) => {
	// 		try {

	// 			const { player_id, action } = data;

	// 			const gameId = await redis!.getPlayerGame(player_id);
	// 			if (!gameId) return;

	// 			const gameState = await redis!.getGameState(gameId);
	// 			if (!gameState) return;

	// 			const isPlayerOne = (player_id === gameState.player1_id);

	// 			switch(action) {
	// 				case 'up-pressed':
	// 					if (isPlayerOne) gameState.inputs.player1_up = true;
	// 					else gameState.inputs.player2_up = true;
	// 				case 'up-released':
	// 					if (isPlayerOne) gameState.inputs.player1_up = false;
	// 					else gameState.inputs.player2_up = false;
	// 				case 'down-pressed':
	// 					if (isPlayerOne) gameState.inputs.player1_down = true;
	// 					else gameState.inputs.player2_down = true;
	// 				case 'down-released':
	// 					if (isPlayerOne) gameState.inputs.player1_down = false;
	// 					else gameState.inputs.player2_down = false;
	// 			}

	// 			await redis!.updateGameState(gameId, gameState);
	// 		}
	// 		catch(error) {
	// 			console.error('Error in Player-input', error);
	// 		}
	// 	})
	// }