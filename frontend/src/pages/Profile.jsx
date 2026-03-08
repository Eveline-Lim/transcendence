import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import NavBar from "../components/NavBar";
import FormButton from "../components/FormButton";
import InputField from "../components/InputField";
import { sendData } from "../sendData";

export default function Profile() {
	const { currentUser, updateUser, logout } = useContext(AuthContext);
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [editing, setEditing] = useState(false);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);
	const [prefs, setPrefs] = useState(null);
	const [sessions, setSessions] = useState(null);
	const [changingPassword, setChangingPassword] = useState(false);
	const displayNameRef = useRef(null);
	const emailRef = useRef(null);
	const avatarRef = useRef(null);
	const currentPwRef = useRef(null);
	const newPwRef = useRef(null);

	const token = localStorage.getItem("token");
	console.log("token: ", token);

	useEffect(() => {
		if (!currentUser) { navigate("/", { replace: true }); return; }
		fetchProfile();
		fetchPrefs();
		fetchSessions();
	}, [currentUser]);

	const fetchProfile = async () => {
		const res = await api("/api/v1/players/me");
		if (res.success) {
			const { success, ...data } = res;
			setProfile(data);
		}
	};

	const fetchPrefs = async () => {
		const res = await api("/api/v1/players/me/preferences");
		if (res.success) {
			const { success, ...data } = res;
			setPrefs(data);
		}
	};

	const fetchSessions = async () => {
		const res = await sendData("/api/v1/auth/sessions", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			}
		});

		console.log("SESSION RES: ", res);

		if (res && Array.isArray(res.sessions)) {
			setSessions(res.sessions);
		} else {
			setSessions([]);
		}
	};

	const handleSave = async () => {
		setError(null);
		setMsg(null);
		const body = {};
		const dn = displayNameRef.current?.value.trim();
		const em = emailRef.current?.value.trim();
		if (dn) body.displayName = dn;
		if (em) body.email = em;
		const res = await api("/api/v1/players/me", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (res.success) {
			const { success, ...data } = res;
			setProfile(data);
			updateUser({ ...currentUser, displayName: data.displayName, email: data.email });
			setEditing(false);
			setMsg("Profile updated");
		} else {
			setError(res.message);
		}
	};

	const handleAvatarUpload = async () => {
		const file = avatarRef.current?.files?.[0];
		if (!file) return;
		const form = new FormData();
		form.append("avatar", file);
		const res = await api("/api/v1/players/me/avatar", { method: "PUT", body: form });
		if (res.success) {
			setMsg("Avatar updated");
			fetchProfile();
		} else {
			setError(res.message);
		}
	};

	const handleDeleteAvatar = async () => {
		const res = await api("/api/v1/players/me/avatar", { method: "DELETE" });
		if (res.success) {
			setMsg("Avatar removed");
			fetchProfile();
		} else {
			setError(res.message);
		}
	};

	const handleDeleteAccount = async () => {
		if (!confirm("Permanently delete your account?")) return;
		const res = await api("/api/v1/players/me", { method: "DELETE" });
		if (res.success) {
			logout();
			navigate("/", { replace: true });
		} else {
			setError(res.message);
		}
	};

	const handleEnable2FA = () => navigate("/twofa/enable");
	const handleDisable2FA = () => navigate("/twofa/disable");

	const togglePref = async (key, value) => {
		const body = { [key]: value };
		const res = await api("/api/v1/players/me/preferences", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (res.success) fetchPrefs();
	};

	const handleRevokeSession = async (sessionId) => {
		const res = await sendData(`/api/v1/auth/sessions/${sessionId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			}
		});
		if (res.success !== false) {
			setMsg("Session revoked");
			fetchSessions();
		} else {
			setError(res.message);
		}
	};

	const handleRevokeAllSessions = async () => {
		if (!confirm("Sign out from all other sessions?")) return;
		const res = await sendData("/api/v1/auth/sessions/revoke-all", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			}
		});
		if (res.success !== false) {
			setMsg(`All other sessions revoked`);
			fetchSessions();
		} else {
			setError(res.message);
		}
	};

	const handleChangePassword = async () => {
		setError(null);
		setMsg(null);
		const currentPassword = currentPwRef.current?.value;
		const newPassword = newPwRef.current?.value;
		if (!currentPassword || !newPassword) { setError("Both fields are required"); return; }
		if (newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }
		const res = await sendData("/api/v1/auth/password/change", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		if (res.success !== false) {
			setMsg("Password changed successfully");
			setChangingPassword(false);
		} else {
			setError(res.message || "Failed to change password");
		}
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen">
			<NavBar />
			<div className="max-w-lg mx-auto p-6 mt-6">
				<h1 className="text-xl font-bold mb-4">Profile</h1>

				{msg && <p className="msg-success mb-3">{msg}</p>}
				{error && <p className="msg-error mb-3">{error}</p>}

				{/* Avatar */}
				<div className="flex items-center gap-4 mb-6">
					{profile?.avatarUrl ? (
						<img src={profile.avatarUrl} alt="avatar" className="avatar" />
					) : (
						<div className="avatar bg-slate-700 flex items-center justify-center text-2xl">
							{(profile?.username || "?")[0].toUpperCase()}
						</div>
					)}
					<div className="flex flex-col gap-2">
						<input type="file" ref={avatarRef} accept="image/*" className="text-xs text-slate-400" onChange={handleAvatarUpload} />
						{profile?.avatarUrl && (
							<button onClick={handleDeleteAvatar} className="link text-xs">Remove avatar</button>
						)}
					</div>
				</div>

				{/* Profile info */}
				<div className="card mb-4">
					{!editing ? (
						<>
							<div className="mb-2"><span className="label">Username</span><p>{profile?.username}</p></div>
							<div className="mb-2"><span className="label">Display Name</span><p>{profile?.displayName}</p></div>
							<div className="mb-2"><span className="label">Email</span><p>{profile?.email || "—"}</p></div>
							<div className="mb-2">
								<span className="label">Status</span>
								<span className={`badge ${profile?.status === "online" ? "badge-green" : profile?.status === "in_game" ? "badge-blue" : "badge-gray"}`}>
									{profile?.status || "offline"}
								</span>
							</div>
							<div className="mb-2"><span className="label">Joined</span><p className="text-sm text-slate-400">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p></div>
							<hr className="divider" />
							<FormButton variant="secondary" onClick={() => setEditing(true)}>Edit Profile</FormButton>
						</>
					) : (
						<>
							<InputField label="Display Name" inputRef={displayNameRef} placeholder={profile?.displayName} />
							<div className="mt-3"></div>
							<InputField label="Email" type="email" inputRef={emailRef} placeholder={profile?.email} />
							<div className="flex gap-2 mt-4">
								<FormButton onClick={handleSave}>Save</FormButton>
								<FormButton variant="secondary" onClick={() => setEditing(false)}>Cancel</FormButton>
							</div>
						</>
					)}
				</div>

				{/* 2FA */}
				<div className="card mb-4">
					<h2 className="font-bold text-sm mb-2">Two-Factor Authentication</h2>
					<p className="msg-info mb-3">
						{currentUser.has2FAEnabled === "true" || currentUser.has2FAEnabled === true
							? "2FA is enabled on your account."
							: "Add extra security to your account."}
					</p>
					{currentUser.has2FAEnabled === "true" || currentUser.has2FAEnabled === true ? (
						<FormButton variant="danger" onClick={handleDisable2FA}>Disable 2FA</FormButton>
					) : (
						<FormButton onClick={handleEnable2FA}>Enable 2FA</FormButton>
					)}
				</div>

				{/* Change Password */}
				<div className="card mb-4">
					<h2 className="font-bold text-sm mb-2">Change Password</h2>
					{!changingPassword ? (
						<FormButton variant="secondary" onClick={() => setChangingPassword(true)}>Change Password</FormButton>
					) : (
						<>
							<InputField label="Current Password" type="password" inputRef={currentPwRef} />
							<div className="mt-3"></div>
							<InputField label="New Password" type="password" inputRef={newPwRef} />
							<div className="flex gap-2 mt-4">
								<FormButton onClick={handleChangePassword}>Save Password</FormButton>
								<FormButton variant="secondary" onClick={() => setChangingPassword(false)}>Cancel</FormButton>
							</div>
						</>
					)}
				</div>

				{/* Active Sessions */}
				<div className="card mb-4">
					<div className="flex items-center justify-between mb-3">
						<h2 className="font-bold text-sm">Active Sessions</h2>
						{sessions && sessions.length > 1 && (
							<button onClick={handleRevokeAllSessions} className="link text-xs text-red-400">
								Revoke all others
							</button>
						)}
					</div>
					{!sessions ? (
						<p className="text-sm text-slate-400">Loading sessions…</p>
					) : sessions.length === 0 ? (
						<p className="text-sm text-slate-400">No active sessions found.</p>
					) : (
						<div className="flex flex-col gap-2">
							{sessions.map((session) => {
								const isCurrentSession = session.isCurrent ?? session.current ?? false;
								const lastSeenAt = session.lastActiveAt ?? session.lastSeenAt ?? session.lastUsedAt ?? session.updatedAt;
								const lastSeen = lastSeenAt ? new Date(lastSeenAt).toLocaleString() : null;
								const createdAt = session.createdAt ? new Date(session.createdAt).toLocaleString() : null;
								return (
									<div
										key={session.id ?? session.sessionId}
										className="flex items-start justify-between gap-3 rounded-lg bg-slate-800 px-3 py-2"
									>
										<div className="flex flex-col gap-0.5 text-xs text-slate-300 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium truncate">
													{session.deviceInfo ?? session.userAgent ?? session.device ?? session.clientInfo ?? "Unknown device"}
												</span>
												{isCurrentSession && (
													<span className="badge badge-green shrink-0">Current</span>
												)}
											</div>
											{session.ipAddress && (
												<span className="text-slate-400">{session.ipAddress}</span>
											)}
											{createdAt && (
												<span className="text-slate-500">Started: {createdAt}</span>
											)}
											{lastSeen && !isCurrentSession && (
												<span className="text-slate-500">Last active: {lastSeen}</span>
											)}
										</div>
										{!isCurrentSession && (
											<button
												onClick={() => handleRevokeSession(session.id ?? session.sessionId)}
												className="link text-xs text-red-400 shrink-0 mt-0.5"
											>
												Revoke
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Preferences */}
				{prefs && (
					<div className="card mb-4">
						<h2 className="font-bold text-sm mb-3">Preferences</h2>
						<div className="flex flex-col gap-2">
							{[
								["soundEnabled", "Sound effects"],
								["musicEnabled", "Music"],
							].map(([key, label]) => (
								<label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
									<input type="checkbox" className="checkbox" checked={!!prefs[key]} onChange={(e) => togglePref(key, e.target.checked)} />
									{label}
								</label>
							))}
							{prefs.privacy && (
								<>
									<hr className="divider" />
									<p className="label">Privacy</p>
									{[
										["showOnlineStatus", "Show online status"],
										["allowFriendRequests", "Allow friend requests"],
										["showMatchHistory", "Show match history"],
										["showStatistics", "Show statistics"],
									].map(([key, label]) => (
										<label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
											<input
												type="checkbox"
												className="checkbox"
												checked={!!prefs.privacy[key]}
												onChange={(e) => togglePref("privacy", { ...prefs.privacy, [key]: e.target.checked })}
											/>
											{label}
										</label>
									))}
								</>
							)}
						</div>
					</div>
				)}

				{/* Danger zone */}
				<div className="card">
					<h2 className="font-bold text-sm mb-2 text-red-400">Danger Zone</h2>
					<FormButton variant="danger" onClick={handleDeleteAccount}>Delete Account</FormButton>
				</div>
			</div>
		</div>
	);
}
