import UserInfo from "./UserInfo.js";

class AuthResponse {
	/**
	 * @param {Object} data
	 * @param {string} [data.accessToken] - JWT access token
	 * @param {string} [data.refreshToken] - Refresh token for obtaining new access token
	 * @param {string} [data.tokenType] - Token type (default: 'Bearer')
	 * @param {number} [data.expiresIn] - Access token expiration time in seconds
	 * @param {UserInfo|Object} [data.user]
	 * @param {boolean} [data.requires2FA] - Whether 2FA verification is required to complete login
	 */
	constructor(data = {}) {
		this.accessToken = data.accessToken ?? undefined;
		this.refreshToken = data.refreshToken ?? undefined;
		this.tokenType = data.tokenType ?? 'Bearer';
		this.expiresIn = data.expiresIn !== undefined ? Number(data.expiresIn) : undefined;
		this.user = data.user instanceof UserInfo ? data.user : (data.user ? UserInfo.from(data.user) : undefined);
		this.requires2FA = data.requires2FA !== undefined ? Boolean(data.requires2FA) : undefined;
	}

	/**
	 * Create an AuthResponse from a plain object
	 * @param {Object} data
	 * @returns {AuthResponse}
	 */
	static fromObject(data) {
		return new AuthResponse(data);
	}

	/**
	 * Validate fields and throw if invalid
	 * @param {Object} data
	 * @returns {AuthResponse}
	 */
	static validate(data) {
		const stringFields = ['accessToken', 'refreshToken', 'tokenType'];
		for (const field of stringFields) {
			if (data[field] !== undefined && typeof data[field] !== 'string') {
				throw new Error(`Expected field \`${field}\` to be a string, got ${typeof data[field]}`);
			}
		}
		if (data.user) {
			UserInfo.validate(data.user);
		}
		return new AuthResponse(data);
	}

	/**
	 * Serialize to a plain object (e.g. for JSON response)
	 * @returns {Object}
	 */
	toJSON() {
		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			tokenType: this.tokenType,
			expiresIn: this.expiresIn,
			user: this.user?.toJSON(),
			requires2FA: this.requires2FA,
		};
	}
}

export default AuthResponse;
