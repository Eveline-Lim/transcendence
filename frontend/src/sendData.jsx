export async function sendData(route, options) {
	try {
		const response = await fetch(route, options);
		let data = null;
		try {
			data = await response.json();
		} catch {
			data = null;
		}

		if (!response.ok) {
			return {
				success: false,
				message: data.message || "Internal server error"
			};
		}
		return data;
	} catch (error) {
		return {
			success: false,
			message: "Internal server error"
		};
	}
}
