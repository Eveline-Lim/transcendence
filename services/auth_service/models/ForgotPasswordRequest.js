class ForgotPasswordRequest {
	/**
	 * @param {Object} data
	 * @param {string} data.email - (required)
	 */
	constructor(data = {}) {
		this.email = data.email;
	}

	static RequiredProperties = ['email'];

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {ForgotPasswordRequest}
	 */
	static fromObject(data) {
		return new ForgotPasswordRequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {ForgotPasswordRequest}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid request body');
		}

		for (const field of ForgotPasswordRequest.RequiredProperties) {
			if (data[field].trim() === '') {
				throw new Error(`The required field \`${field}\` is missing or not a valid string`);
			}
		}
		for (const field of ForgotPasswordRequest.RequiredProperties) {
			if (typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		return new ForgotPasswordRequest(data);
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			email: this.email,
		};
	}
}

export default ForgotPasswordRequest;
