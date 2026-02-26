import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function ConfirmDisable2FA() {
	const { currentUser, updateUser } = useContext(AuthContext);
	const [error, setError] = useState(null);
	const [msg, setMsg] = useState(null);
	const navigate = useNavigate();

	const handleDisable = async () => {
		setError(null);
		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/disable", {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
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
				<p className="msg-info mb-4">This will remove two-factor authentication from your account.</p>
				<hr className="divider" />
				{error && <p className="msg-error mb-3">{error}</p>}
				{msg && <p className="msg-success mb-3">{msg}</p>}
				<div className="flex gap-3 justify-center">
					<FormButton variant="danger" onClick={handleDisable}>Confirm Disable</FormButton>
					<FormButton variant="secondary" onClick={() => navigate("/profile")}>Cancel</FormButton>
				</div>
			</div>
		</div>
	);
}
