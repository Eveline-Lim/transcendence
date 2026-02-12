import { useRef, useState } from "react";
import { validateUsername, validateEmail } from "../../utils/validators";
import { useNavigate } from "react-router-dom";
import { sendData } from "../../sendData";

export default function AuthForm() {
	const [mode, setMode] = useState("login"); // "login" | "signup"
	const [error, setError] = useState({});

	// LOGIN refs
	const loginUsernameRef = useRef(null);
	const loginPasswordRef = useRef(null);

	// SIGNUP refs
	const signupUsernameRef = useRef(null);
	const signupPasswordRef = useRef(null);
	const signupDisplayNameRef = useRef(null);
	const signupEmailRef = useRef(null);

	const clearErrors = () => setError({});

	const navigate = useNavigate();

	// LOGIN
	const handleLoginSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		const identifier = loginUsernameRef.current.value.trim();
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

		if (Object.keys(newErrors).length > 0) {
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
			navigate("/game", { replace: true });
		} else {
			setError({ form: "Aucun compte n'est asscocié à cet utilisateur" });
		}
	};

	// SIGNUP
	const handleSignupSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

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
			})
		});

		if (response.success) {
			console.log("Signup OK:", response.user);
			navigate("/game", { replace: true });
		} else {
			setError({ form: "Impossible de créer le compte : ces informations sont déjà associées à un compte existant." });
		}
	};

	const inputClass = (hasError) =>
		`w-full rounded-md border px-4 py-3 text-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? "border-red-500" : "border-gray-300"}`;

	return (
		<div className="flex justify-center bg-white border border-gray-200 w-96 p-6 rounded-md shadow-lg text-2xl flex-col text-center text-black">

			{/* LOGIN */}
			{mode === "login" && (
				<form onSubmit={handleLoginSubmit} className="flex flex-col w-full gap-4">
					<h1 className="text-2xl font-bold">Connexion</h1>

					<label className="text-left text-xl">Nom d'utilisateur/Email</label>
					<input
						ref={loginUsernameRef}
						type="text"
						autoFocus
						placeholder="Nom d'utilisateur/Email"
						className={inputClass(error.username)}
					/>

					{error.username && (<p className="text-red-500 text-lg text-left">{error.username}</p>)}

					<label className="text-left text-xl">Mot de passe</label>
					<input
						ref={loginPasswordRef}
						type="password"
						placeholder="Mot de passe"
						className={inputClass(error.password)}
					/>

					{error.password && (<p className="text-red-500 text-lg text-left">{error.password}</p>)}

					<button
						type="submit"
						className="text-white text-xl py-3 px-10 rounded-md cursor-pointer bg-blue-700 hover:bg-blue-600">
						Connexion
					</button>

					<button
						type="button"
						onClick={() => navigate("/password/forgot")}
						className="text-lg font-bold cursor-pointer hover:text-blue-600">
						Mot de passe oublié ?
					</button>

					{error.form && (<p className="text-red-500 text-lg text-left">{error.form}</p>)}

					<button
						type="button"
						className="flex items-center justify-center gap-3 border rounded-md py-3 text-xl text-black cursor-pointer hover:bg-gray-200">
						<p>Connexion avec</p>
						<img src="./src/assets/42_Logo.svg" alt="Connexion avec 42" className="w-8"/>
					</button>

					<p
						onClick={() => {
							setError({});
							setMode("signup")}
						}
						className="text-lg cursor-pointer">
						Pas encore inscrit ? Inscrivez-vous !
					</p>
				</form>
			)}

			{/* SIGNUP */}
			{mode === "signup" && (
				<form onSubmit={handleSignupSubmit} className="flex flex-col w-full gap-4">
					<h1 className="text-2xl font-bold">Inscription</h1>

					<label className="text-left text-xl">Nom d'utilisateur</label>
					<input
						ref={signupUsernameRef}
						type="text"
						autoFocus
						placeholder="Nom d'utilisateur"
						className={inputClass(error.username)}
					/>

					{error.username && (
						<p className="text-red-500 text-lg text-left">{error.username}</p>
					)}

					<label className="text-left text-xl">Pseudo</label>
					<input
						ref={signupDisplayNameRef}
						type="text"
						autoFocus
						placeholder="Pseudo"
						className={inputClass(error.displayName)}
					/>

					{error.displayName && (
						<p className="text-red-500 text-lg text-left">{error.displayName}</p>
					)}

					<label className="text-left text-xl">Mot de passe</label>
					<input
						ref={signupPasswordRef}
						type="password"
						placeholder="Mot de passe"
						className={inputClass(error.password)}
					/>

					{error.password && (
						<p className="text-red-500 text-lg text-left">{error.password}</p>
					)}

					<label className="text-left text-xl">Email</label>
					<input
						ref={signupEmailRef}
						type="email"
						placeholder="Email"
						className={inputClass(error.email)}
					/>

					{error.email && (
						<p className="text-red-500 text-lg text-left">{error.email}</p>
					)}

					{error.form && (<p className="text-red-500 text-lg text-left">{error.form}</p>)}

					<button
						type="submit"
						className="text-white text-xl py-3 px-10 rounded-md cursor-pointer bg-blue-700 hover:bg-blue-600 transition-colors">
						Enregistrer
					</button>

					<p
						onClick={() => {
							setError({});
							setMode("login")}
						}
						className="text-lg cursor-pointer">
						Déjà un compte ? Connectez-vous !
					</p>
				</form>
			)}
		</div>
	);
}
