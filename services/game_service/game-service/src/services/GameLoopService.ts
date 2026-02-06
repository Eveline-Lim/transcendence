  /***********/
 /*	IMPORT	*/
/***********/

import { Server } from 'socket.io';
import { redis } from './RedisInstance';
import { GameState } from '../models/GameState';
import {
	BALL_RADIUS,
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_LEFT_X,
	PADDLE_RIGHT_X,
	MAX_BOUNCE_ANGLE } from '../config/env'

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
			this.checkCollisionsX(gameState);
			// this.checkScore(gameState);

		}
		catch(error) {
			console.error(`Error in game loop for ${gameId}:`, error);
			// this.stopGameLoop(gameId);
		}
	}

	protected updatePaddles(gameState: GameState) {

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
		

		const paddleY = player === 'player1' ? gameState.paddles.player1 : gameState.paddles.player2;

		const paddleTop = paddleY - (PADDLE_HEIGHT / 2);
		const paddleBottom = paddleY + (PADDLE_HEIGHT / 2);

		if (ball.y >= paddleTop && ball.y <= paddleBottom) {
			// if error, check if the value is higher than 1 or less than -1
			const relativeImpact = (ball.y - paddleY) / (PADDLE_HEIGHT / 2);
			ball.vy = relativeImpact * MAX_BOUNCE_ANGLE;
			return true;
		}
		return false;
		// return ball.y >= paddleTop && ball.y <= paddleBottom;
	}

	protected updateBallSpeed(gameState: GameState) {
		const ball = gameState.ball;
		const boostSpeed = ball.vx > 0 ? 0.05 : -0.05;
		ball.vx += boostSpeed;
	}

	protected updateBall(gameState: GameState) {

		const ball = gameState.ball;
		

		const targetX = ball.x + ball.vx;

		// ---	CHECK IF TUNNELING	---
			//	tunneling left
		if (ball.vx < 0 &&
			ball.x - BALL_RADIUS >= PADDLE_LEFT_X &&
			targetX - BALL_RADIUS <= PADDLE_LEFT_X) {
			
			const distanceToPaddle = ball.x - BALL_RADIUS - PADDLE_LEFT_X;
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;

			ball.x = PADDLE_LEFT_X + BALL_RADIUS;
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
		if (ball.vx > 0 &&
			ball.x + BALL_RADIUS <= PADDLE_RIGHT_X &&
			targetX + BALL_RADIUS >= PADDLE_RIGHT_X) {
			
			const distanceToPaddle = PADDLE_RIGHT_X - (ball.x + BALL_RADIUS);
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;
			
			ball.x = PADDLE_RIGHT_X - BALL_RADIUS;
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

		while (ball.y < 0 + BALL_RADIUS || ball.y > 100 - BALL_RADIUS) {
			if (ball.y > 100 - BALL_RADIUS) {
				const limit = 100 - BALL_RADIUS;
				const diff = ball.y - limit;
				ball.y = limit - diff;
				ball.vy = -ball.vy;
			}
			else if (ball.y < 0 + BALL_RADIUS) {
				const limit = BALL_RADIUS;
				const diff = ball.y + limit;
				ball.y = limit - diff;
				ball.vy = -ball.vy;
			}
		}
	}

	protected resetBall(gameState: GameState) {
		gameState.ball.x = 50;
		gameState.ball.y = 50;

		const direction = Math.random() > 0.5 ? 1 : -1;
		gameState.ball.vx = 0.5 * direction;
		gameState.ball.vy = (Math.random() - 0.5) * 0.5;
	}

	protected checkCollisionsX(gameState: GameState): boolean {
		
		const ball = gameState.ball.x;
		if (ball - BALL_RADIUS < 0) {
			gameState.score.player2++;
			this.resetBall(gameState);
			return true;
		}

		if (ball + BALL_RADIUS > 100) {
			gameState.score.player1++;
			this.resetBall(gameState);
			return true ;
		}

		return false;
	}
}
