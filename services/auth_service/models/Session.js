class Session {
	/**
	 * @param {Object} data
	 * @param {string} data.id - Session ID (required)
	 * @param {string} [data.deviceInfo]
	 * @param {string} [data.ipAddress]
	 * @param {string} [data.location]
	 * @param {string|Date} [data.createdAt]
	 * @param {string|Date} [data.lastActiveAt]
	 * @param {boolean} [data.isCurrent]
	 */
	constructor(data = {}) {
		this.id = data.id;
		this.deviceInfo = data.deviceInfo ?? null;
		this.ipAddress = data.ipAddress ?? null;
		this.location = data.location ?? null;
		this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
		this.lastActiveAt = data.lastActiveAt ? new Date(data.lastActiveAt) : null;
		this.isCurrent = Boolean(data.isCurrent);
	}

	static RequiredProperties = ['id'];

	/**
	 * Create a Session from plain object
	 * @param {Object} data
	 * @returns {Session}
	 */
	static from(data) {
		return new Session(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {Session}
	 */
	static validate(data) {
		for (const field of Session.RequiredProperties) {
			if (!data[field]) {
				throw new Error(`The required field \`${field}\` is missing or empty`);
			}
		}

		if (typeof data.id !== 'string') {
			throw new Error(`Expected field \`id\` to be a string, got ${typeof data.id}`);
		}

		if (data.deviceInfo && typeof data.deviceInfo !== 'string') {
			throw new Error(`Expected field \`deviceInfo\` to be a string`);
		}

		if (data.ipAddress && typeof data.ipAddress !== 'string') {
			throw new Error(`Expected field \`ipAddress\` to be a string`);
		}

		if (data.location && typeof data.location !== 'string') {
			throw new Error(`Expected field \`location\` to be a string`);
		}

		if (data.isCurrent !== undefined && typeof data.isCurrent !== 'boolean') {
			throw new Error(`Expected field \`isCurrent\` to be a boolean`);
		}

		return new Session(data);
	}

	/**
	 * Serialize to plain object
	 * @returns {Object}
	 */
	toJSON() {
		return {
			id: this.id,
			deviceInfo: this.deviceInfo,
			ipAddress: this.ipAddress,
			location: this.location,
			createdAt: this.createdAt,
			lastActiveAt: this.lastActiveAt,
			isCurrent: this.isCurrent,
		};
	}
}

export default Session;
