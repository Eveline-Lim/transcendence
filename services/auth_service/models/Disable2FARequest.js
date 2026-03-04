class Disable2FARequest {
	/**
	 * @param {Object} data
	 * @param {string} data.code - Current 6-digit TOTP code (required)
	 * @param {string} data.password - Current password (required)
	 */
	constructor(data = {}) {
		this.code = data.code;
		this.password = data.password;
	}

	static RequiredProperties = ['code', 'password'];

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {Disable2FARequest}
	 */
	static from(data) {
		return new Disable2FARequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {Disable2FARequest}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid request body');
		}

		// Validate code
		if (typeof data.code !== 'string' || data.code.trim() === '') {
			throw new Error('The required field `code` is missing or not a valid string');
		}

		// // Strict 6-digit numeric validation
		// if (!/^\d{6}$/.test(data.code)) {
		// 	throw new Error('`code` must be a 6-digit numeric string');
		// }

		// // Validate password
		// if (typeof data.password !== 'string' || data.password.trim() === '') {
		// 	throw new Error('The required field `password` is missing or not a valid string');
		// }

		return new Disable2FARequest(data);
	}

	/**
	 * Serialize to plain object
	 */
	toJSON() {
		return {
			code: this.code,
			password: this.password,
		};
	}
}

export default Disable2FARequest;
