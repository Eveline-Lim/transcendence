import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";

import InputField from "../components/InputField.jsx";
import FormButton from "../components/FormButton";
// import BackButton from "../components/BackButton";

export default function ResetPassword() {
	const [error, setError] = useState({});
	const [token, setToken] = useState(null);
	const [success, setSuccess] = useState(false);

	const newPasswordRef = useRef(null);
	const navigate = useNavigate();

	const clearErrors = () => setError({});

	// Get token from URL on mount
	useEffect(() => {
		const urlToken = new URLSearchParams(window.location.search).get("token");
		if (!urlToken) {
			setError({ form: "Token de réinitialisation invalide" });
			setTimeout(() => {
				navigate("/404", { replace: true });
			}, 1000);
		} else {
			setToken(urlToken);
		}
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		if (!token) {
			setError({ form: "Token invalide" });
			return;
		}

		const password = newPasswordRef.current.value.trim();
		const newErrors = {};

		// COMMENTED OUT TO SIMPLIFY TESTING
		// if (!validatePassword(password)) {
		// 	newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
		// }
		if (!password) {
			newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
		}

		if (Object.keys(newErrors).length > 0) {
			setError(newErrors);
			return;
		}

		console.log("new password: ", password);

		try {
			const response = await sendData("/api/auth/password/reset", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token,
					password
				}),
			});

			console.log("response: ", response);

			if (response.success) {
				setSuccess(true);
				// Redirect after 3 seconds
				setTimeout(() => {
					navigate("/", { replace: true });
				}, 2500);
			} else {
				setError({ form: "Lien expiré ou invalide" });
			}
		} catch (error) {
			setError({ form: "Une erreur est survenue. Veuillez réessayer" });
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md w-full mx-auto text-black">
				{/* <BackButton /> */}

				<h1 className="text-2xl font-bold mt-4 mb-4">Réinitialisation du mot de passe</h1>

				{success && (
					<p className="text-lg text-center">
						Le mot de passe a été bien réinitialisé.
						<br />
						<span className="text-sm">
							Redirection automatique...
						</span>
					</p>
				)}
				{!success && (
					<form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
						<InputField
							label="Nouveau mot de passe"
							type="password"
							placeholder="Nouveau mot de passe"
							inputRef={newPasswordRef}
							error={error.password}
							autoFocus
						/>

						{error.form && <p className="text-red-500 text-lg text-left">{error.form}</p>}

						<FormButton>Réinitialiser mon mot de passe</FormButton>
					</form>
				)}
			</div>
		</div>
	);
}
