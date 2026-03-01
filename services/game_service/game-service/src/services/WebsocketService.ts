  /***********/
 /*	IMPORT	*/
/***********/

import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';
import { GameLoopService } from './GameLoopService';
import { handleJoinGameLocal, handlePingLocal, handlePlayerInputLocal } from './handle.Local';
import { handleJoinGameMatchmaking, handlePingMatchmaking, handlePlayerInputMatchmaking } from './handle.Matchmaking';
import { handleJoinGameIA, handlePingIA, handlePlayerInputIA } from './handle.IA';


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

			// Save GameId from querry
			const gameId = socket.handshake.query.gameId as string ?? null;
			
			const player_id: string = socket.handshake.headers['player_id'] as string ?? null;
			
			if (!gameId) {
				socket.disconnect();
				console.log('Error gameID');
				return ;
			}
			const gameState = await redis!.getGameState(gameId);
			if (!gameState) {
				console.log('Error getGameState');
				socket.disconnect();
				return ;
			}

			socket.data.playerId = player_id ?? null;
			socket.data.gameId = gameId;
			socket.data.mode = gameState.mode;

			/* HANDLER	*/
			this.handleJoinGame(socket); // DONE
			this.handlePing(socket); // DONE
			this.handlePlayerInput(socket); // DONE
			this.handleDisconnect(socket); // IN PROGRESS
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
			default:
				socket.on('custom-ping', () => {
					console.log('Received ping! From General');
					socket.emit('custom-pong', { message: 'Pong! from General' });
				})
		}
	}

	private handleDisconnect(socket: Socket) {
		socket.on('disconnect', async () => {
			console.log(`WebSocket disconnected: ${socket.id}`);

			const socketsInRoom = await this.io.in(socket.data.gameId).fetchSockets();
			if (socketsInRoom.length === 0) {
				redis?.deleteGame(socket.data.gameId);
			}
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

	private handlePlayerInput(socket: Socket) {
	
		switch(socket.data.mode) {
			case 'matchmaking':
				handlePlayerInputMatchmaking(socket, this.io);
				break ;
			case 'local':
				handlePlayerInputLocal(socket, this.io);
				break ;
			case 'IA':
				handlePlayerInputIA(socket, this.io);
				break ;
		}
	}
}