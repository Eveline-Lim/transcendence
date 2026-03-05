class TokenInfo {
	constructor(data = {}) {
		this.valid = typeof data.valid === 'boolean' ? data.valid : undefined;
		this.userId = typeof data.userId === 'string' ? data.userId : undefined;
		this.username = typeof data.username === 'string' ? data.username : undefined;
		this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;
		this.issuedAt = data.issuedAt ? new Date(data.issuedAt) : undefined;
	}

	static fromObject(data) {
		if (!data || typeof data !== 'object') {
			return null;
		}
		TokenInfo.validateJSON(data);
		return new TokenInfo(data);
	}

	static validateJSON(data) {
		const stringFields = ['userId', 'username'];
		for (const field of stringFields) {
			if (data[field] !== undefined && typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string but got ${data[field]}`);
		  }
		}

		if (data.valid !== undefined && typeof data.valid !== 'boolean') {
			throw new Error(`Expected field \`valid\` to be a boolean but got ${data.valid}`);
		}

		const dateFields = ['expiresAt', 'issuedAt'];
		for (const field of dateFields) {
			if (data[field] !== undefined && isNaN(new Date(data[field]).getTime())) {
				throw new Error(`Expected field \`${field}\` to be a valid date but got ${data[field]}`);
			}
		}
		return true;
	}

	toJSON() {
		return {
			valid: this.valid,
			userId: this.userId,
			username: this.username,
			expiresAt: this.expiresAt?.toISOString(),
			issuedAt: this.issuedAt?.toISOString(),
		};
	}
}

export default TokenInfo;
