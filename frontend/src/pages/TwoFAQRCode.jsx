import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendData } from "../sendData.jsx";

import BackButton from "../components/BackButton";
import FormButton from "../components/FormButton.jsx";
import TwoFACodeInput from "../components/TwoFACodeInput.jsx";

export default function TwoFAQRCode() {
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState("");
	const inputsRef = useRef([]);

	const navigate = useNavigate();
	const location = useLocation();
	const { qrCodeUrl } = location.state || {};
	if (!qrCodeUrl) {
		return <div>QR Code introuvable</div>;
	}

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
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md w-full mx-auto text-black">
				<BackButton to="/game" />

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
			</div>
		</div>
	);
}
