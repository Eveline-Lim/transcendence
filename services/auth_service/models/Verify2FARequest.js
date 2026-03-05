class Verify2FARequest {
	/**
	 * @param {Object} data
	 * @param {string} data.code - 6-digit TOTP code (required)
	 */
	constructor(data = {}) {
		this.code = data.code;
	}

	static RequiredProperties = ['code'];

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {Verify2FARequest}
	 */
	static from(data) {
		return new Verify2FARequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {Verify2FARequest}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid request body');
		}

		if (typeof data.code !== 'string' || data.code.trim() === '') {
			throw new Error('The required field `code` is missing or not a valid string');
		}

		// // Optional: strict 6-digit TOTP validation
		// if (!/^\d{6}$/.test(data.code)) {
		// 	throw new Error('`code` must be a 6-digit numeric string');
		// }

		return new Verify2FARequest(data);
	}

	/**
	 * Serialize to plain object
	 */
	toJSON() {
		return {
			code: this.code,
		};
	}
}

export default Verify2FARequest;
