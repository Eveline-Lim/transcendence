import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { sendData } from "../sendData.jsx";

export default function NavBar() {
	const { currentUser, logout } = useContext(AuthContext);
	const navigate = useNavigate();
	const location = useLocation();

	const handleLogout = async () => {
		try {
			const token = localStorage.getItem("token");
			await sendData("/api/v1/auth/logout", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
		} catch (err) {
			console.error("Logout error:", err);
		} finally {
			logout();
			navigate("/");
		}
	};

	const navLink = (path, label) => (
		<button
			onClick={() => navigate(path)}
			className={`link text-sm ${location.pathname === path ? "font-bold text-white" : ""}`}
		>
			{label}
		</button>
	);

	return (
		<nav className="nav">
			<button onClick={() => navigate("/home")} className="font-bold text-lg cursor-pointer bg-transparent border-none text-white">
				Transcendence
			</button>

			{currentUser && (
				<div className="flex items-center gap-4">
					{navLink("/home", "Home")}
					{navLink("/friends", "Friends")}
					{navLink("/chat", "Chat")}
					{navLink("/stats", "Stats")}
					{navLink("/leaderboard", "Leaderboard")}
					{navLink("/profile", "Profile")}
					<span className="text-sm text-slate-500">|</span>
					<span className="text-sm text-slate-400">{currentUser.username}</span>
					<button onClick={handleLogout} className="btn btn-secondary text-sm py-1 px-3">
						Logout
					</button>
				</div>
			)}
		</nav>
	);
}
