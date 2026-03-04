import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState(null);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			setCurrentUser(JSON.parse(storedUser));
		}
	}, []);

	const login = (user, token) => {
		localStorage.setItem("token", token);
		localStorage.setItem("user", JSON.stringify(user));
		setCurrentUser(user);
	};

	const updateUser = (updatedUser) => {
		localStorage.setItem("user", JSON.stringify(updatedUser));
		setCurrentUser(updatedUser);
	};

	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setCurrentUser(null);
	};

	return (
		<AuthContext.Provider value={{ currentUser, login, logout, updateUser }}>
			{children}
		</AuthContext.Provider>
	);
}
