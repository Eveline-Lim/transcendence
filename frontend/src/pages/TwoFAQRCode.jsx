import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function TwoFAQRCode() {
	const { currentUser, authLoading } = useContext(AuthContext);
	const [qrData, setQrData] = useState(null);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const enable2FA = async () => {
		setError(null);
		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/enable", {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.qrCodeUrl) {
			setQrData(res);
		} else {
			setError(res.message || "Failed to enable 2FA");
		}
	};

	if (authLoading || !currentUser) return null;

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to="/profile" />
				<h1 className="text-xl font-bold mb-1">Enable 2FA</h1>
				<p className="msg-info mb-4">Set up two-factor authentication</p>
				<hr className="divider" />

				{!qrData ? (
					<>
						<p className="text-sm mb-4">Click below to generate a QR code for your authenticator app.</p>
						{error && <p className="msg-error mb-3">{error}</p>}
						<FormButton onClick={enable2FA}>Generate QR Code</FormButton>
					</>
				) : (
					<>
						<p className="text-sm mb-3">Scan this QR code with your authenticator app:</p>
					{qrData.qrCodeUrl && (
						<img src={qrData.qrCodeUrl} alt="2FA QR Code" className="mx-auto mb-3 rounded" style={{ maxWidth: "200px" }} />
						)}
						{qrData.secret && (
							<p className="text-xs text-slate-400 mb-3">
								Manual key: <code className="bg-slate-800 px-2 py-1 rounded">{qrData.secret}</code>
							</p>
						)}
						{qrData.backupCodes && (
							<div className="mb-3">
								<p className="label mb-1">Backup Codes (save these!)</p>
								<div className="bg-slate-800 p-2 rounded text-xs font-mono">
									{qrData.backupCodes.map((c, i) => <div key={i}>{c}</div>)}
								</div>
							</div>
						)}
						<FormButton onClick={() => navigate("/twofaCode", { state: { verifying: true } })}>
							Verify Code
						</FormButton>
					</>
				)}
			</div>
		</div>
	);
}
