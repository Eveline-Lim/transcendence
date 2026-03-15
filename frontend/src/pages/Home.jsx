import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

export default function Home() {
	const { currentUser, authLoading } = useContext(AuthContext);
	const navigate = useNavigate();

	useEffect(() => {
		if (!authLoading && !currentUser) navigate("/", { replace: true });
	}, [currentUser, authLoading]);

	if (authLoading || !currentUser) return null;

	const modes = [
		{ icon: "⚔️", title: "Play Ranked", desc: "Competitive 1v1 with ELO rating", action: () => navigate("/play/ranked") },
		{ icon: "🎮", title: "Play Casual", desc: "Relaxed 1v1, no ranking impact", action: () => navigate("/play/casual") },
		{ icon: "🤖", title: "Play vs AI", desc: "Practice against computer opponent", action: () => navigate("/play/ai") },
		{ icon: "🏠", title: "Play Offline", desc: "Local 2-player on same device", action: () => navigate("/play/offline") },
	];

	return (
		<div className="min-h-screen">
			<NavBar />
			<div className="max-w-2xl mx-auto p-6 mt-8">
				<h1 className="text-2xl font-bold mb-1">Welcome, {currentUser.displayName || currentUser.username}</h1>
				<p className="msg-info mb-6">Choose a game mode to start playing</p>

				<div className="grid grid-cols-2 gap-4">
					{modes.map((m) => (
						<div key={m.title} className="menu-card" onClick={m.action}>
							<div className="menu-icon">{m.icon}</div>
							<h2 className="font-bold text-sm mb-1">{m.title}</h2>
							<p className="msg-info text-xs">{m.desc}</p>
						</div>
					))}
				</div>

				<hr className="divider mt-8" />

				<div className="grid grid-cols-3 gap-3">
					<div className="menu-card" onClick={() => navigate("/friends")}>
						<div className="text-xl mb-1">👥</div>
						<p className="text-sm font-bold">Friends</p>
					</div>
					<div className="menu-card" onClick={() => navigate("/chat")}>
						<div className="text-xl mb-1">💬</div>
						<p className="text-sm font-bold">Chat</p>
					</div>
					<div className="menu-card" onClick={() => navigate("/stats")}>
						<div className="text-xl mb-1">📊</div>
						<p className="text-sm font-bold">Statistics</p>
					</div>
					<div className="menu-card" onClick={() => navigate("/leaderboard")}>
						<div className="text-xl mb-1">🏆</div>
						<p className="text-sm font-bold">Leaderboard</p>
					</div>
				</div>
			</div>
			<Footer />
		</div>
	);
}
