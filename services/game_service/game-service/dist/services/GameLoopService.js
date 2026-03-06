"use strict";
/***********/
/*	IMPORT	*/
/***********/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLoopService = void 0;
const RedisInstance_1 = require("./RedisInstance");
const env_1 = require("../config/env");
/***********/
/*	CLASS	*/
/***********/
class GameLoopService {
    constructor(io) {
        // ID loop
        this.activeLoops = new Map();
        // Cache in RAM – also written to directly by WebsocketService for player inputs
        this.gameStatesCache = new Map();
        this.io = io;
    }
    async startGameLoop(gameId) {
        if (this.activeLoops.has(gameId))
            return;
        console.log(`Starting game loop for ${gameId}`);
        const gameState = await RedisInstance_1.redis.getGameState(gameId);
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
    getCachedGameState(gameId) {
        return this.gameStatesCache.get(gameId);
    }
    async stopGameLoop(gameId) {
        const interval = this.activeLoops.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.activeLoops.delete(gameId);
            this.gameStatesCache.delete(gameId);
            console.log(`Stopped game loop for ${gameId}`);
        }
    }
    async gameLoopTick(gameId) {
        try {
            const gameState = this.gameStatesCache.get(gameId);
            if (!gameState || gameState.status !== 'playing') {
                if (gameState.status === 'waiting') {
                    // set timer 30 secondes ?
                    return;
                }
                this.stopGameLoop(gameId);
                return;
            }
            this.updatePaddles(gameState);
            this.updateBall(gameState);
            const pointScored = this.checkCollisionsX(gameState);
            if (pointScored) {
                await RedisInstance_1.redis.updateGameState(gameId, gameState);
            }
            const gameFinished = this.checkScore(gameState);
            if (gameFinished) {
                gameState.status = 'finished';
                await RedisInstance_1.redis.updateGameState(gameId, gameState);
            }
            this.io.to(gameId).emit('game-update', {
                ball: gameState.ball,
                paddles: gameState.paddles,
                score: gameState.score,
                status: gameState.status,
                winner: gameState.winner
            });
        }
        catch (error) {
            console.error(`Error in game loop for ${gameId}:`, error);
            // this.stopGameLoop(gameId);
        }
    }
    updatePaddles(gameState) {
        // Player 1 (paddle left)
        if (gameState.inputs.player1_up) {
            gameState.paddles.player1 -= env_1.PADDLE_SPEED;
        }
        if (gameState.inputs.player1_down) {
            gameState.paddles.player1 += env_1.PADDLE_SPEED;
        }
        // Player 2 (paddle right)
        if (gameState.inputs.player2_up) {
            gameState.paddles.player2 -= env_1.PADDLE_SPEED;
        }
        if (gameState.inputs.player2_down) {
            gameState.paddles.player2 += env_1.PADDLE_SPEED;
        }
        //	Set limits (0-100%)
        gameState.paddles.player1 = Math.max(0, Math.min(100, gameState.paddles.player1));
        gameState.paddles.player2 = Math.max(0, Math.min(100, gameState.paddles.player2));
    }
    checkPaddleCollision(gameState, player) {
        const ball = gameState.ball;
        const paddleY = player === 'player1' ? gameState.paddles.player1 : gameState.paddles.player2;
        const paddleTop = paddleY - (env_1.PADDLE_HEIGHT / 2);
        const paddleBottom = paddleY + (env_1.PADDLE_HEIGHT / 2);
        if (ball.y >= paddleTop && ball.y <= paddleBottom) {
            // if error, check if the value is higher than 1 or less than -1
            const relativeImpact = (ball.y - paddleY) / (env_1.PADDLE_HEIGHT / 2);
            ball.vy = relativeImpact * env_1.MAX_BOUNCE_ANGLE;
            return true;
        }
        return false;
        // return ball.y >= paddleTop && ball.y <= paddleBottom;
    }
    updateBallSpeed(gameState) {
        const ball = gameState.ball;
        const boostSpeed = ball.vx > 0 ? 0.05 : -0.05;
        ball.vx += boostSpeed;
    }
    updateBall(gameState) {
        const ball = gameState.ball;
        const targetX = ball.x + ball.vx;
        // ---	CHECK IF TUNNELING	---
        //	tunneling left
        if (ball.vx < 0 &&
            ball.x - env_1.BALL_RADIUS >= env_1.PADDLE_LEFT_X &&
            targetX - env_1.BALL_RADIUS <= env_1.PADDLE_LEFT_X) {
            const distanceToPaddle = ball.x - env_1.BALL_RADIUS - env_1.PADDLE_LEFT_X;
            const totalDistance = Math.abs(ball.vx);
            const ratioToPaddle = distanceToPaddle / totalDistance;
            ball.x = env_1.PADDLE_LEFT_X + env_1.BALL_RADIUS;
            this.checkCollisionY(gameState, ratioToPaddle);
            if (this.checkPaddleCollision(gameState, 'player1')) {
                ball.vx = -ball.vx;
                this.updateBallSpeed(gameState);
                const remainingRatio = 1 - ratioToPaddle;
                ball.x += ball.vx * remainingRatio;
                this.checkCollisionY(gameState, remainingRatio);
                return;
            }
        }
        //	tunneling right
        if (ball.vx > 0 &&
            ball.x + env_1.BALL_RADIUS <= env_1.PADDLE_RIGHT_X &&
            targetX + env_1.BALL_RADIUS >= env_1.PADDLE_RIGHT_X) {
            const distanceToPaddle = env_1.PADDLE_RIGHT_X - (ball.x + env_1.BALL_RADIUS);
            const totalDistance = Math.abs(ball.vx);
            const ratioToPaddle = distanceToPaddle / totalDistance;
            ball.x = env_1.PADDLE_RIGHT_X - env_1.BALL_RADIUS;
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
    checkCollisionY(gameState, distanceToRun) {
        const ball = gameState.ball;
        ball.y += ball.vy * distanceToRun;
        while (ball.y < 0 + env_1.BALL_RADIUS || ball.y > 100 - env_1.BALL_RADIUS) {
            if (ball.y > 100 - env_1.BALL_RADIUS) {
                const limit = 100 - env_1.BALL_RADIUS;
                const diff = ball.y - limit;
                ball.y = limit - diff;
                ball.vy = -ball.vy;
            }
            else if (ball.y < 0 + env_1.BALL_RADIUS) {
                const limit = env_1.BALL_RADIUS;
                const diff = limit - ball.y;
                ball.y = limit + diff;
                ball.vy = -ball.vy;
            }
        }
    }
    resetBall(gameState) {
        gameState.ball.x = 50;
        gameState.ball.y = 50;
        const direction = Math.random() > 0.5 ? 1 : -1;
        gameState.ball.vx = 0.5 * direction;
        gameState.ball.vy = (Math.random() - 0.5) * 0.5;
    }
    checkCollisionsX(gameState) {
        const ball = gameState.ball.x;
        if (ball - env_1.BALL_RADIUS < 0) {
            gameState.score.player2++;
            this.resetBall(gameState);
            return true;
        }
        if (ball + env_1.BALL_RADIUS > 100) {
            gameState.score.player1++;
            this.resetBall(gameState);
            return true;
        }
        return false;
    }
    checkScore(gameState) {
        if (gameState.score.player1 === env_1.WINNING_SCORE) {
            gameState.winner = gameState.player1_id;
            return true;
        }
        else if (gameState.score.player2 === env_1.WINNING_SCORE) {
            gameState.winner = gameState.player2_id;
            return true;
        }
        return false;
    }
}
exports.GameLoopService = GameLoopService;
