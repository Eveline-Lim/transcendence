import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateUsername, validateEmail } from "../utils/validators.js";
import { sendData } from "../sendData.jsx";

import InputField from "../components/InputField.jsx";
import FormButton from "../components/FormButton";

export default function AuthForm() {
	const [mode, setMode] = useState("login"); // login | signup
	const [error, setError] = useState({});
	const navigate = useNavigate();

	// LOGIN refs
	const loginIdentifierRef = useRef(null);
	const loginPasswordRef = useRef(null);

	// SIGNUP refs
	const signupUsernameRef = useRef(null);
	const signupDisplayNameRef = useRef(null);
	const signupPasswordRef = useRef(null);
	const signupEmailRef = useRef(null);

	const clearErrors = () => setError({});

	const handleSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		if (mode === "login") {
			const identifier = loginIdentifierRef.current.value.trim();
			const password = loginPasswordRef.current.value.trim();
			const newErrors = {};

			const isEmail = identifier.includes("@");
			if (isEmail && !validateEmail(identifier)) {
				newErrors.email = "Email invalide";
			} else if (!isEmail && !validateUsername(identifier)) {
				newErrors.username = "Nom d'utilisateur invalide";
			}

			// COMMENTED OUT TO SIMPLIFY TESTING
			// if (!validatePassword(password)) {
			// 	newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
			// }

			if (!password) {
				newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
			}

			if (Object.keys(newErrors).length > 0 ) {
				setError(newErrors);
				return;
			}

			console.log("LOGIN OK:", { identifier, password });

			const response = await sendData("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier,
					password
				})
			});

			console.log("API response:", response);

			if (response.success) {
				console.log("Login OK:", response.user);
				localStorage.setItem("token", response.accessToken);
				// navigate("/game", { replace: true });
				navigate("/twofaCode", { replace: true });
			} else {
				setError({ form: "Identifiants invalides" });
			}
		} else {
			const username = signupUsernameRef.current.value.trim();
			const displayName = signupDisplayNameRef.current.value.trim();
			const password = signupPasswordRef.current.value.trim();
			const email = signupEmailRef.current.value.trim();

			const newErrors = {};

			if (!validateUsername(username)) {
				newErrors.username = "Nom d'utilisateur invalide";
			}
			if (!displayName) {
				newErrors.displayName = "Pseudo invalide";
			}
			// COMMENTED OUT TO SIMPLIFY TESTING
			// if (!validatePassword(password)) {
			// 	newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
			// }
			if (!password) {
				newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
			}
			if (!validateEmail(email)) {
				newErrors.email = "Email invalide";
			}

			if (Object.keys(newErrors).length > 0) {
				setError(newErrors);
				return;
			}

			console.log("SIGNUP OK:", { username, displayName, password, email });

			const response = await sendData("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username,
					displayName,
					password,
					email
				}),
			});
			console.log("response: ", response.success);
			if (response.success) {
				console.log("Signup OK:", response.user);
				localStorage.setItem("token", response.accessToken);
				navigate("/game", { replace: true });
			} else {
				setError({ form: "Impossible de créer le compte : ces informations sont déjà associées à un compte existant." });
			}
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="flex justify-center bg-white border border-gray-200 w-96 p-6 rounded-md shadow-lg flex-col text-center text-black gap-4">
				<h1 className="text-2xl font-bold">{mode === "login" ? "Connexion" : "Inscription"}</h1>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
				{mode === "login" && (
				<>
					<InputField
						label="Nom d'utilisateur/Email"
						type="text"
						placeholder="Nom d'utilisateur/Email"
						inputRef={loginIdentifierRef}
						error={error.username || error.email}
						autoFocus
					/>
					<InputField
						label="Mot de passe"
						type="password"
						placeholder="Mot de passe"
						inputRef={loginPasswordRef}
						error={error.password}
					/>
					{error.form && <p className="text-red-500 text-left">{error.form}</p>}

					<FormButton type="submit">Connexion</FormButton>

					<button
						type="button"
						onClick={() => navigate("/password/forgot")}
						className="text-lg font-bold cursor-pointer hover:text-blue-600">
							Mot de passe oublié ?
					</button>

					<button
						type="button"
						onClick={() => {
							window.location.href = "http://localhost:3000/api/auth/oauth/fortytwo";
						}}
						className="flex items-center justify-center gap-3 border rounded-md py-3 text-xl text-black cursor-pointer hover:bg-gray-200">
						<p>Connexion avec</p>
						<img src="assets/42_Logo.svg" alt="Connexion avec 42" className="w-8"/>
					</button>

					<p
						onClick={() => {
							clearErrors();
							setMode("signup")
						}}
						className="text-lg cursor-pointer hover:text-blue-600 mt-2"
					>
						Pas encore inscrit ? Inscrivez-vous !
					</p>
				</>
				)}

				{mode == "signup" && (
					<>
					<InputField
						label="Nom d'utilisateur"
						type="text"
						placeholder="Nom d'utilisateur"
						inputRef={signupUsernameRef}
						error={error.username}
						autoFocus
					/>
					<InputField
						label="Pseudo"
						type="text"
						placeholder="Pseudo"
						inputRef={signupDisplayNameRef}
						error={error.displayName}
					/>
					<InputField
						label="Mot de passe"
						type="password"
						placeholder="Mot de passe"
						inputRef={signupPasswordRef}
						error={error.password}
					/>
					<InputField
						label="Email"
						type="email"
						placeholder="Email"
						inputRef={signupEmailRef}
						error={error.email}
					/>
					{error.form && <p className="text-red-500 text-left">{error.form}</p>}

					<FormButton type="submit">Enregistrer</FormButton>

					<p
						onClick={() => {
							clearErrors();
							setMode("login")}
						}
						className="text-lg cursor-pointer hover:text-blue-600 mt-2"
					>
						Déjà un compte ? Connectez-vous !
					</p>
					</>
				)}
				</form>
			</div>
		</div>
	);
}
