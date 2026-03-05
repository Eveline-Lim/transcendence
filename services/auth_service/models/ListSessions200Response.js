import Session from "../models/Session.js"

class ListSessionsResponse {
	/**
	 * @param {Object} data
	 * @param {Array<Object|Session>} data.sessions - Array of sessions
	 */
	constructor(data = {}) {
		this.sessions = Array.isArray(data.sessions) ? data.sessions.map((session) =>
			session instanceof Session ? session : Session.from(session)): [];
	}

	static RequiredProperties = ['sessions'];

	/**
	 * Create from plain object
	 * @param {Object} data
	 * @returns {ListSessionsResponse}
	 */
	static from(data) {
		return new ListSessionsResponse(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {ListSessionsResponse}
	 */
	static validate(data) {
		if (!data.sessions) {
			throw new Error('The required field `sessions` is missing');
		}

		if (!Array.isArray(data.sessions)) {
			throw new Error('Expected field `sessions` to be an array');
		}

		const validatedSessions = data.sessions.map((session) => Session.validate(session));

		return new ListSessionsResponse({ sessions: validatedSessions });
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			sessions: this.sessions.map((session) =>
				typeof session.toJSON === 'function' ? session.toJSON() : session
			),
		};
	}
}

export default ListSessionsResponse;
