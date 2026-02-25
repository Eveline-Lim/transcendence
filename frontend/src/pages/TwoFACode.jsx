import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext";

import BackButton from "../components/BackButton";
import FormButton from "../components/FormButton.jsx";
import TwoFACodeInput from "../components/TwoFACodeInput.jsx";

export default function TwoFACode() {
	const { login } = useContext(AuthContext);
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const navigate = useNavigate();

	const handleVerify = async (e) => {
		e.preventDefault();

		const fullCode = code.join("");

		if (fullCode.length !== 6) {
			setMessage("Entrez le code à six chiffres");
			return;
		}

		console.log("Code entered:", fullCode);

		try {
			const token = localStorage.getItem("token");
			console.log("2FA CODE: \n", token);
			const response = await sendData("/api/auth/2fa/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					code: fullCode })
				});

			console.log("response: \n", response);

			if (response.success) {
				setMessage("L'authentification à deux facteurs a été vérifiée avec succès");
				login(response.user, response.accessToken);
				setTimeout(() => {
					navigate("/game", { replace: true });
				}, 2500);
			} else {
				setMessage("Erreur lors de la vérification du code. Veuillez réessayer.");
			}
		} catch (error) {
			setMessage("Une erreur est survenue. Veuillez réessayer");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md mx-auto text-black">
				<BackButton to="/" />
				<p className="text-black font-bold mt-4 mb-4">Entrez le code</p>

				<TwoFACodeInput
					value={code}
					onChange={setCode}
					length={6}
				/>

				<p className="mt-3 mb-3 font-medium text-red-500">
					{message}
				</p>
				<FormButton onClick={handleVerify}>Vérifier</FormButton>
			</div>
		</div>
	);
}
