/**
 * Authenticated API helper.
 * Automatically attaches the JWT token from localStorage.
 */
export async function api(route, options = {}) {
	const token = localStorage.getItem("token");
	const headers = { ...options.headers };
	if (token) headers.Authorization = `Bearer ${token}`;

	try {
		const response = await fetch(route, { ...options, headers });
		let data = null;
		try {
			data = await response.json();
		} catch {
			data = null;
		}
		if (!response.ok) {
			return { success: false, status: response.status, message: data?.message || `Error ${response.status}` };
		}
		return { success: true, ...data };
	} catch {
		return { success: false, message: "Network error" };
	}
}
