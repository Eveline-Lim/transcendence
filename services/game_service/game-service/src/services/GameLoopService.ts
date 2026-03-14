  /***********/
 /*	IMPORT	*/
/***********/

import { Server } from 'socket.io';
import { redis } from './RedisInstance';
import { GameState } from '../models/GameState';
import { PlayerServiceClient } from './PlayerServiceClient';
import { AIServiceClient } from './AIServiceClient';
import {
	BALL_RADIUS,
	PADDLE_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_LEFT_X,
	PADDLE_RIGHT_X,
	MAX_BOUNCE_ANGLE,
	WINNING_SCORE } from '../config/env'

  /***********/
 /*	CLASS	*/
/***********/

export class GameLoopService {
	private io: Server;
	// ID loop
	private activeLoops: Map<string, NodeJS.Timeout> = new Map();
	// Cache in RAM – also written to directly by WebsocketService for player inputs
	private gameStatesCache: Map<string, GameState> = new Map();

	// AI integration
	private aiClient: AIServiceClient;
	private aiTargets: Map<string, number>      = new Map(); // gameId → target paddle Y
	private aiPending: Set<string>              = new Set(); // games with in-flight gRPC requests
	private aiTickCounters: Map<string, number> = new Map(); // tick counter per game

	constructor(io: Server) {
		this.io = io;
		this.aiClient = new AIServiceClient();
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
			//Don't forget to protect tic
			await this.gameLoopTick(gameId);
		}, 16);

		this.activeLoops.set(gameId, interval);
	}

	/**
	 * Returns the cached game state so other services (e.g. WebsocketService)
	 * can write inputs directly into it without a Redis round-trip.
	 */
	getCachedGameState(gameId: string): GameState | undefined {
		return this.gameStatesCache.get(gameId);
	}

	async stopGameLoop(gameId: string) {
		const interval = this.activeLoops.get(gameId);
		if (interval) {
			clearInterval(interval);
			this.activeLoops.delete(gameId);
			this.gameStatesCache.delete(gameId);
			this.aiTargets.delete(gameId);
			this.aiPending.delete(gameId);
			this.aiTickCounters.delete(gameId);
			console.log(`Stopped game loop for ${gameId}`);
		}
	}

	private async gameLoopTick(gameId: string) {
		try {
			const gameState = this.gameStatesCache.get(gameId);

			if(!gameState || gameState.status !== 'playing') {

				if (gameState!.status === 'waiting') {
					// set timer 30 secondes ?
					return ;
				}
				this.stopGameLoop(gameId);
				return;
			}

			this.updatePaddles(gameState);
			if (gameState.game_mode === 'ai') {
				this.driveAIPaddle(gameId, gameState);
			}
			this.updateBall(gameState);

			const pointScored = this.checkCollisionsX(gameState);
			if (pointScored) {
				await redis!.updateGameState(gameId, gameState);
			}
			
			const gameFinished = this.checkScore(gameState);
			if (gameFinished) {
				gameState.status = 'finished';
				await redis!.updateGameState(gameId, gameState);

				// Report match result to player service
				this.reportMatchResult(gameState);

				// Emit game-over event
				this.io.to(gameId).emit('game-over', {
					message: 'Game finished!',
					winner: gameState.winner,
					game_state: gameState
				});
			}

			this.io.to(gameId).emit('game-update', {
				ball: gameState.ball,
				paddles: gameState.paddles,
				score: gameState.score,
				status: gameState.status,
				winner: gameState.winner
			});

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
		const limits = PADDLE_HEIGHT / 2;
		gameState.paddles.player1 = Math.max(limits, Math.min(100 - limits, gameState.paddles.player1));
		gameState.paddles.player2 = Math.max(limits, Math.min(100 - limits, gameState.paddles.player2));
	}

	protected checkPaddleCollision(gameState: GameState, player: 'player1' | 'player2'): boolean {
		const ball = gameState.ball;
		

		const paddleY = player === 'player1' ? gameState.paddles.player1 : gameState.paddles.player2;

		const paddleTop = paddleY - (PADDLE_HEIGHT / 2);
		const paddleBottom = paddleY + (PADDLE_HEIGHT / 2);

		// PATCH 1: correction collision surface
		if (ball.y + BALL_RADIUS >= paddleTop && ball.y - BALL_RADIUS <= paddleBottom) {
			// if error, check if the value is higher than 1 or less than -1
			const relativeImpact = (ball.y - paddleY) / (PADDLE_HEIGHT / 2);
			ball.vy = relativeImpact * MAX_BOUNCE_ANGLE;
			return true;
		}
		return false;
	}

	protected updateBallSpeed(gameState: GameState) {
		const ball = gameState.ball;
		const boostSpeed = ball.vx > 0 ? 0.05 : -0.05;
		ball.vx += boostSpeed;
	}

	protected updateBall(gameState: GameState) {

		const ball = gameState.ball;
		

		const targetX = ball.x + ball.vx;

		// Collision surfaces at the front face of each paddle
		const collisionLeftX = PADDLE_LEFT_X + PADDLE_WIDTH / 2;
		const collisionRightX = PADDLE_RIGHT_X - PADDLE_WIDTH / 2;

		// ---	CHECK IF TUNNELING	---
			//	tunneling left
		if (ball.vx < 0 &&
			ball.x - BALL_RADIUS >= collisionLeftX &&
			targetX - BALL_RADIUS <= collisionLeftX) {
			
			const distanceToPaddle = ball.x - BALL_RADIUS - collisionLeftX;
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;

			ball.x = collisionLeftX + BALL_RADIUS;
			this.checkCollisionY(gameState, ratioToPaddle);

			if (this.checkPaddleCollision(gameState, 'player1')) {
				ball.vx = -ball.vx;
				this.updateBallSpeed(gameState);

				const remainingRatio = 1 - ratioToPaddle;
				ball.x += ball.vx * remainingRatio;
				this.checkCollisionY(gameState, remainingRatio);
				
				return;
			}
			// Paddle missed – apply remaining movement only
			ball.x = targetX;
			this.checkCollisionY(gameState, 1 - ratioToPaddle);
			return;
		}
			//	tunneling right
		if (ball.vx > 0 &&
			ball.x + BALL_RADIUS <= collisionRightX &&
			targetX + BALL_RADIUS >= collisionRightX) {
			
			const distanceToPaddle = collisionRightX - (ball.x + BALL_RADIUS);
			const totalDistance = Math.abs(ball.vx);
			const ratioToPaddle = distanceToPaddle / totalDistance;
			
			ball.x = collisionRightX - BALL_RADIUS;
			this.checkCollisionY(gameState, ratioToPaddle);

			if (this.checkPaddleCollision(gameState, 'player2')) {
				ball.vx = -ball.vx;
				this.updateBallSpeed(gameState);
				
				const remainingRatio = 1 - ratioToPaddle;
				ball.x += ball.vx * remainingRatio;
				this.checkCollisionY(gameState, remainingRatio);

				return;
			}
			// Paddle missed – apply remaining movement only
			ball.x = targetX;
			this.checkCollisionY(gameState, 1 - ratioToPaddle);
			return;
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
				const diff = limit - ball.y;
				ball.y = limit + diff;
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

	protected checkScore(gameState: GameState): boolean {
		
		if (gameState.score.player1 === WINNING_SCORE) {
			gameState.winner = gameState.player1_id;
			return true;
		}
		else if (gameState.score.player2 === WINNING_SCORE) {
			gameState.winner = gameState.player2_id;
			return true;
		}
		return false;
	}

	/**
	 * Move the AI paddle one step toward the cached target_y.
	 * Every AI_UPDATE_INTERVAL ticks a new gRPC GetMove request is fired
	 * so the target refreshes without blocking the loop.
	 */
	private driveAIPaddle(gameId: string, gameState: GameState): void {
		// Harder difficulties poll more frequently: Impossible=1, Hard=3, default=6
		const difficulty = gameState.ai_difficulty ?? 2;
		const AI_UPDATE_INTERVAL = difficulty >= 4 ? 1 : difficulty >= 3 ? 3 : 6;

		// Move paddle toward the cached target
		const targetY   = this.aiTargets.get(gameId) ?? gameState.paddles.player2;
		const currentY  = gameState.paddles.player2;
		const diff      = targetY - currentY;

		if (Math.abs(diff) > PADDLE_SPEED) {
			gameState.paddles.player2 += diff > 0 ? PADDLE_SPEED : -PADDLE_SPEED;
		} else {
			gameState.paddles.player2 = targetY;
		}

		// Clamp within bounds
		const limit = PADDLE_HEIGHT / 2;
		gameState.paddles.player2 = Math.max(limit, Math.min(100 - limit, gameState.paddles.player2));

		// Periodically request a fresh AI move (fire-and-forget)
		const tick = (this.aiTickCounters.get(gameId) ?? 0) + 1;
		this.aiTickCounters.set(gameId, tick);

		if (tick % AI_UPDATE_INTERVAL === 0 && !this.aiPending.has(gameId)) {
			this.aiPending.add(gameId);
			this.aiClient
				.getMove(gameState, gameState.ai_difficulty ?? 2)
				.then((move) => {
					this.aiTargets.set(gameId, move.target_y);
				})
				.catch((err) => {
					console.error(`AI GetMove error for game ${gameId}:`, err);
				})
				.finally(() => {
					this.aiPending.delete(gameId);
				});
		}
	}

	/**
	 * Report the match result to the player service (fire-and-forget).
	 * Skipped for AI games since there is no real opponent to record.
	 */
	private reportMatchResult(gameState: GameState): void {
		if (gameState.game_mode === 'ai') return;
		const winnerId = gameState.winner!;
		const loserId = winnerId === gameState.player1_id
			? gameState.player2_id
			: gameState.player1_id;
		const winnerScore = winnerId === gameState.player1_id
			? gameState.score.player1
			: gameState.score.player2;
		const loserScore = winnerId === gameState.player1_id
			? gameState.score.player2
			: gameState.score.player1;
		const durationSec = Math.round((Date.now() - gameState.created_at) / 1000);

		PlayerServiceClient.reportMatchResult({
			winnerId,
			loserId,
			winnerScore,
			loserScore,
			gameMode: gameState.game_mode,
			duration: durationSec,
		});
	}
}
