import { useRef, useState } from "react";
import { validateEmail } from "../../utils/validators";
import { useNavigate } from "react-router-dom";
import { sendData } from "../../sendData";

export default function ForgotPassword() {
	const forgotPasswordEmailRef = useRef(null);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const clearErrors = () => setError({});

	const navigate = useNavigate();

	const handleForgotPasswordSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		const email = forgotPasswordEmailRef.current.value.trim();
		const newErrors = {};

		if (!validateEmail(email)) {
			newErrors.email = "Email invalide";
		}

		if (Object.keys(newErrors).length > 0) {
			setError(newErrors);
			return;
		}

		console.log("Reset password for:", email);

		const response = await sendData("/api/auth/password/forgot", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email
			})
		});

		setSuccess(true);
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

			<h1 className="text-2xl font-bold mt-4 mb-4">Mot de passe oublié ?</h1>

			{success && (
				<p className="text-lg text-center">
					Si un compte est associé à cette adresse e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.
				</p>
			)}

			{!success && (
				<form onSubmit={handleForgotPasswordSubmit} className="w-full flex flex-col gap-6">
					<label className="text-left text-xl">Email</label>
					<input
						ref={forgotPasswordEmailRef}
						type="email"
						autoFocus
						placeholder="Email"
						className={inputClass(error.email)}
					/>

					{error.email && (
						<p className="text-red-500 text-lg text-left">{error.email}</p>
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
