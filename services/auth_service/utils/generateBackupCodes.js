import crypto from "node:crypto";

export function generateBackupCodes() {
	const codes = [];
	const backupCodes = [];

	for (let i = 0; i < 8; i++) {
		const code = crypto.randomBytes(4).toString("hex");
		codes.push(code);
		backupCodes.push(
		  crypto.createHash("sha256").update(code).digest("hex")
		);
	}
	return { codes, backupCodes };
}
