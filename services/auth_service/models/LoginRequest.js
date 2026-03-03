class LoginRequest {
	/**
	 * @param {Object} data
	 * @param {string} data.identifier - Email or username (required)
	 * @param {string} data.password - (required)
	 */
	constructor(data = {}) {
		this.identifier = data.identifier;
		this.password   = data.password;
	}

	static RequiredProperties = ['identifier', 'password'];

	/**
	 * Create a LoginRequest from a plain object
	 * @param {Object} data
	 * @returns {LoginRequest}
	 */
	static from(data) {
		return new LoginRequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {LoginRequest}
	 */
	static validate(data) {
		for (const field of LoginRequest.RequiredProperties) {
			if (!data[field]) {
				throw new Error(`The required field \`${field}\` is missing or empty`);
			}
		}
		for (const field of LoginRequest.RequiredProperties) {
			if (typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		return new LoginRequest(data);
	}

	/**
	 * Serialize to a plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			identifier: this.identifier,
			password: this.password,
		};
	}
}

export default LoginRequest;
