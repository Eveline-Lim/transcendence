import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function TwoFAQRCode() {
<<<<<<< HEAD
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState("");
	const inputsRef = useRef([]);

=======
	const { currentUser } = useContext(AuthContext);
	const [qrData, setQrData] = useState(null);
	const [error, setError] = useState(null);
>>>>>>> b9bc338 (feat: changing front)
	const navigate = useNavigate();

<<<<<<< HEAD
	const handleVerify = async (e) => {
		e.preventDefault();

		const fullCode = code.join("");

		if (fullCode.length !== 6) {
			setMessage("Entrez le code à six chiffres");
			setMessageType("error");
			return;
		}

		console.log("Code entered:", fullCode);

		try {
			const token = localStorage.getItem("token");
			console.log("2FA QRCODE TOKEN: \n", token);
			const response = await sendData("/api/auth/2fa/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					code: fullCode })
				});

			console.log("VERIFY response: \n", response);

			if (response.success) {
				setMessage("L'authentification à deux facteurs a été vérifiée avec succès");
				setMessageType("success");
				navigate("/");
			} else {
				setMessage("Code invalide. Veuillez réessayer.");
				setMessageType("error");
				setCode(Array(6).fill(""));
				inputsRef.current[0].focus();
			}
		} catch (error) {
			setMessage("Une erreur est survenue. Veuillez réessayer");
			setMessageType("error");
=======
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
>>>>>>> b9bc338 (feat: changing front)
		}
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to="/profile" />
				<h1 className="text-xl font-bold mb-1">Enable 2FA</h1>
				<p className="msg-info mb-4">Set up two-factor authentication</p>
				<hr className="divider" />

<<<<<<< HEAD
				<h1 className="text-2xl font-bold mt-4 mb-4">Authentification à deux facteurs</h1>
				<p className="text-black font-bold mb-4">Scannez le QR code et entrez le code</p>
				<img
					src={qrCodeUrl}
					alt="QR Code pour l’authentification à deux facteurs"
					className="mx-auto mb-4 w-48 h-48"
				/>

				<TwoFACodeInput
					value={code}
					onChange={setCode}
					length={6}
				/>
				<p className={`mt-3 mb-3 font-medium ${
					messageType === "success" ? "text-black" : "text-red-500"
				}`}>
					{message}
				</p>
				<FormButton onClick={handleVerify}>Vérifier</FormButton>
=======
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
>>>>>>> b9bc338 (feat: changing front)
			</div>
		</div>
	);
}
