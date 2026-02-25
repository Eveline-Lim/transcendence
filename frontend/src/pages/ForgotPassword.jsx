import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateEmail } from "../utils/validators.js";
import { sendData } from "../sendData.jsx";

import BackButton from "../components/BackButton";
import FormButton from "../components/FormButton";
import InputField from "../components/InputField.jsx";

export default function ForgotPassword() {
	const emailRef = useRef(null);
	const [error, setError] = useState({});
	const [success, setSuccess] = useState(false);
	const navigate = useNavigate();

	const clearErrors = () => setError({});

	const handleSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		const email = emailRef.current.value.trim();
		const newErrors = {};

		if (!validateEmail(email)) {
			newErrors.email = "Email invalide";
		}
		if (Object.keys(newErrors).length > 0) {
			return setError(newErrors);
		}

		console.log("Reset password for:", email);

		try {
			await sendData("/api/auth/password/forgot", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email
				}),
			});

			setSuccess(true);
			// Redirect after 3 seconds
			setTimeout(() => {
				navigate("/", { replace: true });
			}, 2500);
		} catch (error) {
			setError({ form: "Une erreur est survenue. Veuillez réessayer" });
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md w-full mx-auto text-black">
				<BackButton />

				<h1 className="text-2xl font-bold mt-4 mb-4">Mot de passe oublié ?</h1>

				{success && (
					<p className="text-lg text-center">
						Si un compte est associé à cette adresse e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.
					</p>
				)}
				{!success && (
					<form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
						<InputField
							label="Email"
							type="email"
							placeholder="Email"
							inputRef={emailRef}
							error={error.email}
							autoFocus
						/>

						<FormButton>Réinitialiser mon mot de passe</FormButton>
					</form>
				)}
			</div>
		</div>
	);
}
