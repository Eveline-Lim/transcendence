import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";

import BackButton from "../components/BackButton";

export default function TwoFACode() {
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
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
			setMessage("Entrez le code à six chiffres");
			return;
		}

		console.log("Code entered:", fullCode);
		const response = await sendData("/api/auth/2fa/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				code: fullCode })
			});

		console.log("response: \n", response);

		if (response.success) {
			setMessage("L'authentification à deux facteurs a été vérifiée avec succès");
			navigate("/");
		} else {
			setMessage("Erreur lors de la vérification du code. Veuillez réessayer.");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md mx-auto text-black">
				<BackButton to="/" />
				<p className="text-black font-bold mt-4 mb-4">Entrez le code</p>

				<div className="flex justify-center space-x-2 mb-4">
					{code.map((digit, index) => (
						<input
							key={index}
							ref={(el) => (inputsRef.current[index] = el)}
							type="text"
							maxLength="1"
							value={digit}
							onChange={(e) => handleChange(e.target.value, index)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							className="w-10 h-12 text-center border border-gray-300 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					))}
				</div>

				<p className="mt-3 mb-3 font-medium text-red-500">
					{message}
				</p>

				<button
					onClick={handleVerify}
					className="bg-blue-700 text-white font-bold px-4 py-2 rounded-lg w-full mb-2 cursor-pointer hover:bg-blue-600 transition"
				>
					Vérifier
				</button>
			</div>
		</div>
	);
}
