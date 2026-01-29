  /***********/
 /*	IMPORT	*/
/***********/

import { Server } from 'socket.io';
import { redis } from './RedisInstance';
import { GameState } from '../models/GameState';

  /***********/
 /*	CLASS	*/
/***********/

export class GameLoopService {
	private io: Server;
	private activeLoops: Map<string, NodeJS.Timeout> = new Map();
	// Cache in RAM
	private gameStatesCache: Map<string, GameState> = new Map();

	constructor(io: Server) {
		this.io = io;
	}

	async startGameLoop(gameId: string) {
		if (this.activeLoops.has(gameId))
			return ;

		console.log(`Starting game loop for ${gameId}`);

		const gameState = await redis!.getGameState(gameId);

		if (!gameState) {
			console.error(`Cannot start game loop: game ${gameId} not found`);
			return;
		}

		this.gameStatesCache.set(gameId, gameState);

		//To run 60 time by seconde (16.67ms ~)
		const interval = setInterval(async () => {
			await this.gameLoopTick(gameId);
		}, 16);

		this.activeLoops.set(gameId, interval);
	}

	private async gameLoopTick(gameId: string) {
		try {

			const gameState = this.gameStatesCache.get(gameId);

			if(!gameState || gameState.status !== 'playing') {
				// this.stopGameLoop(gameId);
				return;
			}

			this.updatePaddles(gameState);
			this.updateBall(gameState);
			// this.checkCollisions(gameState);
			// this.checkScore(gameState);

		}
		catch(error) {
			console.error(`Error in game loop for ${gameId}:`, error);
			// this.stopGameLoop(gameId);
		}
	}

	protected updatePaddles(gameState: GameState) {
		const PADDLE_SPEED = 2; //Ajustable en fonction du ressenti jeu

		// Player 1 (paddle left)
		if (gameState.inputs.player1_up) {
			gameState.paddles.player1 -= PADDLE_SPEED;
		}
		if (gameState.inputs.player1_down) {
			gameState.paddles.player1 += PADDLE_SPEED;
		}

		// Player 2 (paddle right)
		if (gameState.inputs.player2_up) {
			gameState.paddles.player2 -= PADDLE_SPEED;
		}
		if (gameState.inputs.player2_down) {
			gameState.paddles.player2 += PADDLE_SPEED;
		}

		//	Set limits (0-100%)
		gameState.paddles.player1 = Math.max(0, Math.min(100, gameState.paddles.player1));
		gameState.paddles.player2 = Math.max(0, Math.min(100, gameState.paddles.player2));
	}

	protected checkPaddleCollision(gameState: GameState, player: 'player1' | 'player2'): boolean {
		const ball = gameState.ball;
		const PADDLE_HEIGHT = 15;

		const paddleY = player === 'player1' ? gameState.paddles.player1 : gameState.paddles.player2;

		const paddleTop = paddleY - (PADDLE_HEIGHT / 2);
		const paddleBottom = paddleY + (PADDLE_HEIGHT / 2);

		return ball.y >= paddleTop && ball.y <= paddleBottom;
	}

	protected updateBallSpeed(gameState: GameState) {
		const ball = gameState.ball;
		const boostSpeed = ball.vx > 0 ? 0.05 : -0.05;
		ball.vx += boostSpeed;
	}

	protected updateBall(gameState: GameState) {

		const ball = gameState.ball;
		const PADDLE_LEFT_X = 5;
		const PADDLE_RIGHT_X = 95;

		const targetX = ball.x + ball.vx;
		// const targetY = ball.y + ball.vy;

		// ---	CHECK IF TUNNELING	---
			//	tunneling left
		if (ball.vx < 0 && ball.x >= PADDLE_LEFT_X && targetX <= PADDLE_LEFT_X) {
			const distanceToPaddle = ball.x - PADDLE_LEFT_X;
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;

			ball.x = PADDLE_LEFT_X;
			this.checkCollisionY(gameState, ratioToPaddle);

			if (this.checkPaddleCollision(gameState, 'player1')) {
				ball.vx = -ball.vx
				this.updateBallSpeed(gameState);

				const remainingRatio = 1 - ratioToPaddle;
				ball.x += ball.vx * remainingRatio;
				this.checkCollisionY(gameState, remainingRatio);
				
				return;
			}
		}
			//	tunneling right
		if (ball.vx > 0 && ball.x <= PADDLE_RIGHT_X && targetX >= PADDLE_RIGHT_X) {
			const distanceToPaddle = PADDLE_RIGHT_X - ball.x;
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;
			
			ball.x = PADDLE_RIGHT_X;
			this.checkCollisionY(gameState, ratioToPaddle);

			if (this.checkPaddleCollision(gameState, 'player2')) {
				ball.vx = -ball.vx;
				this.updateBallSpeed(gameState);
				
				const remainingRatio = 1 - ratioToPaddle;
				ball.x += ball.vx * remainingRatio;
				this.checkCollisionY(gameState, remainingRatio);

				return;
			}
		}

		//	---	NO TUNNELLING	---
		ball.x = targetX;
		this.checkCollisionY(gameState, 1);
	}

	protected checkCollisionY(gameState: GameState, distanceToRun: number) {
		const ball = gameState.ball;

		ball.y += ball.vy * distanceToRun;

		while (ball.y < 0 || ball.y > 100) {
			if (ball.y > 100) {
				const diff = ball.y - 100;
				ball.y = 100 - diff;
				ball.vy = -ball.vy;
			}
			else if (ball.y < 0) {
				const diff = ball.y;
				ball.y = -diff;
				ball.vy = -ball.vy;
			}
		}
	}
}