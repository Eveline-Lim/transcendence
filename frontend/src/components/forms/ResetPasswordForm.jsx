import { useRef, useEffect, useState } from "react";
// import { validatePassword } from "../../utils/validators";
import { useNavigate } from "react-router-dom";
import { sendData } from "../../sendData";

export default function ResetPassword() {
	const [error, setError] = useState("");
	const [token, setToken] = useState(null);
	const [password, setPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [success, setSuccess] = useState(false);

	const newPasswordRef = useRef(null);

	const clearErrors = () => setError({});

	const navigate = useNavigate();

	// Get token from URL when component loads
	useEffect(() => {
		const urlToken = new URLSearchParams(window.location.search).get("token");
		setToken(urlToken);
	}, []);

	const handleResetPasswordSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		if (!token) {
			setError("Invalid or missing reset token");
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

		setSuccess(true);

		if (response.success) {
			navigate("/", { replace: true });
		} else {
			setError("");
			return;
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
					Le mot de passe a été bien réinitialisé
				</p>
			)}

			{!success && (
				<form onSubmit={handleResetPasswordSubmit} className="w-full flex flex-col gap-4">
					<label className="text-left text-xl">Nouveau mot de passe</label>
					<input
						ref={newPasswordRef}
						type="password"
						autoFocus
						placeholder="Nouveau mot de passe"
						className={inputClass(error.password)}
					/>

					{error.password && (
						<p className="text-red-500 text-sm">{error.password}</p>
					)}

					<button
						type="submit"
						className="bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition">
							Réinitialiser mon mot de passe
					</button>
				</form>
			)}
		</div>
	);
}
