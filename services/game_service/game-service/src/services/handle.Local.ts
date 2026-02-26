import { Server, Socket } from 'socket.io';
import { redis } from './RedisInstance';
import { GameState, PlayersInputs } from '../models/GameState';
import { GameLoopService } from './GameLoopService';


export function handlePingLocal(socket: Socket) {
	socket.on('ping', () => {
			console.log('Received ping! From Local');
			socket.emit('pong', { message: 'Pong! from Local' });
		});
}

export async function handleJoinGameLocal(socket: Socket, io: Server, gameLoopService: GameLoopService) {

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

			if (socketsInRoom.length === 2) {
				gameState.status = 'playing';
				await redis!.updateGameState(gameId, gameState);
			
				io.to(gameId).emit('game-start', {
					message: 'Both players connected, game starting!',
					game_state: gameState
				});
				// Start Game
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

export async function handlePlayerInputLocal(socket: Socket, io: Server) {
	
	socket.on('paddle-input', async (data: {	player1_up: boolean, player1_down: boolean
												player2_up: boolean, player2_down: boolean}) => {
		
		try {

			const { player1_up, player1_down, player2_up, player2_down } = data;

			if (!player1_down || !player1_up || !player2_down || !player2_up) {
				socket.emit('error', {message: 'Wrong input'})
				console.log('Error front: Wrong input');
				return ;
			}

			const gameState = await redis!.getGameState(socket.data.gameId);
			if (!gameState) {
				socket.emit('error', {message: 'No game found'});
				return ;
			}

			gameState.inputs.player1_up = player1_up;
			gameState.inputs.player1_down = player1_down;
			gameState.inputs.player2_up = player2_up;
			gameState.inputs.player2_down = player2_down;

			await redis!.updateGameState(socket.data.gameId, gameState);
		}
		catch(error) {
			console.error('Error in Player-input', error);
		}
	})
}