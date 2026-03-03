class ResetPasswordRequest {
	/**
	 * @param {Object} data
	 * @param {string} data.token - Password reset token (required)
	 * @param {string} data.password - New password (required)
	 */
	constructor(data = {}) {
		this.token = data.token;
		this.password = data.password;
	}

	static RequiredProperties = ['token', 'password'];

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {ResetPasswordRequest}
	 */
	static from(data) {
		return new ResetPasswordRequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {ResetPasswordRequest}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid request body');
		}

		for (const field of ResetPasswordRequest.RequiredProperties) {
			if (data[field].trim() === '') {
				throw new Error(`The required field \`${field}\` is missing or not a valid string`
				);
			}
		}
		for (const field of ResetPasswordRequest.RequiredProperties) {
			if (typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		return new ResetPasswordRequest(data);
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			token: this.token,
			password: this.password,
		};
	}
}

export default ResetPasswordRequest;
