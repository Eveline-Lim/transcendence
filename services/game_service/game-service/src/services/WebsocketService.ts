  /***********/
 /*	IMPORT	*/
/***********/

import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';


  /***********/
 /*	CLASS	*/
/***********/

export class WebsocketService {
	private io: Server;

	constructor(io: Server) {
		this.io = io;
		this.setupHandlers();
	}

	private setupHandlers() {
		this.io.on('connection', (socket: Socket) => {
			console.log(`WebSocket connected: ${socket.id}`);

			this.handlePing(socket);
			this.handleDisconnect(socket);
			this.handleJoinGame(socket);
			// this.handlePlayerMove(socket);    // À ajouter
			// this.handleError(socket);         // À ajouter
		});
	}

	private handlePing(socket: Socket) {
		socket.on('ping', () => {
			console.log('Received ping');
			socket.emit('pong', { message: 'Pong!' });
		});
	}

	private handleDisconnect(socket: Socket) {
		socket.on('disconnect', () => {
			console.log(`WebSocket disconnected: ${socket.id}`);
		});
	}

	private handleJoinGame(socket: Socket) {
		socket.on('join-game', async (data: { player_id: string}) => {
			try {
				const {player_id} = data; //ID player who connect

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

				socket.emit('joined-game', {
					game_id: gameId,
					game_state: gameState
				})

				const socketsInRoom = await this.io.in(gameId).fetchSockets();

				if (socketsInRoom.length === 2) {
					gameState.status = 'playing';
					await redis!.updateGameState(gameId, gameState);
				
					this.io.to(gameId).emit('game-start', {
						message: 'Both players connected, game starting!',
						game_state: gameState
					});
				}
			}
			catch(error) {
				console.error('Error in join-game', error);
				socket.emit('error', {message: 'Failed to join game'});
			}
		});
	}
}