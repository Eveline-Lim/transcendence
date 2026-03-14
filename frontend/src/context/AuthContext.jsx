import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState(null);
	const [authLoading, setAuthLoading] = useState(true);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			try {
				setCurrentUser(JSON.parse(storedUser));
			} catch (e) {
				console.error("Failed to parse stored user", e);
				localStorage.removeItem("user");
			}
		}
		setAuthLoading(false);
	}, []);

	const login = (user, token, refreshToken) => {
		localStorage.setItem("token", token);
		if (refreshToken) {
			localStorage.setItem("refreshToken", refreshToken);
		}
		localStorage.setItem("user", JSON.stringify(user));
		setCurrentUser(user);
	};

	const updateUser = (updatedUser) => {
		localStorage.setItem("user", JSON.stringify(updatedUser));
		setCurrentUser(updatedUser);
	};


	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("user");
		setCurrentUser(null);
	};

	return (
		<AuthContext.Provider value={{ currentUser, authLoading, login, logout, updateUser }}>
			{children}
		</AuthContext.Provider>
	);
}
