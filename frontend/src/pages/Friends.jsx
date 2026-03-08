import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import NavBar from "../components/NavBar";
import FormButton from "../components/FormButton";

export default function Friends() {
	const { currentUser } = useContext(AuthContext);
	const navigate = useNavigate();
	const [tab, setTab] = useState("friends");
	const [friends, setFriends] = useState([]);
	const [requests, setRequests] = useState([]);
	const [blocked, setBlocked] = useState([]);
	const [searchResults, setSearchResults] = useState([]);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);
	const searchRef = useRef(null);

	useEffect(() => {
		if (!currentUser) { navigate("/", { replace: true }); return; }
		loadFriends();
		loadRequests();
		loadBlocked();
	}, [currentUser]);

	const loadFriends = async () => {
		const res = await api("/api/v1/players/me/friends");
		if (res.success) setFriends(res.friends || []);
	};
	const loadRequests = async () => {
		const res = await api("/api/v1/players/me/friends/requests");
		if (res.success) setRequests(res.requests || []);
	};
	const loadBlocked = async () => {
		const res = await api("/api/v1/players/me/blocked");
		if (res.success) setBlocked(res.blocked || []);
	};

	const flash = (setter, message) => { setter(message); setTimeout(() => setter(null), 3000); };

	const handleSearch = async () => {
		const q = searchRef.current?.value.trim();
		if (!q) return;
		const res = await api(`/api/v1/players?search=${encodeURIComponent(q)}`);
		if (res.success) setSearchResults(res.players || []);
		else flash(setError, res.message);
	};

	const sendRequest = async (playerId) => {
		const res = await api("/api/v1/players/me/friends/requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetPlayerId: playerId }),
		});
		if (res.success) { flash(setMsg, "Request sent"); loadRequests(); }
		else flash(setError, res.message);
	};

	const respondRequest = async (requestId, action) => {
		const res = await api(`/api/v1/players/me/friends/requests/${requestId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action }),
		});
		if (res.success) { flash(setMsg, action === "accept" ? "Friend added" : "Request rejected"); loadRequests(); loadFriends(); }
		else flash(setError, res.message);
	};

	const cancelRequest = async (requestId) => {
		const res = await api(`/api/v1/players/me/friends/requests/${requestId}`, { method: "DELETE" });
		if (res.success) { flash(setMsg, "Request cancelled"); loadRequests(); }
		else flash(setError, res.message);
	};

	const removeFriend = async (friendId) => {
		const res = await api(`/api/v1/players/me/friends/${friendId}`, { method: "DELETE" });
		if (res.success) { flash(setMsg, "Friend removed"); loadFriends(); }
		else flash(setError, res.message);
	};

	const blockPlayer = async (playerId) => {
		const res = await api("/api/v1/players/me/blocked", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playerId }),
		});
		if (res.success) { flash(setMsg, "Player blocked"); loadBlocked(); loadFriends(); }
		else flash(setError, res.message);
	};

	const unblockPlayer = async (playerId) => {
		const res = await api(`/api/v1/players/me/blocked/${playerId}`, { method: "DELETE" });
		if (res.success) { flash(setMsg, "Player unblocked"); loadBlocked(); }
		else flash(setError, res.message);
	};

	const statusBadge = (status) => {
		const map = { online: "badge-green", offline: "badge-gray", in_game: "badge-blue", away: "badge-yellow" };
		return <span className={`badge ${map[status] || "badge-gray"}`}>{status || "offline"}</span>;
	};

	const tabs = ["friends", "requests", "search", "blocked"];

	if (!currentUser) return null;

	const incoming = requests.filter(r => r.status === "pending" && r.toPlayer?.id === currentUser.id);
	const outgoing = requests.filter(r => r.status === "pending" && r.fromPlayer?.id === currentUser.id);

	return (
		<div className="min-h-screen">
			<NavBar />
<div className="max-w-3xl mx-auto p-6 mt-6">
				<h1 className="text-xl font-bold mb-4">Friends</h1>

				{msg && <p className="msg-success mb-3">{msg}</p>}
				{error && <p className="msg-error mb-3">{error}</p>}

				<div className="tab-bar">
					{tabs.map(t => (
						<button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
							{t === "friends" ? `Friends (${friends.length})` : t === "requests" ? `Requests (${incoming.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
						</button>
					))}
				</div>

				{/* Friends list */}
				{tab === "friends" && (
					<div>
						{friends.length === 0 ? (
							<p className="msg-info">No friends yet. Search for players to add!</p>
						) : (
							friends.map(f => (
								<div key={f.id} className="list-item">
									<div className="flex items-center gap-3">
										{f.player?.avatarUrl ? (
											<img src={f.player.avatarUrl} className="avatar-sm" alt="" />
										) : (
											<div className="avatar-sm bg-slate-700 flex items-center justify-center text-xs">
												{(f.player?.username || "?")[0].toUpperCase()}
											</div>
										)}
										<div>
											<p className="text-sm font-bold">{f.player?.displayName || f.player?.username}</p>
											{statusBadge(f.player?.status)}
										</div>
									</div>
									<div className="flex gap-2">
										<button className="btn btn-primary text-xs py-1 px-2" onClick={() => navigate(`/chat?userId=${f.player.id}`)}>Message</button>
										<button className="btn btn-secondary text-xs py-1 px-2" onClick={() => blockPlayer(f.player.id)}>Block</button>
										<button className="btn btn-danger text-xs py-1 px-2" onClick={() => removeFriend(f.player.id)}>Remove</button>
									</div>
								</div>
							))
						)}
					</div>
				)}

				{/* Requests */}
				{tab === "requests" && (
					<div>
						{incoming.length > 0 && (
							<>
								<p className="label mb-2">Incoming</p>
								{incoming.map(r => (
									<div key={r.id} className="list-item">
										<div>
											<p className="text-sm font-bold">{r.fromPlayer?.displayName || r.fromPlayer?.username}</p>
											<p className="msg-info text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
										</div>
										<div className="flex gap-2">
											<button className="btn btn-primary text-xs py-1 px-2" onClick={() => respondRequest(r.id, "accept")}>Accept</button>
											<button className="btn btn-secondary text-xs py-1 px-2" onClick={() => respondRequest(r.id, "reject")}>Reject</button>
										</div>
									</div>
								))}
							</>
						)}
						{outgoing.length > 0 && (
							<>
								<p className="label mb-2 mt-4">Outgoing</p>
								{outgoing.map(r => (
									<div key={r.id} className="list-item">
										<p className="text-sm font-bold">{r.toPlayer?.displayName || r.toPlayer?.username}</p>
										<button className="btn btn-secondary text-xs py-1 px-2" onClick={() => cancelRequest(r.id)}>Cancel</button>
									</div>
								))}
							</>
						)}
						{incoming.length === 0 && outgoing.length === 0 && (
							<p className="msg-info">No pending requests</p>
						)}
					</div>
				)}

				{/* Search */}
				{tab === "search" && (
					<div>
						<div className="flex gap-2 mb-4">
							<input
								ref={searchRef}
								className="input flex-1"
								placeholder="Search by username..."
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							/>
							<FormButton onClick={handleSearch}>Search</FormButton>
						</div>
						{searchResults.map(p => (
							<div key={p.id} className="list-item">
								<div className="flex items-center gap-3">
									{p.avatarUrl ? (
										<img src={p.avatarUrl} className="avatar-sm" alt="" />
									) : (
										<div className="avatar-sm bg-slate-700 flex items-center justify-center text-xs">
											{(p.username || "?")[0].toUpperCase()}
										</div>
									)}
									<div>
										<p className="text-sm font-bold">{p.displayName || p.username}</p>
										{statusBadge(p.status)}
									</div>
								</div>
								<div className="flex gap-2">
									<button className="btn btn-primary text-xs py-1 px-2" onClick={() => sendRequest(p.id)}>Add</button>
									<button className="btn btn-secondary text-xs py-1 px-2" onClick={() => blockPlayer(p.id)}>Block</button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Blocked */}
				{tab === "blocked" && (
					<div>
						{blocked.length === 0 ? (
							<p className="msg-info">No blocked players</p>
						) : (
							blocked.map(p => (
								<div key={p.id} className="list-item">
									<p className="text-sm font-bold">{p.displayName || p.username}</p>
									<button className="btn btn-secondary text-xs py-1 px-2" onClick={() => unblockPlayer(p.id)}>Unblock</button>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
