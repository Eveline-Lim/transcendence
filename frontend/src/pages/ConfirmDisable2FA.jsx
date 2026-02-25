import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext";

import BackButton from "../components/BackButton";
import FormButton from "../components/FormButton.jsx";
import TwoFACodeInput from "../components/TwoFACodeInput.jsx";
import InputField from "../components/InputField.jsx";

export default function ConfirmDisable2FA() {
	const { login } = useContext(AuthContext);
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const passwordRef = useRef(null);
	const navigate = useNavigate();

	const handleVerify = async (e) => {
		e.preventDefault();

		const fullCode = code.join("");
		const password = passwordRef.current.value.trim();

		if (fullCode.length !== 6) {
			setMessage("Entrez le code à six chiffres");
			return;
		}

		if (!password) {
			setMessage("Entrez votre mot de passe actuel");
			return;
		}

		try {
			const token = localStorage.getItem("token");
			const response = await sendData("/api/auth/2fa/disable", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					code: fullCode,
					password,
				}),
			});

			console.log("CONFIRMATION 2FA DISABLE response: \n", response);

			if (!response.success) {
				setMessage("Code ou mot de passe incorrect");
				return;
			}
			setMessage("L'authentification à deux facteurs a été désactivée");
			login(response.user, response.accessToken);
			setTimeout(() => {
				navigate("/game", { replace: true });
			}, 2500);
		} catch (error) {
			setMessage("Une erreur est survenue. Veuillez réessayer");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md mx-auto text-black w-full">
				<BackButton to="/profile" />
				<h1 className="text-xl font-bold mt-4 mb-4">Désactiver l'authentification à deux facteurs</h1>

				<form onSubmit={handleVerify} className="w-full flex flex-col gap-6">

					{/* TOTP Code */}
					<div className="flex flex-col items-center">
						<p className="mb-2 text-lg font-bold">Code de vérification</p>
						<TwoFACodeInput
							value={code}
							onChange={setCode}
							length={6}
						/>
					</div>

					{/* Password Confirmation */}
					<InputField
						label="Mot de passe actuel"
						type="password"
						placeholder="Entrez votre mot de passe"
						inputRef={passwordRef}
					/>

					{message && (<p className="text-red-500 text-center">{message}</p>)}

					<FormButton type="submit">
						Confirmer la désactivation
					</FormButton>
				</form>
			</div>
		</div>
	);
}
