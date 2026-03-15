import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import { chatSocket } from "../utils/chatSocket";
import NavBar from "../components/NavBar";
import FormButton from "../components/FormButton";

export default function Chat() {
	const { currentUser, authLoading } = useContext(AuthContext);
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	// The friend we're chatting with (set via ?userId=<uuid>)
	const [friendId, setFriendId] = useState(searchParams.get("userId") || null);
	const [friends, setFriends] = useState([]);
	const [messages, setMessages] = useState([]);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState(null);
	const [connected, setConnected] = useState(false);
	const [total, setTotal] = useState(0);
	const messagesEndRef = useRef(null);
	const listRef = useRef(null);

	// ──────────── Auth guard ────────────
	useEffect(() => {
		if (!authLoading && !currentUser) navigate("/", { replace: true });
	}, [currentUser, authLoading]);

	// ──────────── Load friend list ────────────
	useEffect(() => {
		if (!currentUser) return;
		(async () => {
			const res = await api("/api/v1/players/me/friends");
			if (res.success) setFriends(res.friends || []);
		})();
	}, [currentUser]);

	// ──────────── WebSocket lifecycle ────────────
	useEffect(() => {
		if (!currentUser) return;
		chatSocket
			.connect()
			.then(() => setConnected(true))
			.catch(() => setError("Could not connect to chat"));

		const unsubMsg = chatSocket.onMessage((msg) => {
			// Only add messages for the active conversation
			setMessages((prev) => [...prev, msg]);
			scrollToBottom();
		});

		const unsubErr = chatSocket.onError((err) => {
			setError(err.message || "Chat error");
		});

		const unsubClose = chatSocket.onClose(() => setConnected(false));
		const unsubOpen = chatSocket.onOpen(() => setConnected(true));

		return () => {
			unsubMsg();
			unsubErr();
			unsubClose();
			unsubOpen();
			chatSocket.disconnect();
		};
	}, [currentUser]);

	// ──────────── Load history when friend changes ────────────
	useEffect(() => {
		if (!friendId || !currentUser) return;
		loadHistory();
	}, [friendId, currentUser]);

	const loadHistory = async () => {
		const res = await api(`/api/v1/chat/messages/${friendId}?limit=200`);
		if (res.success) {
			setMessages(res.messages || []);
			setTotal(res.total ?? 0);
			setTimeout(scrollToBottom, 50);
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	// ──────────── Send message (REST) ────────────
	const handleSend = async () => {
		if (!draft.trim() || !friendId) return;
		setError(null);
		const res = await api("/api/v1/chat/messages", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ recipientId: friendId, content: draft.trim() }),
		});
		if (res.success) {
			const { success, ...msg } = res;
			setMessages((prev) => [...prev, msg]);
			setDraft("");
			scrollToBottom();
		} else {
			setError(res.message || "Failed to send message");
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// ──────────── Select friend ────────────
	const selectFriend = (id) => {
		setFriendId(id);
		setMessages([]);
		setError(null);
	};

	const activeFriend = friends.find((f) => f.player?.id === friendId);

	if (authLoading || !currentUser) return null;

	return (
		<div className="min-h-screen flex flex-col">
			<NavBar />
			<div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
				{/* ── Sidebar: friend list ── */}
				<aside className="w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0">
					<div className="p-3 border-b border-slate-700">
						<h2 className="font-bold text-sm">Conversations</h2>
						<p className="text-xs text-slate-500 mt-0.5">
							{connected ? (
								<span className="text-green-400">● Connected</span>
							) : (
								<span className="text-red-400">● Disconnected</span>
							)}
						</p>
					</div>
					{friends.length === 0 ? (
						<p className="text-xs text-slate-500 p-3">No friends yet. Add friends to start chatting!</p>
					) : (
						friends.map((f) => {
							const p = f.player;
							const isActive = p?.id === friendId;
							return (
								<button
									key={f.id}
									onClick={() => selectFriend(p?.id)}
									className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-slate-800 transition-colors ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"}`}
								>
									{p?.avatarUrl ? (
										<img src={p.avatarUrl} className="avatar-sm" alt="" />
									) : (
										<div className="avatar-sm bg-slate-700 flex items-center justify-center text-xs">
											{(p?.username || "?")[0].toUpperCase()}
										</div>
									)}
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{p?.displayName || p?.username}</p>
										<span className={`text-xs ${p?.status === "online" ? "text-green-400" : "text-slate-500"}`}>
											{p?.status || "offline"}
										</span>
									</div>
								</button>
							);
						})
					)}
				</aside>

				{/* ── Main chat area ── */}
				<main className="flex-1 flex flex-col">
					{!friendId ? (
						<div className="flex-1 flex items-center justify-center">
							<p className="msg-info">Select a friend to start chatting</p>
						</div>
					) : (
						<>
							{/* Header */}
							<div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3 bg-slate-900/50">
								{activeFriend?.player?.avatarUrl ? (
									<img src={activeFriend.player.avatarUrl} className="avatar-sm" alt="" />
								) : (
									<div className="avatar-sm bg-slate-700 flex items-center justify-center text-xs">
										{(activeFriend?.player?.username || "?")[0].toUpperCase()}
									</div>
								)}
								<div>
									<p className="font-bold text-sm">{activeFriend?.player?.displayName || activeFriend?.player?.username || "Chat"}</p>
									<p className="text-xs text-slate-500">{activeFriend?.player?.status || "offline"}</p>
								</div>
							</div>

							{/* Messages */}
							<div ref={listRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
								{messages.length === 0 && (
									<p className="msg-info text-center mt-8">No messages yet. Say hello!</p>
								)}
								{messages.map((m, i) => {
									const isOwn = m.senderId === currentUser.id;
									return (
										<div key={m.messageId || i} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
											<div className={`max-w-xs md:max-w-md px-3 py-2 rounded-lg text-sm ${isOwn ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-200"}`}>
												{!isOwn && m.senderUsername && (
													<p className="text-xs font-bold text-slate-400 mb-0.5">{m.senderUsername}</p>
												)}
												<p className="whitespace-pre-wrap break-words">{m.content}</p>
												<p className={`text-xs mt-1 ${isOwn ? "text-blue-200" : "text-slate-500"}`}>
													{m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
												</p>
											</div>
										</div>
									);
								})}
								<div ref={messagesEndRef} />
							</div>

							{/* Error bar */}
							{error && (
								<div className="px-4 py-2 bg-red-900/30 border-t border-red-800">
									<p className="msg-error text-xs">{error}</p>
								</div>
							)}

							{/* Input */}
						<div className="px-4 py-3 border-t border-slate-700 flex gap-2 items-end">
							<textarea
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Type a message…"
								maxLength={1000}
								rows={3}
									className="input flex-5 resize-none"
								/>
							<button
								type="button"
								onClick={handleSend}
								className="btn btn-primary flex-2"
							>
								Send
							</button>
							</div>
						</>
					)}
				</main>
			</div>
		</div>
	);
}
