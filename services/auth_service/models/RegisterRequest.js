class RegisterRequest {
	/**
	 * @param {Object} data
	 * @param {string} data.username - (required)
	 * @param {string} [data.displayName]
	 * @param {string} data.password - Must contain at least one uppercase, lowercase, number, and special character (required)
	 * @param {string} data.email - (required)
	 */
	constructor(data = {}) {
		this.username = data.username;
		this.displayName = data.displayName ?? undefined;
		this.email = data.email;
		this.password = data.password;
	}

	static RequiredProperties = ['username', 'password', 'email'];

	/**
	 * * Create a RegisterRequest from a plain object
	 * @param {Object} data
	 * @returns {RegisterRequest}
	 */
	static fromObject(data) {
		return new RegisterRequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {RegisterRequest}
	 */
	static validate(data) {
		for (const field of RegisterRequest.RequiredProperties) {
			if (!data[field]) {
				throw new Error(`The required field \`${field}\` is missing or empty`);
			}
		}

		const stringFields = [...RegisterRequest.RequiredProperties, 'displayName'];
		for (const field of stringFields) {
			if (data[field] !== undefined && typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		return new RegisterRequest(data);
	}

	/**
	 * Serialize to a plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			email: this.email,
			username: this.username,
			password: this.password,
			displayName: this.displayName,
		};
	}
}

export default RegisterRequest;
