import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';
import { GameState } from '../models/GameState';
import { GameLoopService } from './GameLoopService';

export function handlePingIA(socket: Socket) {
	socket.on('ping', () => {
			console.log('Received ping! From IA');
			socket.emit('pong', { message: 'Pong! from IA' });
		});
}

export async function handleJoinGameIA(socket: Socket, io: Server, gameLoopService: GameLoopService){

	socket.on('join-game', async () => {

		const playerId = socket.data.playerId ?? null; //ID player who connect
		try {
			const gameId = socket.data.gameId;
			const gameState = await redis!.getGameState(gameId);
			if (!gameState) {
				socket.emit('error', {message: 'No game found'})
				return ;
			}

			socket.join(gameId);
			console.log(`Player ${playerId} joined game ${gameId}`);

			socket.emit('joined-game', {//usefull data ?
				game_id: gameId,
				game_state: gameState
			})
		// ----------------------------------------------

			const socketsInRoom = await io.in(gameId).fetchSockets();

			if (socketsInRoom.length === 1) {
				gameState.status = 'playing';
				await redis!.updateGameState(gameId, gameState);
			
				io.to(gameId).emit('game-start', {
					message: 'Client IA connected, game starting!',
					game_state: gameState
				});

				gameLoopService.startGameLoop(gameId);
			}
		}
		catch (error) {
			const mode = ' -' + socket.data.mode + '-'
			console.error('Error in join-game', error);
			socket.emit('error', {message: 'Failed to join game' + mode});
		}
	});
};
