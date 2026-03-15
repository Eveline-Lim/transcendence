class UserInfo {
	/**
	 * @param {Object} data
	 * @param {string} [data.id]
	 * @param {string} [data.email]
	 * @param {string} [data.username]
	 * @param {string} [data.displayName]
	 * @param {string} [data.avatarUrl]
	 * @param {boolean} [data.has2FAEnabled]
	 */
	constructor(data = {}) {
		this.id = data.id ?? undefined;
		this.email = data.email ?? undefined;
		this.username = data.username ?? undefined;
		this.displayName = data.displayName ?? undefined;
		this.avatarUrl = data.avatarUrl ?? undefined;
		this.has2FAEnabled = data.has2FAEnabled !== undefined ? Boolean(data.has2FAEnabled) : undefined;
		this.has2FAEnabled =
			data.has2FAEnabled !== undefined ? Boolean(data.has2FAEnabled) : undefined;
	}

	/**
	 * Create a UserInfo from a plain object
	 * @param {Object} data
	 * @returns {UserInfo}
	 */
	static fromObject(data) {
		return new UserInfo(data);
	}

	/**
	 * Create a UserInfo from a Redis hash (all values are strings)
	 * @param {Object} data
	 * @returns {UserInfo}
	 */
	static fromRedis(data) {
		return new UserInfo({
			...data,
			has2FAEnabled: data.has2FAEnabled === 'true',
		});
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {UserInfo}
	 */
	static validate(data) {
		const stringFields = ['id', 'email', 'username', 'displayName', 'avatarUrl'];
		for (const field of stringFields) {
			if (data[field] !== undefined && typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		return new UserInfo(data);
	}

	/**
	 * Serialize to a plain object (e.g. for JSON response)
	 * @returns {Object}
	 */
	toJSON() {
		return {
			id: this.id,
			email: this.email,
			username: this.username,
			displayName: this.displayName,
			avatarUrl: this.avatarUrl,
			has2FAEnabled: this.has2FAEnabled,
		};
	}
}

export default UserInfo;
