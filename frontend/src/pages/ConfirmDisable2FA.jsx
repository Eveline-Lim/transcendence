import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";
import InputField from "../components/InputField.jsx";

export default function ConfirmDisable2FA() {
	const { currentUser, updateUser } = useContext(AuthContext);
	const [error, setError] = useState(null);
	const [msg, setMsg] = useState(null);
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleDisable = async () => {
		setError(null);
		if (!code || !password) {
			setError("Please enter your 2FA code and password");
			return;
		}
		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/disable", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ code, password }),
		});
		if (res.success !== false) {
			updateUser({ ...currentUser, has2FAEnabled: "false" });
			setMsg("2FA disabled");
			setTimeout(() => navigate("/profile", { replace: true }), 1500);
		} else {
			setError(res.message || "Failed to disable 2FA");
		}
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to="/profile" />
				<h1 className="text-xl font-bold mb-1">Disable 2FA</h1>
				<p className="msg-info mb-4">Enter your current 2FA code and password to confirm.</p>
				<hr className="divider" />
				{error && <p className="msg-error mb-3">{error}</p>}
				{msg && <p className="msg-success mb-3">{msg}</p>}
				<InputField
					label="2FA Code"
					type="text"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="6-digit code"
				/>
				<InputField
					label="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Your password"
				/>
				<div className="flex gap-3 justify-center mt-4">
					<FormButton variant="danger" onClick={handleDisable}>Confirm Disable</FormButton>
					<FormButton variant="secondary" onClick={() => navigate("/profile")}>Cancel</FormButton>
				</div>
			</div>
		</div>
	);
}
