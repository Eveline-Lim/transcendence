import { useRef, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { validateUsername, validateEmail } from "../utils/validators.js";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext";

import InputField from "../components/InputField";
import FormButton from "../components/FormButton";
import BackButton from "../components/BackButton";

export default function ProfilePage() {
	const { currentUser, updateUser } = useContext(AuthContext);
	const navigate = useNavigate();

	const usernameRef = useRef(null);
	const displayNameRef = useRef(null);
	const passwordRef = useRef(null);
	const emailRef = useRef(null);

	const [error, setError] = useState({});
	const [avatar, setAvatar] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(null);
	const [enable2FA, setEnable2FA] = useState(false);
	const [initial2FA, setInitial2FA] = useState(false);

	const clearErrors = () => setError({});

	console.log("CURRENT USER: ", currentUser);

	// Initialize from currentUser
	useEffect(() => {
		if (currentUser) {
			setEnable2FA(currentUser.has2FAEnabled);
			setInitial2FA(currentUser.has2FAEnabled);
			setAvatarPreview(currentUser.avatarUrl || null);
		}
	}, [currentUser]);

	if (!currentUser) {
		return
	}

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

		const token = localStorage.getItem("token");

		// ================= PROFILE UPDATE =================
		// try {
		// 	const formData = new FormData();

		// if (username) {
		// 	formData.append("username", username);
		// }
		// if (displayName) {
		// 	formData.append("displayName", displayName);
		// }
		// if (password) {
		// 	formData.append("password", password);
		// }
		// if (email) {
		// 	formData.append("email", email);
		// }
		// if (enable2FA) {
		// 	formData.append("enable2FA", enable2FA);
		// }
		// if (avatar) {
		// 	formData.append("avatar", avatar);
		// }

		// console.log("username: \n", username);
		// console.log("pseudo: \n", displayName);
		// console.log("password: ", password);
		// console.log("email: ", email);
		// console.log("avatar: ", avatar);
		// console.log("2FA: ", enable2FA);

		// for (let [key, value] of formData.entries()) {
		// 	console.log("FORM DATA: ", key, value);
		// }

		// 	const response = await sendData("/api/users/update", {
		// 		method: "PATCH",
		// 		headers: {
		// 			Authorization: `Bearer ${token}`,
		// 		},
		// 		body: formData,
		// 	});

		// 	if (response.success) {
		// 		updateUser(response.user);
		// 	} else {
		// 		setError({ form: "Erreur lors de la mise à jour du profil." });
		// 		return;
		// 	}
		// } catch (err) {
		// 	setError({ form: "Une erreur est survenue." });
		// 	return;
		// }

		// ================= 2FA ENABLE =================
		if (!initial2FA && enable2FA) {
			try {
				const response = await sendData("/api/auth/2fa/enable", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`
					},
				});

				console.log("2FA enable response: \n", response);
				if (response.success) {
					navigate("/qrCode", {
						state: {
							secret: response.secret,
							qrCodeUrl: response.qrCodeUrl,
							backupCodes: response.backupCodes,
						},
					});
				}
			} catch {
				setError({ form: "Erreur lors de l’activation du 2FA." });
			}
		}

		// ================= 2FA DISABLE =================
		if (initial2FA && !enable2FA) {
			navigate("/twofa/disable", { replace: true });
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<form
				onSubmit={handleSubmit}
				className="relative bg-white rounded-xl shadow-lg p-8 w-105 flex flex-col gap-6"
			>
				<BackButton to="/game" />
				<h1 className="text-2xl font-bold text-center">Mon profil</h1>

				{/* Avatar */}
				<div className="flex flex-col items-center gap-3">
					<h2 className="text-xl">Photo de profil</h2>
					<img
						src={avatarPreview || currentUser.avatarUrl}
						alt="Avatar de l'utilisateur"
						className="w-32 h-32 rounded-full border border-gray-400 object-cover"
					/>
					<input
						type="file"
						accept="image/*"
						onChange={(e) => {
							const file = e.target.files[0];
							setAvatar(file);
							setAvatarPreview(URL.createObjectURL(file));
						}}
					/>
				</div>

				<InputField
					label="Nouveau nom d'utilisateur"
					type="text"
					placeholder={currentUser.username}
					inputRef={usernameRef}
					error={error.username}
					autoFocus
				/>

				<InputField
					label="Pseudo"
					type="text"
					placeholder={currentUser.displayName}
					inputRef={displayNameRef}
					error={error.displayName}
				/>

				<InputField
					label="Mot de passe"
					type="password"
					placeholder="Nouveau mot de passe"
					inputRef={passwordRef}
					error={error.password}
				/>

				<InputField
					label="Email"
					type="email"
					placeholder={currentUser.email}
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

				{!initial2FA && enable2FA && (
					<p className="text-lg text-green-600">
						L’authentification à deux facteurs sera activée lors de l’enregistrement.
					</p>
				)}
				{initial2FA && !enable2FA && (
					<p className="text-lg text-red-500">
						L’authentification à deux facteurs sera désactivée lors de l’enregistrement.
					</p>
				)}

				{error.form && (
					<p className="text-lg text-red-500">{error.form}</p>
				)}

				<FormButton type="submit">Modifier le profil</FormButton>
			</form>
		</div>
	);
}
