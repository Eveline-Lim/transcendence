/**
 * Client-side game engine mirroring the game-service physics.
 * Used for offline (local 2-player) and AI modes – no backend needed.
 *
 * Constants duplicated from services/game_service/game-service/src/config/env.ts
 */

const BALL_RADIUS = 1;
const PADDLE_SPEED = 2;
const PADDLE_HEIGHT = 15;
const PADDLE_WIDTH = 1.5;
const PADDLE_LEFT_X = 5;
const PADDLE_RIGHT_X = 95;
const MAX_BOUNCE_ANGLE = 2;
const WINNING_SCORE = 11;

function createInitialState() {
	const direction = Math.random() > 0.5 ? 1 : -1;
	return {
		ball: { x: 50, y: 50, vx: 0.5 * direction, vy: (Math.random() - 0.5) * 0.5 },
		paddles: { player1: 50, player2: 50 },
		score: { player1: 0, player2: 0 },
		inputs: {
			player1_up: false, player1_down: false,
			player2_up: false, player2_down: false,
		},
		status: "playing",
		winner: null,
	};
}

/**
 * Runs the Pong game loop entirely in the browser.
 *
 * @param {(state: object) => void} onUpdate   – called every tick (~60 fps)
 * @param {(state: object) => void} onGameOver – called once when a player reaches WINNING_SCORE
 * @param {SimpleAI | null}         ai         – optional AI controlling player 2
 */
export class LocalGameEngine {
	constructor(onUpdate, onGameOver, ai = null) {
		this._onUpdate = onUpdate;
		this._onGameOver = onGameOver;
		this._ai = ai;
		this._state = createInitialState();
		this._interval = null;
	}

	getState() {
		return this._state;
	}

	start() {
		if (this._interval) return;
		this._state = createInitialState();
		this._interval = setInterval(() => this._tick(), 16);
	}

	stop() {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
	}

	/** @param {"player1_up"|"player1_down"|"player2_up"|"player2_down"} key */
	setInput(key, value) {
		this._state.inputs[key] = value;
	}

	// ── Physics (mirrors GameLoopService) ─────────────────────────────────────

	_tick() {
		const gs = this._state;
		if (gs.status !== "playing") { this.stop(); return; }

		if (this._ai) {
			const { up, down } = this._ai.update(gs);
			gs.inputs.player2_up = up;
			gs.inputs.player2_down = down;
		}

		this._updatePaddles(gs);
		this._updateBall(gs);
		this._checkCollisionsX(gs);
		this._checkScore(gs);

		this._onUpdate(gs);

		if (gs.status === "finished") {
			this.stop();
			this._onGameOver(gs);
		}
	}

	_updatePaddles(gs) {
		if (gs.inputs.player1_up)   gs.paddles.player1 -= PADDLE_SPEED;
		if (gs.inputs.player1_down) gs.paddles.player1 += PADDLE_SPEED;
		if (gs.inputs.player2_up)   gs.paddles.player2 -= PADDLE_SPEED;
		if (gs.inputs.player2_down) gs.paddles.player2 += PADDLE_SPEED;

		const limits = PADDLE_HEIGHT / 2;
		gs.paddles.player1 = Math.max(limits, Math.min(100 - limits, gs.paddles.player1));
		gs.paddles.player2 = Math.max(limits, Math.min(100 - limits, gs.paddles.player2));
	}

	_checkPaddleCollision(gs, player) {
		const ball = gs.ball;
		const paddleY = player === "player1" ? gs.paddles.player1 : gs.paddles.player2;
		const top = paddleY - PADDLE_HEIGHT / 2;
		const bot = paddleY + PADDLE_HEIGHT / 2;

		if (ball.y + BALL_RADIUS >= top && ball.y - BALL_RADIUS <= bot) {
			ball.vy = ((ball.y - paddleY) / (PADDLE_HEIGHT / 2)) * MAX_BOUNCE_ANGLE;
			return true;
		}
		return false;
	}

	_updateBallSpeed(gs) {
		gs.ball.vx += gs.ball.vx > 0 ? 0.05 : -0.05;
	}

