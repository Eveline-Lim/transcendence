import { useRef, useEffect, useState } from "react";
// import { validatePassword } from "../../utils/validators";
import { useNavigate } from "react-router-dom";
import { sendData } from "../../sendData";

export default function ResetPassword() {
	const [error, setError] = useState({});
	const [token, setToken] = useState(null);
	const [success, setSuccess] = useState(false);

	const newPasswordRef = useRef(null);

	const clearErrors = () => setError({});

	const navigate = useNavigate();

	// Get token from URL when component loads
	useEffect(() => {
		const urlToken = new URLSearchParams(window.location.search).get("token");
		if (!urlToken) {
			setError({ form: "Token de réinitialisation invalide" });
		} else {
			setToken(urlToken);
		}
	}, []);

	const handleResetPasswordSubmit = async (e) => {
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

		const response = await sendData("/api/auth/password/reset", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token,
				password,
			}),
		});

		console.log("response: ", response);

		if (response.success) {
			setSuccess(true);

			// Redirect after 3 seconds
			setTimeout(() => {
				navigate("/", { replace: true });
			}, 3000);
		} else {
			setError({ form: "Lien expiré ou invalide" });
		}
	};

	const inputClass = (hasError) =>
		`w-full rounded-md border px-4 py-3 text-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${
			hasError ? "border-red-500" : "border-gray-300"
	}`;

	return (
		<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md mx-auto text-black">
			<button
				type="button"
				onClick={() => navigate("/")}
				className="absolute top-4 left-4 flex items-center text-black cursor-pointer">
				<svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="black" className="w-6 h-6">
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				<span className="ml-1 font-bold">Retour</span>
			</button>

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
				<form onSubmit={handleResetPasswordSubmit} className="w-full flex flex-col gap-6">
					<label className="text-left text-xl">Nouveau mot de passe</label>
					<input
						ref={newPasswordRef}
						type="password"
						autoFocus
						placeholder="Nouveau mot de passe"
						className={inputClass(error.password)}
					/>

					{error.password && (
						<p className="text-red-500 text-lg text-left">{error.password}</p>
					)}

					{error.form && (
						<p className="text-red-500 text-lg text-left">{error.form}</p>
					)}

					<button
						type="submit"
						className="text-white text-xl py-3 px-10 rounded-md bg-blue-700 hover:bg-blue-600 transition-colors cursor-pointer">
							Réinitialiser mon mot de passe
					</button>
				</form>
			)}
		</div>
	);
}
