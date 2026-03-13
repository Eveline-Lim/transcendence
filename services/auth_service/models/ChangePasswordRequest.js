class ChangePasswordRequest {
	/**
	 * @param {Object} data
	 * @param {string} data.currentPassword - (required)
	 * @param {string} data.newPassword - (required)
	 */
	constructor(data = {}) {
		this.currentPassword = data.currentPassword;
		this.newPassword = data.newPassword;
	}

	static RequiredProperties = ['currentPassword', 'newPassword'];

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {ChangePasswordRequest}
	 */
	static from(data) {
		return new ChangePasswordRequest(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {ChangePasswordRequest}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid request body');
		}

		for (const field of ChangePasswordRequest.RequiredProperties) {
			if (!data[field]) {
				throw new Error(`The required field \`${field}\` is missing or empty`);
			}
			if (typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}

		return new ChangePasswordRequest(data);
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			currentPassword: this.currentPassword,
			newPassword: this.newPassword,
		};
	}
}

export default ChangePasswordRequest;