	_checkCollisionY(gs, ratio) {
		const ball = gs.ball;
		ball.y += ball.vy * ratio;

		while (ball.y < BALL_RADIUS || ball.y > 100 - BALL_RADIUS) {
			if (ball.y > 100 - BALL_RADIUS) {
				const limit = 100 - BALL_RADIUS;
				ball.y = limit - (ball.y - limit);
				ball.vy = -ball.vy;
			} else if (ball.y < BALL_RADIUS) {
				const limit = BALL_RADIUS;
				ball.y = limit + (limit - ball.y);
				ball.vy = -ball.vy;
			}
		}
	}

	_updateBall(gs) {
		const ball = gs.ball;
		const targetX = ball.x + ball.vx;

		// Collision surfaces at the front face of each paddle
		const collisionLeftX = PADDLE_LEFT_X + PADDLE_WIDTH / 2;
		const collisionRightX = PADDLE_RIGHT_X - PADDLE_WIDTH / 2;

		// Tunneling check — left paddle
		if (ball.vx < 0 && ball.x - BALL_RADIUS >= collisionLeftX && targetX - BALL_RADIUS <= collisionLeftX) {
			const ratio = (ball.x - BALL_RADIUS - collisionLeftX) / Math.abs(ball.vx);
			ball.x = collisionLeftX + BALL_RADIUS;
			this._checkCollisionY(gs, ratio);

			if (this._checkPaddleCollision(gs, "player1")) {
				ball.vx = -ball.vx;
				this._updateBallSpeed(gs);
				const rem = 1 - ratio;
				ball.x += ball.vx * rem;
				this._checkCollisionY(gs, rem);
				return;
			}
			// Paddle missed – apply remaining movement only
			ball.x = targetX;
			this._checkCollisionY(gs, 1 - ratio);
			return;
		}

		// Tunneling check — right paddle
		if (ball.vx > 0 && ball.x + BALL_RADIUS <= collisionRightX && targetX + BALL_RADIUS >= collisionRightX) {
			const ratio = (collisionRightX - (ball.x + BALL_RADIUS)) / Math.abs(ball.vx);
			ball.x = collisionRightX - BALL_RADIUS;
			this._checkCollisionY(gs, ratio);

			if (this._checkPaddleCollision(gs, "player2")) {
				ball.vx = -ball.vx;
				this._updateBallSpeed(gs);
				const rem = 1 - ratio;
				ball.x += ball.vx * rem;
				this._checkCollisionY(gs, rem);
				return;
			}
			// Paddle missed – apply remaining movement only
			ball.x = targetX;
			this._checkCollisionY(gs, 1 - ratio);
			return;
		}

		ball.x = targetX;
		this._checkCollisionY(gs, 1);
	}

	_resetBall(gs) {
		gs.ball.x = 50;
		gs.ball.y = 50;
		const dir = Math.random() > 0.5 ? 1 : -1;
		gs.ball.vx = 0.5 * dir;
		gs.ball.vy = (Math.random() - 0.5) * 0.5;
	}

	_checkCollisionsX(gs) {
		if (gs.ball.x - BALL_RADIUS < 0) {
			gs.score.player2++;
			this._resetBall(gs);
		} else if (gs.ball.x + BALL_RADIUS > 100) {
			gs.score.player1++;
			this._resetBall(gs);
		}
	}

	_checkScore(gs) {
		if (gs.score.player1 >= WINNING_SCORE) {
			gs.winner = "player1";
			gs.status = "finished";
		} else if (gs.score.player2 >= WINNING_SCORE) {
			gs.winner = "player2";
			gs.status = "finished";
		}
	}
}

/**
 * Minimal AI opponent – tracks the ball's Y position.
 * @param {number} difficulty  0–1; higher = more responsive
 */
export class SimpleAI {
	constructor(difficulty = 0.7) {
		this._difficulty = difficulty;
		this._targetY = 50;
	}

	/** @returns {{ up: boolean, down: boolean }} */
	update(gs) {
		// Only track when ball is heading toward the AI (right side)
		if (gs.ball.vx > 0) {
			this._targetY = gs.ball.y;
		}

		const diff = this._targetY - gs.paddles.player2;
		const deadzone = 3 * (1 - this._difficulty);

		if (Math.abs(diff) < deadzone) return { up: false, down: false };
		return { up: diff < 0, down: diff > 0 };
	}
}
