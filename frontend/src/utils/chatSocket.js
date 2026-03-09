/**
 * Chat WebSocket manager.
 *
 * Authentication flow:
 * The API gateway validates the JWT (passed as a ?token= query parameter
 * since the browser WebSocket API cannot send custom headers) and forwards
 * the authenticated user's identity via X-User-Id / X-Username headers
 * to the chat service.
 *
 * Inbound frames:
 *   - ChatMessage  { messageId, senderId, senderUsername, content, sentAt }
 *   - ChatError    { code, message }
 */

const WS_PATH = "/ws/chat";

export class ChatSocket {
	/** @type {WebSocket | null} */
	_ws = null;
	/** @type {Function[]} */
	_messageListeners = [];
	/** @type {Function[]} */
	_errorListeners = [];
	/** @type {Function[]} */
	_closeListeners = [];
	/** @type {Function[]} */
	_openListeners = [];
	_reconnectTimer = null;
	_shouldReconnect = false;

	/**
	 * Open the WebSocket connection.
	 * The JWT is passed as a query parameter for the API gateway to validate.
	 * @returns {Promise<void>}
	 */
	async connect() {
		const token = localStorage.getItem("token");
		if (!token) throw new Error("No auth token");

		const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
		const url = `${proto}//${window.location.host}${WS_PATH}?token=${encodeURIComponent(token)}`;

		return new Promise((resolve, reject) => {
			this._ws = new WebSocket(url);
			this._shouldReconnect = true;
			let didOpen = false;

			this._ws.onopen = () => {
				didOpen = true;
				this._openListeners.forEach((fn) => fn());
				resolve();
			};

			this._ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					// Distinguish error frames from message frames
					if (data.code && data.message && !data.messageId) {
						this._errorListeners.forEach((fn) => fn(data));
					} else {
						this._messageListeners.forEach((fn) => fn(data));
					}
				} catch {
					// non-JSON frame – ignore
				}
			};

			this._ws.onerror = (err) => {
				if (!didOpen) {
					// Connection was never established — likely rejected by the gateway (401/403).
					// Disable auto-reconnect so we don't spam the server.
					this._shouldReconnect = false;
				}
				reject(err);
			};

			this._ws.onclose = (event) => {
				this._closeListeners.forEach((fn) => fn());
				// Reconnect only for unexpected drops on established connections.
				// code 1000 = clean close, 1006 = abnormal (never opened / rejected)
				const shouldRetry = this._shouldReconnect && didOpen && event.code !== 1000;
				if (shouldRetry) {
					this._reconnectTimer = setTimeout(() => this.connect().catch(() => {}), 3000);
				}
			};
		});
	}

	disconnect() {
		this._shouldReconnect = false;
		clearTimeout(this._reconnectTimer);
		if (this._ws) {
			// Only close if not already closing/closed.
			// Calling close() on a CONNECTING socket triggers a browser warning;
			// we still close it but swallow any resulting errors.
			try { this._ws.close(); } catch { /* ignore */ }
			this._ws = null;
		}
	}

	/** @param {(msg: object) => void} fn */
	onMessage(fn) {
		this._messageListeners.push(fn);
		return () => { this._messageListeners = this._messageListeners.filter((l) => l !== fn); };
	}

	/** @param {(err: object) => void} fn */
	onError(fn) {
		this._errorListeners.push(fn);
		return () => { this._errorListeners = this._errorListeners.filter((l) => l !== fn); };
	}

	/** @param {() => void} fn */
	onClose(fn) {
		this._closeListeners.push(fn);
		return () => { this._closeListeners = this._closeListeners.filter((l) => l !== fn); };
	}

	/** @param {() => void} fn */
	onOpen(fn) {
		this._openListeners.push(fn);
		return () => { this._openListeners = this._openListeners.filter((l) => l !== fn); };
	}

	get connected() {
		return this._ws?.readyState === WebSocket.OPEN;
	}
}

/** Singleton instance shared across the app */
export const chatSocket = new ChatSocket();
