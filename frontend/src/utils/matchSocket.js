/**
 * Match-service WebSocket manager.
 *
 * Protocol:
 *   The API gateway validates the JWT (passed as ?token= query param) and
 *   injects X-User-Id / X-Username headers before forwarding to the service.
 *
 * Client → Server frames  (JSON, tagged by `event`):
 *   { event: "join_queue",  data: { gameMode: "casual" | "ranked" } }
 *   { event: "leave_queue" }
 *
 * Server → Client frames:
 *   { event: "queue_update", data: { playersWaiting: number, estimatedWaitTime: number } }
 *   { event: "match_found",  data: { matchId: string, gameEngineUrl: string,
 *                                     opponent: { username: string, avatarUrl?: string } } }
 */

const WS_PATH = "/ws/match";

export class MatchSocket {
	/** @type {WebSocket | null} */
	_ws = null;
	/** @type {Record<string, Function[]>} */
	_listeners = {};

	/**
	 * Connect to the match service and immediately join the queue.
	 * @param {"casual"|"ranked"} gameMode
	 * @returns {Promise<void>}
	 */
	connect(gameMode = "casual") {
		const token = localStorage.getItem("token");
		if (!token) return Promise.reject(new Error("No auth token"));

		const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
		const url = `${proto}//${window.location.host}${WS_PATH}?token=${encodeURIComponent(token)}`;

		return new Promise((resolve, reject) => {
			this._ws = new WebSocket(url);

			this._ws.onopen = () => {
				this._emit("open");
				this.joinQueue(gameMode);
				resolve();
			};

			this._ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.event) {
						this._emit(msg.event, msg.data);
					}
				} catch {
					// ignore malformed frames
				}
			};

			this._ws.onclose = (e) => {
				this._emit("close", e);
			};

			this._ws.onerror = (e) => {
				this._emit("error", e);
				reject(e);
			};
		});
	}

	/** Send a join_queue message. */
	joinQueue(gameMode = "casual") {
		this._send({ event: "join_queue", data: { gameMode } });
	}

	/** Send a leave_queue message. */
	leaveQueue() {
		this._send({ event: "leave_queue" });
	}

	/**
	 * Register a listener for a named event.
	 * Events: "open" | "close" | "error" | "queue_update" | "match_found"
	 * @param {string} event
	 * @param {Function} fn
	 * @returns {this}
	 */
	on(event, fn) {
		if (!this._listeners[event]) this._listeners[event] = [];
		this._listeners[event].push(fn);
		return this;
	}

	/** Remove a previously registered listener. */
	off(event, fn) {
		if (this._listeners[event]) {
			this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
		}
	}

	/** Close the WebSocket connection. */
	disconnect() {
		if (this._ws) {
			this._ws.onclose = null; // suppress close event after intentional disconnect
			this._ws.close();
			this._ws = null;
		}
	}

	// ─── private ────────────────────────────────────────────────────────────────

	_send(payload) {
		if (this._ws?.readyState === WebSocket.OPEN) {
			this._ws.send(JSON.stringify(payload));
		}
	}

	_emit(event, data) {
		(this._listeners[event] || []).forEach((fn) => fn(data));
	}
}
