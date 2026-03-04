import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../utils/api";
import NavBar from "../components/NavBar";
import FormButton from "../components/FormButton";
import InputField from "../components/InputField";

export default function Profile() {
	const { currentUser, updateUser, logout } = useContext(AuthContext);
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [editing, setEditing] = useState(false);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);
	const [prefs, setPrefs] = useState(null);
	const displayNameRef = useRef(null);
	const emailRef = useRef(null);
	const avatarRef = useRef(null);

	useEffect(() => {
		if (!currentUser) { navigate("/", { replace: true }); return; }
		fetchProfile();
		fetchPrefs();
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
