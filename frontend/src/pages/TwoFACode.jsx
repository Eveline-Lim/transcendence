import { useRef, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import TwoFACodeInput from "../components/TwoFACodeInput.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function TwoFACode() {
	const codeRef = useRef(null);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();
	const { login, updateUser, currentUser } = useContext(AuthContext);
	const isVerifying = location.state?.verifying;

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		const code = codeRef.current?.value?.trim();
		if (!code || code.length !== 6) { setError("Enter 6-digit code"); return; }

		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ code }),
		});

		if (res.success !== false) {
			if (isVerifying && currentUser) {
				updateUser({ ...currentUser, has2FAEnabled: "true" });
				navigate("/profile", { replace: true });
			} else if (res.accessToken) {
				login(res.user, res.accessToken);
				navigate("/home", { replace: true });
			} else {
				navigate("/home", { replace: true });
			}
		} else {
			setError(res.message || "Invalid code");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to={isVerifying ? "/twofa/enable" : "/"} />
				<h1 className="text-xl font-bold mb-1">
					{isVerifying ? "Verify 2FA Setup" : "Two-Factor Authentication"}
				</h1>
				<p className="msg-info mb-4">Enter the 6-digit code from your authenticator app</p>
				<hr className="divider" />
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<TwoFACodeInput codeRef={codeRef} />
					{error && <p className="msg-error">{error}</p>}
					<FormButton type="submit">Verify</FormButton>
				</form>
			</div>
		</div>
	);
}
