/* The username can contain:
- Length between 3 and 20 characters
- Uppercase letters
- Lowercase letters
- Underscore
*/
export function validateUsername(username) {
	const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
	if (!usernameRegex.test(username)) {
		return (false);
	}
	return (true);
}

/* The password must contain:
- Length between 8 and 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character from #?!@$ %^&*-
*/
export function validatePassword(password) {
	const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,128}$/;
	if (!passwordRegex.test(password)) {
		return (false);
	}
	return (true);
}

export function validateEmail(email) {
	const emailRegex = /^((?!\.)[\w\-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/;
	if (!emailRegex.test(email)) {
		return (false);
	}
	return (true);
}

export function validate2FACode(code) {
	const twoFACode = /^\d{6}$/;
	if (!twoFACode.test(code)) {
		return (false);
	}
	return (true);
}

export function validateInputs(fields, isLogin = false) {
	// During login we only check identifier format, NOT password format.
	// Validating the password format on login would lock out users whose
	// passwords were created under a different policy.
	const data = {};
	for (const key in fields) {
		let value = fields[key];
		if (!value) {
			value = '';
		}
		data[key] = value.trim();
	}

	if (isLogin) {
		if (data.identifier.includes("@")) {
			data.email = data.identifier;
		} else {
			data.username = data.identifier;
		}
		// Login: only validate identifier format, skip password format check
		if (data.username !== undefined && !validateUsername(data.username)) {
			return { success: false };
		}
		if (data.email !== undefined && !validateEmail(data.email)) {
			return { success: false };
		}
	} else {
		// Register / change-password: validate all fields strictly
		if (data.username !== undefined && !validateUsername(data.username)) {
			return { success: false };
		}
		if (data.password !== undefined && !validatePassword(data.password)) {
			return { success: false };
		}
		if (data.email !== undefined && !validateEmail(data.email)) {
			return { success: false };
		}
	}
	return { success: true };
}
