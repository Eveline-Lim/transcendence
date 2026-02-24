// import TwoFACodeInput from "../components/TwoFACodeInput";

// export default function TwoFAQRCode() {
// 	return (
// 		<TwoFACodeInput
// 			title="Authentification à deux facteurs"
// 			description="Scannez le QR code avec votre application, puis entrez le code généré."
// 			backTo="/game"
// 		>
// 			<img
// 				src="" // replace with dynamic QR
// 				alt="QR Code pour l'authentification à deux facteurs"
// 				className="mb-6 w-48 h-48 rounded-md border border-gray-200"
// 			/>
// 		</TwoFACodeInput>
// 	);
// }

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";

import BackButton from "../components/BackButton";

export default function TwoFAQRCode() {
	const [code, setCode] = useState(Array(6).fill(""));
	const [error, setError] = useState("");
	const inputsRef = useRef([]);

	const navigate = useNavigate();

	const handleChange = (value, index) => {
		if (!/^[0-9]?$/.test(value)) {
			return;
		}

		const newCode = [...code];
		newCode[index] = value;
		setCode(newCode);

		// Move to next input automatically
		if (value && index < 5) {
			inputsRef.current[index + 1].focus();
		}
	};

	const handleKeyDown = (e, index) => {
		// Go back on backspace
		if (e.key === "Backspace" && !code[index] && index > 0) {
			inputsRef.current[index - 1].focus();
		}
	};

	const handleVerify = async (e) => {
		e.preventDefault();

		const fullCode = code.join("");

		if (fullCode.length !== 6) {
			setError("Entrez le code à six chiffres");
			return;
		}

		console.log("Code entered:", fullCode);

		try {
			const response = await sendData("/api/auth/2fa/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: fullCode })
				});

			console.log("response: \n", response);

			if (response.success) {
				setError("L'authentification à deux facteurs a été vérifiée avec succès");
				navigate("/");
			} else {
				setError("Code invalide. Veuillez réessayer.");
				setCode(Array(6).fill(""));
				inputsRef.current[0].focus();
			}
		} catch (error) {
			setError("Une erreur est survenue. Veuillez réessayer");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md w-full mx-auto text-black">
				<BackButton to="/game" />

				<h1 className="text-2xl font-bold mt-4 mb-4">Authentification à deux facteurs</h1>
				<p className="text-black font-bold mb-4">Scannez le QR code et entrez le code</p>
				<img
					src="" // replace with dynamic QR
					alt="QR Code pour l’authentification à deux facteurs"
					className="mx-auto mb-4 w-48 h-48"
				/>

				<div className="flex justify-center space-x-2 mb-4">
					{code.map((digit, index) => (
						<input
							key={index}
							ref={(el) => (inputsRef.current[index] = el)}
							type="text"
							maxLength="1"
							value={digit}
							autoFocus={index === 0}
							onChange={(e) => handleChange(e.target.value, index)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							className="w-10 h-12 text-center border border-gray-300 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					))}
				</div>

				<p className="mt-2 h-5 font-medium text-red-500">
					{error}
				</p>

				<button
					type="submit"
					onClick={handleVerify}
					className="bg-blue-700 text-white font-bold px-4 py-2 rounded-lg w-full mb-2 cursor-pointer hover:bg-blue-800 transition"
				>
					Vérifier
				</button>
			</div>
		</div>
	);
}
