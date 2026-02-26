import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import NavBar from "../components/NavBar";

export default function Leaderboard() {
	const { currentUser } = useContext(AuthContext);
	const navigate = useNavigate();
	const [entries, setEntries] = useState([]);
	const [myRank, setMyRank] = useState(null);
	const [period, setPeriod] = useState("all_time");
	const [category, setCategory] = useState("elo");

	useEffect(() => {
		if (!currentUser) { navigate("/", { replace: true }); return; }
		loadLeaderboard();
		loadMyRank();
	}, [currentUser, period, category]);

	const loadLeaderboard = async () => {
		const params = new URLSearchParams({ period, category, limit: "50" });
		const res = await api(`/api/v1/leaderboard?${params}`);
		if (res.success) {
			setEntries(res.entries || []);
			if (res.currentPlayerRank) setMyRank(res.currentPlayerRank);
		}
	};

	const loadMyRank = async () => {
		const res = await api("/api/v1/rankings/me");
		if (res.success) {
			const { success, ...data } = res;
			setMyRank(data);
		}
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen">
			<NavBar />
			<div className="max-w-2xl mx-auto p-6 mt-6">
				<h1 className="text-xl font-bold mb-4">Leaderboard</h1>

				{/* My rank card */}
				{myRank && (
					<div className="card mb-4 flex items-center justify-between">
						<div>
							<p className="label">Your Ranking</p>
							<p className="text-lg font-bold">#{myRank.rank || "—"}</p>
						</div>
						<div className="flex gap-4">
							<div className="text-center">
								<p className="stat-value text-base">{myRank.eloRating || "—"}</p>
								<p className="stat-label">ELO</p>
							</div>
							<div className="text-center">
								<p className="stat-value text-base">{myRank.wins || 0}</p>
								<p className="stat-label">Wins</p>
							</div>
							<div className="text-center">
								<p className="stat-value text-base">{((myRank.winRate || 0) * 100).toFixed(0)}%</p>
								<p className="stat-label">Win Rate</p>
							</div>
						</div>
						{myRank.rankChange != null && myRank.rankChange !== 0 && (
							<span className={`badge ${myRank.rankChange > 0 ? "badge-green" : "badge-red"}`}>
								{myRank.rankChange > 0 ? "▲" : "▼"} {Math.abs(myRank.rankChange)}
							</span>
						)}
					</div>
				)}

				{/* Filters */}
				<div className="flex gap-3 mb-4">
					<select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
						<option value="all_time">All Time</option>
						<option value="monthly">Monthly</option>
						<option value="weekly">Weekly</option>
						<option value="daily">Daily</option>
					</select>
					<select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
						<option value="elo">ELO Rating</option>
						<option value="wins">Total Wins</option>
						<option value="winrate">Win Rate</option>
						<option value="games_played">Games Played</option>
					</select>
				</div>

				{/* Leaderboard table */}
				{entries.length === 0 ? (
					<p className="msg-info">No leaderboard data available yet</p>
				) : (
					<div className="card p-0 overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-700">
									<th className="text-left p-3 text-slate-400 font-semibold">#</th>
									<th className="text-left p-3 text-slate-400 font-semibold">Player</th>
									<th className="text-right p-3 text-slate-400 font-semibold">ELO</th>
									<th className="text-right p-3 text-slate-400 font-semibold">W/L</th>
									<th className="text-right p-3 text-slate-400 font-semibold">Win%</th>
								</tr>
							</thead>
							<tbody>
								{entries.map((e, i) => {
									const isMe = e.player?.id === currentUser.id;
									return (
										<tr key={e.player?.id || i} className={`border-b border-slate-800 ${isMe ? "bg-blue-900/20" : ""}`}>
											<td className="p-3 font-bold">
												{e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}
											</td>
											<td className="p-3">
												<div className="flex items-center gap-2">
													{e.player?.avatarUrl ? (
														<img src={e.player.avatarUrl} className="avatar-sm" alt="" />
													) : (
														<div className="avatar-sm bg-slate-700 flex items-center justify-center text-xs">
															{(e.player?.username || "?")[0].toUpperCase()}
														</div>
													)}
													<span className={isMe ? "font-bold text-blue-400" : ""}>{e.player?.displayName || e.player?.username}</span>
												</div>
											</td>
											<td className="p-3 text-right font-mono">{e.eloRating}</td>
											<td className="p-3 text-right text-slate-400">{e.wins}/{e.losses}</td>
											<td className="p-3 text-right">{((e.winRate || 0) * 100).toFixed(0)}%</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
