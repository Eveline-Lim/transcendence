/* The username can contain:
- Length between 3 and 20 characters
- Uppercase letters
- Lowercase letters
- Space
- Hyphen
- Apostrophe
*/
export function validateUsername(username) {
	// const usernameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ '-]{3,20}$/;
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
	const data = {};
	for (const key in fields) {
		let value = fields[key];
		if (!value) {
			value = '';
		}
		data[key] = value.trim();
		// console.log("key ", key);
		// console.log("data: ", data);
	}

	// console.log("DATA ", data.username, data.password);

	if (isLogin) {
		console.log("DATA IDENTIFIER: ", data.identifier);
		if (data.identifier.includes("@")) {
			data.email = data.identifier;
			// console.log("data email: ", data.email);
		} else {
			data.username = data.identifier;
			// console.log("data username: ", data.username);
		}
	}

	if (data.username) {
		if (!data.username) {
			return { success: false };
		}
		if (!validateUsername(data.username)) {
			return { success: false };
		}
	}
	if (!validatePassword(data.password)) {
		return { success: false };
	}

	if (data.email) {
		if (!data.email) {
			return { success: false };
		}
		if (!validateEmail(data.email)) {
			return { success: false };
		}
	}
	return { success: true };
}
