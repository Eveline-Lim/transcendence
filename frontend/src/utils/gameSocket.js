/**
 * Game-service Socket.IO manager.
 *
 * The game service runs a Socket.IO server.  The API gateway validates the JWT
 * (passed as ?token= query param) and injects X-User-Id / X-Username headers
 * before upgrading the connection.
 *
 * Client → Server events:
 *   "join-game"     – no payload; must be emitted once after connecting
 *   "paddle-input"  – { action: "up-pressed"|"up-released"|"down-pressed"|"down-released" }
 *
 * Server → Client events:
 *   "joined-game"   – { game_id: string, game_state: GameState }
 *   "game-start"    – { message: string, game_state: GameState }
 *   "game-update"   – { ball, paddles, score, status, winner? }
 *   "game-over"     – { message: string, winner: string, game_state: GameState }
 *   "error"         – { message: string }
 *
 * GameState shape (all coordinates are percentages 0–100):
 *   { gameId, player1_id, player2_id, status, score: {player1, player2},
 *     ball: {x, y, vx, vy}, paddles: {player1, player2},
 *     inputs, created_at, winner? }
 */

import { io } from "socket.io-client";

/** Socket.IO path as configured in nginx (proxied to game_service:3001). */
const SOCKET_IO_PATH = "/socket.io/";

export class GameSocket {
	/** @type {import("socket.io-client").Socket | null} */
	_socket = null;

	/**
	 * Connect to the game service.
	 * The JWT is passed as a query parameter so the API gateway can validate it.
	 * @returns {import("socket.io-client").Socket}
	 */
	connect() {
		const token = localStorage.getItem("token");
		if (!token) throw new Error("No auth token");

		this._socket = io(window.location.origin, {
			path: SOCKET_IO_PATH,
			transports: ["websocket"],
			query: { token },
		});

		return this._socket;
	}

	/** Emit join-game to let the server attach us to our game room. */
	joinGame() {
		this._socket?.emit("join-game");
	}

	/**
	 * Send a paddle input action.
	 * @param {"up-pressed"|"up-released"|"down-pressed"|"down-released"} action
	 */
	sendPaddleInput(action) {
		this._socket?.emit("paddle-input", { action });
	}

	/**
	 * Register a listener for a named Socket.IO event.
	 * @param {string} event
	 * @param {Function} fn
	 * @returns {this}
	 */
	on(event, fn) {
		this._socket?.on(event, fn);
		return this;
	}

	/** Remove a listener. */
	off(event, fn) {
		this._socket?.off(event, fn);
	}

	/** Disconnect from the game service. */
	disconnect() {
		this._socket?.disconnect();
		this._socket = null;
	}
}
