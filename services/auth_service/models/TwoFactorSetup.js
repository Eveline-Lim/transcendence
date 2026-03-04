class TwoFactorSetup {
	/**
	 * @param {Object} data
	 * @param {string} [data.secret] - TOTP secret key
	 * @param {string} [data.qrCodeUrl] - QR code image URL
	 * @param {string[]} [data.backupCodes] - One-time backup codes
	 */
	constructor(data = {}) {
		this.secret = data.secret;
		this.qrCodeUrl = data.qrCodeUrl;
		this.backupCodes = data.backupCodes;
	}

	/**
	 * Create instance from plain object
	 * @param {Object} data
	 * @returns {TwoFactorSetup}
	 */
	static from(data) {
		return new TwoFactorSetup(data);
	}

	/**
	 * Validate structure (optional fields allowed)
	 * @param {Object} data
	 * @returns {TwoFactorSetup}
	 */
	static validate(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid response body');
		}

		if (
			data.secret !== undefined &&
			(typeof data.secret !== 'string' || data.secret.trim() === '')
		) {
			throw new Error('`secret` must be a non-empty string');
		}

		if (
			data.qrCodeUrl !== undefined &&
			(typeof data.qrCodeUrl !== 'string' || data.qrCodeUrl.trim() === '')
		) {
			throw new Error('`qrCodeUrl` must be a non-empty string');
		}

		if (data.backupCodes !== undefined) {
			if (!Array.isArray(data.backupCodes)) {
				throw new Error('`backupCodes` must be an array of strings');
			}

			for (const code of data.backupCodes) {
				if (typeof code !== 'string') {
					throw new Error('Each backup code must be a string');
				}
			}
		}

		return new TwoFactorSetup(data);
	}

	/**
	 * Serialize to plain object
	 */
	toJSON() {
		return {
			secret: this.secret,
			qrCodeUrl: this.qrCodeUrl,
			backupCodes: this.backupCodes,
		};
	}
}

export default TwoFactorSetup;
