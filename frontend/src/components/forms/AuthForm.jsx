import { useRef, useState } from "react";
import { validateUsername, validateEmail } from "../../utils/validators";

export async function sendData(route, options) {
	try {
		const response = await fetch(route, options);
		let data = null;
		try {
			data = await response.json();
		} catch {
			data = null;
		}

		if (!response.ok) {
			return {
				success: false,
				message: "Internal server error"
			};
		}
		return data;
	} catch (error) {
		return {
			success: false,
			message: "Internal server error"
		};
	}
}

export default function AuthForm() {
	const [mode, setMode] = useState("login"); // "login" | "signup"
	const [errors, setErrors] = useState({});

	// LOGIN refs
	const loginUsernameRef = useRef(null);
	const loginPasswordRef = useRef(null);

	// SIGNUP refs
	const signupUsernameRef = useRef(null);
	const signupPasswordRef = useRef(null);
	const signupDisplayNameRef = useRef(null);
	const signupEmailRef = useRef(null);

	const clearErrors = () => setErrors({});

	// LOGIN
	const handleLoginSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		const username = loginUsernameRef.current.value.trim();
		const password = loginPasswordRef.current.value.trim();

		const newErrors = {};

		if (!validateUsername(username)) {
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
			setErrors(newErrors);
			return;
		}

		console.log("LOGIN OK:", { username, password });
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
			setErrors(newErrors);
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
		} else {
			setErrors({ form: response.message });
		}
	};

	const inputClass = (hasError) =>
		`w-full rounded-md border px-4 py-3 text-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-500 ${hasError ? "border-red-500" : "border-gray-300"}`;

	return (
		<div className="flex justify-center bg-white border border-gray-200 w-96 p-6 rounded-md shadow-lg text-2xl flex-col text-center text-black">

			{/* LOGIN */}
			{mode === "login" && (
				<form onSubmit={handleLoginSubmit} className="flex flex-col w-full gap-4">
					<h1 className="text-2xl font-bold">Connexion</h1>

					<label className="text-left text-xl">Nom d'utilisateur</label>
					<input
						ref={loginUsernameRef}
						type="text"
						autoFocus
						placeholder="Nom d'utilisateur"
						className={inputClass(errors.username)}
					/>

					{errors.username && (<p className="text-red-500 text-lg text-left">{errors.username}</p>)}

					<label className="text-left text-xl">Mot de passe</label>
					<input
						ref={loginPasswordRef}
						type="password"
						placeholder="Mot de passe"
						className={inputClass(errors.password)}
					/>

					{errors.password && (<p className="text-red-500 text-lg text-left">{errors.password}</p>)}

					<button
						type="submit"
						className="text-white text-xl py-3 px-10 rounded-md bg-purple-700 hover:bg-purple-600 transition-colors"
					>
						Connexion
					</button>

					<p
						onClick={() => {
							setErrors({});
							setMode("signup")}
						}
						className="text-lg cursor-pointer"
					>
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
						className={inputClass(errors.username)}
					/>

					{errors.username && (
						<p className="text-red-500 text-lg text-left">{errors.username}</p>
					)}

					<label className="text-left text-xl">Pseudo</label>
					<input
						ref={signupDisplayNameRef}
						type="text"
						autoFocus
						placeholder="Pseudo"
						className={inputClass(errors.displayName)}
					/>

					{errors.displayName && (
						<p className="text-red-500 text-lg text-left">{errors.displayName}</p>
					)}

					<label className="text-left text-xl">Mot de passe</label>
					<input
						ref={signupPasswordRef}
						type="password"
						placeholder="Mot de passe"
						className={inputClass(errors.password)}
					/>

					{errors.password && (
						<p className="text-red-500 text-lg text-left">{errors.password}</p>
					)}

					<label className="text-left text-xl">Email</label>
					<input
						ref={signupEmailRef}
						type="email"
						placeholder="Email"
						className={inputClass(errors.email)}
					/>

					{errors.email && (
						<p className="text-red-500 text-lg text-left">{errors.email}</p>
					)}

					<button
						type="submit"
						className="text-white text-xl py-3 px-10 rounded-md bg-purple-700 hover:bg-purple-600 transition-colors"
					>
						Enregistrer
					</button>

					<p
						onClick={() => {
							setErrors({});
							setMode("login")}
						}
						className="text-lg cursor-pointer"
					>
						Déjà un compte ? Connectez-vous !
					</p>
				</form>
			)}
		</div>
	);
}
