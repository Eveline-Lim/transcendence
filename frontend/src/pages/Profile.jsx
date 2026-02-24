import { useRef, useState} from "react";
import { useNavigate } from "react-router-dom";
import { validateUsername, validateEmail } from "../utils/validators.js";
import { sendData } from "../sendData.jsx";

import InputField from "../components/InputField";
import FormButton from "../components/FormButton";
import BackButton from "../components/BackButton";

export default function ProfilePage() {
	const usernameRef = useRef(null);
	const displayNameRef = useRef(null);
	const passwordRef = useRef(null);
	const emailRef = useRef(null);

	const [error, setError] = useState({});
	const [avatar, setAvatar] = useState(null);
	const [enable2FA, setEnable2FA] = useState(false);

	const navigate = useNavigate();
	const clearErrors = () => setError({});

	const handleSubmit = async (e) => {
		e.preventDefault();
		clearErrors();

		const username = usernameRef.current.value.trim();
		const displayName = displayNameRef.current.value.trim();
		const password = passwordRef.current.value.trim();
		const email = emailRef.current.value.trim();

		const newErrors = {};

		if (username && !validateUsername(username)) {
			newErrors.username = "Nom d'utilisateur invalide";
		}
		if (displayName && !displayName) {
			newErrors.displayName = "Pseudo invalide";
		}
		// COMMENTED OUT TO SIMPLIFY TESTING
		// if (!validatePassword(password)) {
		// 	newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
		// }
		if (password && !password) {
			newErrors.password = "Mot de passe invalide (6–15 caractères, majuscule, minuscule, chiffre, caractère spécial)";
		}
		if (email && !validateEmail(email)) {
			newErrors.email = "Email invalide";
		}

		if (Object.keys(newErrors).length > 0) {
			setError(newErrors);
			return;
		}

		const formData = new FormData();
		if (username) {
			formData.append("username", username);
		}
		if (displayName) {
			formData.append("displayName", displayName);
		}
		if (password) {
			formData.append("password", password);
		}
		if (email) {
			formData.append("email", email);
		}
		if (enable2FA) {
			formData.append("enable2FA", enable2FA);
		}
		if (avatar) {
			formData.append("avatar", avatar);
		}
		console.log("username: \n", username);
		console.log("pseudo: \n", displayName);
		console.log("password: ", password);
		console.log("email: ", email);
		console.log("avatar: ", avatar);
		console.log("2FA: ", enable2FA);

		for (let [key, value] of formData.entries()) {
			console.log("FORM DATA: ", key, value);
		}

		// try {
		// 	const response = await sendData("/api/players/me", {
		// 		method: "PATCH",
		// 		body: formData
		// 	});
		// 	if (response.success) {
		// 		console.log("MODIFY PROFILE: \n", response);
		// 	} else {
		// 		console.log("MODIFY PROFILE FAILED\n");
		// 		navigate("/game");
		// 	}
		// } catch (error) {
		// 	console.error("Erreur lors de la mise à jour du profile de l'utilisateur", error);
		// }

		// If enabling 2FA
		if (enable2FA) {
			try {
				const token = localStorage.getItem("token");
				console.log("ENABLE 2FA TOKEN: \n", token);
				const twoFAResponse = await sendData("/api/auth/2fa/enable", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				console.log("2FA response: \n", twoFAResponse);
				if (twoFAResponse.success) {
					navigate("/qrCode", {
						state: {
							secret: twoFAResponse.secret,
							qrCodeUrl: twoFAResponse.qrCodeUrl,
							backupCodes: twoFAResponse.backupCodes
						},
					});
				} else {
					console.log("DISPLAY 2FA QRCODE FAILED\n");
				}
			} catch (error) {
				console.error("Erreur lors de la mise à jour du profile de l'utilisateur", error);
			}
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-stone-100">
			<form
				onSubmit={handleSubmit}
				className="relative bg-white rounded-xl shadow-lg p-8 w-105 flex flex-col gap-6"
			>
				<BackButton to="/game"/>
				<h1 className="text-2xl font-bold text-center">
					Mon profil
				</h1>

				{/* Avatar */}
				<div className="flex flex-col items-center gap-3">
					<h2 className="text-xl font-semibold">Photo de profil</h2>
					<img
						src="../assets/avatar.jpg"
						alt="Avatar de l'utilisateur"
						className="w-32 h-32 rounded-full border border-gray-400 object-cover"
					/>
					<label
						for="profile_photo"
						className="font-semibold cursor-pointer">Changer la photo</label>
					<input
						type="file"
						accept="image/*"
						onChange={(e) => setAvatar(e.target.files[0])}
						className="cursor-pointer"
					/>
				</div>

				<InputField
					label="Nouveau nom d'utilisateur"
					type="text"
					placeholder="Nom d'utilisateur"
					inputRef={usernameRef}
					error={error.username}
					autoFocus
				/>
				<InputField
					label="Pseudo"
					type="text"
					placeholder="Pseudo"
					inputRef={displayNameRef}
					error={error.displayName}
				/>
				<InputField
					label="Mot de passe"
					type="password"
					placeholder="Mot de passe"
					inputRef={passwordRef}
					error={error.password}
				/>
				<InputField
					label="Email"
					type="email"
					placeholder="Email"
					inputRef={emailRef}
					error={error.email}
				/>

				{/* 2FA */}
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={enable2FA}
						onChange={() => setEnable2FA(!enable2FA)}
						className="w-5 h-5 cursor-pointer"
					/>
					<span>Activer l'authentification à deux facteurs</span>
				</div>
				<FormButton type="submit">Modifier le profil</FormButton>
			</form>
		</div>
	);
}
