/**
 * Authenticated API helper.
 * Automatically attaches the JWT token from localStorage.
 * On 401, attempts a token refresh using the stored refreshToken.
 */

let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed(newToken) {
	refreshSubscribers.forEach((cb) => cb(newToken));
	refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
	refreshSubscribers.push(cb);
}

async function refreshAccessToken() {
	const refreshToken = localStorage.getItem("refreshToken");
	if (!refreshToken) return null;

	try {
		const response = await fetch("/api/v1/auth/refresh", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken }),
		});
		if (!response.ok) return null;
		const data = await response.json();
		if (data.accessToken) {
			localStorage.setItem("token", data.accessToken);
			if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
			return data.accessToken;
		}
		return null;
	} catch {
		return null;
	}
}

export async function api(route, options = {}) {
	const token = localStorage.getItem("token");
	const headers = { ...options.headers };
	if (token) headers.Authorization = `Bearer ${token}`;

	try {
		const response = await fetch(route, { ...options, headers });

		// Attempt token refresh on 401
		if (response.status === 401 && localStorage.getItem("refreshToken")) {
			if (!isRefreshing) {
				isRefreshing = true;
				const newToken = await refreshAccessToken();
				isRefreshing = false;

				if (newToken) {
					onTokenRefreshed(newToken);
					// Retry the original request with the new token
					const retryHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
					const retryResponse = await fetch(route, { ...options, headers: retryHeaders });
					let retryData = null;
					try { retryData = await retryResponse.json(); } catch { retryData = null; }
					if (!retryResponse.ok) {
						return { success: false, status: retryResponse.status, message: retryData?.message || `Error ${retryResponse.status}` };
					}
					return { success: true, ...retryData };
				} else {
					// Refresh failed — clear tokens and redirect to login
					localStorage.removeItem("token");
					localStorage.removeItem("refreshToken");
					localStorage.removeItem("user");
					return { success: false, status: 401, message: "Session expired" };
				}
			} else {
				// Another refresh is in progress — wait for it
				return new Promise((resolve) => {
					addRefreshSubscriber(async (newToken) => {
						const retryHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
						const retryResponse = await fetch(route, { ...options, headers: retryHeaders });
						let retryData = null;
						try { retryData = await retryResponse.json(); } catch { retryData = null; }
						if (!retryResponse.ok) {
							resolve({ success: false, status: retryResponse.status, message: retryData?.message || `Error ${retryResponse.status}` });
						} else {
							resolve({ success: true, ...retryData });
						}
					});
				});
			}
		}

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
