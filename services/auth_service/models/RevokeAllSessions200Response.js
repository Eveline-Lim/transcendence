class RevokeAllSessionsResponse {
	/**
	 * @param {Object} data
	 * @param {number} data.revokedCount - Number of sessions revoked (required)
	 */
	constructor(data = {}) {
		this.revokedCount = data.revokedCount;
	}

	static RequiredProperties = ['revokedCount'];

	/**
	 * Create from plain object
	 * @param {Object} data
	 * @returns {RevokeAllSessionsResponse}
	 */
	static from(data) {
		return new RevokeAllSessionsResponse(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {RevokeAllSessionsResponse}
	 */
	static validate(data) {
		for (const field of RevokeAllSessionsResponse.RequiredProperties) {
			if (data[field] === undefined || data[field] === null) {
				throw new Error(`The required field \`${field}\` is missing`);
			}
		}

		if (typeof data.revokedCount !== 'number') {
			throw new Error(
				`Expected field \`revokedCount\` to be a number, got ${typeof data.revokedCount}`
			);
		}

		return new RevokeAllSessionsResponse(data);
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			revokedCount: this.revokedCount,
		};
	}
}

export default RevokeAllSessionsResponse;
