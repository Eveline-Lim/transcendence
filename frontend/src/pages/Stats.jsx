import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import NavBar from "../components/NavBar";

export default function Stats() {
	const { currentUser } = useContext(AuthContext);
	const navigate = useNavigate();
	const [stats, setStats] = useState(null);
	const [matches, setMatches] = useState([]);
	const [tab, setTab] = useState("overview");
	const [filters, setFilters] = useState({ result: "", gameMode: "" });

	useEffect(() => {
		if (!currentUser) { navigate("/", { replace: true }); return; }
		loadStats();
		loadHistory();
	}, [currentUser]);

	useEffect(() => { loadHistory(); }, [filters]);

	const loadStats = async () => {
		const res = await api("/api/v1/players/me/statistics");
		if (res.success) {
			const { success, ...data } = res;
			setStats(data);
		}
	};

	const loadHistory = async () => {
		const params = new URLSearchParams();
		if (filters.result) params.set("result", filters.result);
		if (filters.gameMode) params.set("gameMode", filters.gameMode);
		const res = await api(`/api/v1/players/me/match-history?${params}`);
		if (res.success) setMatches(res.matches || []);
	};

	const resultBadge = (r) => {
		const map = { win: "badge-green", loss: "badge-red", draw: "badge-yellow" };
		return <span className={`badge ${map[r] || "badge-gray"}`}>{r}</span>;
	};

	const modeBadge = (m) => {
		const map = { ranked: "badge-blue", casual: "badge-gray", ai: "badge-yellow" };
		return <span className={`badge ${map[m] || "badge-gray"}`}>{m}</span>;
	};

	const formatDuration = (s) => {
		if (!s) return "—";
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${String(sec).padStart(2, "0")}`;
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen">
			<NavBar />
			<div className="max-w-2xl mx-auto p-6 mt-6">
				<h1 className="text-xl font-bold mb-4">Statistics</h1>

				<div className="tab-bar">
					<button className={`tab ${tab === "overview" ? "tab-active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
					<button className={`tab ${tab === "history" ? "tab-active" : ""}`} onClick={() => setTab("history")}>Match History</button>
				</div>

				{tab === "overview" && stats && (
					<div>
						{/* Main stats grid */}
						<div className="grid grid-cols-4 gap-3 mb-4">
							<div className="stat-box"><div className="stat-value">{stats.gamesPlayed}</div><div className="stat-label">Games</div></div>
							<div className="stat-box"><div className="stat-value">{stats.wins}</div><div className="stat-label">Wins</div></div>
							<div className="stat-box"><div className="stat-value">{stats.losses}</div><div className="stat-label">Losses</div></div>
							<div className="stat-box"><div className="stat-value">{stats.draws || 0}</div><div className="stat-label">Draws</div></div>
						</div>

						{/* Win rate */}
						<div className="card mb-4">
							<div className="flex justify-between items-center mb-2">
								<span className="label">Win Rate</span>
								<span className="text-sm font-bold">{((stats.winRate || 0) * 100).toFixed(1)}%</span>
							</div>
							<div className="progress-bg">
								<div className="progress-fill" style={{ width: `${(stats.winRate || 0) * 100}%` }}></div>
							</div>
						</div>

						{/* Rating & Rank */}
						<div className="grid grid-cols-2 gap-3 mb-4">
							<div className="stat-box"><div className="stat-value">{stats.eloRating || "—"}</div><div className="stat-label">ELO Rating</div></div>
							<div className="stat-box"><div className="stat-value">#{stats.rank || "—"}</div><div className="stat-label">Global Rank</div></div>
						</div>

						{/* Streaks & Scores */}
						<div className="card">
							<h2 className="font-bold text-sm mb-3">Details</h2>
							<div className="grid grid-cols-2 gap-3">
								<div><span className="label">Current Streak</span><p className="text-sm">{stats.currentWinStreak || 0} wins</p></div>
								<div><span className="label">Best Streak</span><p className="text-sm">{stats.longestWinStreak || 0} wins</p></div>
								<div><span className="label">Points Scored</span><p className="text-sm">{stats.totalPointsScored || 0}</p></div>
								<div><span className="label">Points Conceded</span><p className="text-sm">{stats.totalPointsConceded || 0}</p></div>
							</div>
						</div>
					</div>
				)}

				{tab === "overview" && !stats && (
					<p className="msg-info">No statistics available yet. Play some games!</p>
				)}

				{tab === "history" && (
					<div>
						{/* Filters */}
						<div className="flex gap-3 mb-4">
							<select
								className="input w-auto"
								value={filters.result}
								onChange={(e) => setFilters(f => ({ ...f, result: e.target.value }))}
							>
								<option value="">All Results</option>
								<option value="win">Wins</option>
								<option value="loss">Losses</option>
								<option value="draw">Draws</option>
							</select>
							<select
								className="input w-auto"
								value={filters.gameMode}
								onChange={(e) => setFilters(f => ({ ...f, gameMode: e.target.value }))}
							>
								<option value="">All Modes</option>
								<option value="ranked">Ranked</option>
								<option value="casual">Casual</option>
								<option value="ai">AI</option>
							</select>
						</div>

						{matches.length === 0 ? (
							<p className="msg-info">No matches found</p>
						) : (
							matches.map((m, i) => (
								<div key={m.id || i} className="list-item">
									<div className="flex items-center gap-3">
										<div>
											<div className="flex items-center gap-2 mb-1">
												{resultBadge(m.result)}
												{modeBadge(m.gameMode)}
											</div>
											<p className="text-sm">
												vs <span className="font-bold">{m.opponent?.displayName || m.opponent?.username || "AI"}</span>
												{" — "}
												<span className="text-slate-400">{m.playerScore} - {m.opponentScore}</span>
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-xs text-slate-400">{formatDuration(m.duration)}</p>
										<p className="text-xs text-slate-500">{m.playedAt ? new Date(m.playedAt).toLocaleDateString() : ""}</p>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
