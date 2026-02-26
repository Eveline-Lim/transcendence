import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";
import InputField from "../components/InputField.jsx";

export default function ConfirmDisable2FA() {
<<<<<<< HEAD
	const { login } = useContext(AuthContext);
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState("");
	const passwordRef = useRef(null);
	const navigate = useNavigate();

	const handleVerify = async (e) => {
		e.preventDefault();

		const fullCode = code.join("");
		const password = passwordRef.current.value.trim();

		if (fullCode.length !== 6) {
			setMessage("Entrez le code à six chiffres");
			return;
		}

		if (!password) {
			setMessage("Entrez votre mot de passe actuel");
			return;
		}

		try {
			const token = localStorage.getItem("token");
			const response = await sendData("/api/auth/2fa/disable", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					code: fullCode,
					password,
				}),
			});

			console.log("CONFIRMATION 2FA DISABLE response: \n", response);

			if (!response.success) {
				setMessage("Code ou mot de passe incorrect");
				setMessageType("error");
				return;
			}
			setMessage("L'authentification à deux facteurs a été désactivée");
			setMessageType("success");
			login(response.user, response.accessToken);
			setTimeout(() => {
				navigate("/game", { replace: true });
			}, 2500);
		} catch (error) {
			setMessage("Une erreur est survenue. Veuillez réessayer");
			setMessageType("error");
=======
	const { currentUser, updateUser } = useContext(AuthContext);
	const [error, setError] = useState(null);
	const [msg, setMsg] = useState(null);
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleDisable = async () => {
		setError(null);
		if (!code || !password) {
			setError("Please enter your 2FA code and password");
			return;
		}
		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/disable", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ code, password }),
		});
		if (res.success !== false) {
			updateUser({ ...currentUser, has2FAEnabled: "false" });
			setMsg("2FA disabled");
			setTimeout(() => navigate("/profile", { replace: true }), 1500);
		} else {
			setError(res.message || "Failed to disable 2FA");
>>>>>>> b9bc338 (feat: changing front)
		}
	};

	if (!currentUser) return null;

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to="/profile" />
<<<<<<< HEAD
				<h1 className="text-xl font-bold mt-4 mb-4">Désactiver l'authentification à deux facteurs</h1>

				<form onSubmit={handleVerify} className="w-full flex flex-col gap-6">

					{/* TOTP Code */}
					<div className="flex flex-col items-center">
						<p className="mb-2 text-lg font-bold">Code de vérification</p>
						<TwoFACodeInput
							value={code}
							onChange={setCode}
							length={6}
						/>
					</div>

					{/* Password Confirmation */}
					<InputField
						label="Mot de passe actuel"
						type="password"
						placeholder="Entrez votre mot de passe"
						inputRef={passwordRef}
					/>
					<p className={`mt-3 mb-3 font-medium${
						messageType === "success" ? "text-black" : "text-red-500"
					}`}>
						{message}
					</p>

					<FormButton type="submit">
						Confirmer la désactivation
					</FormButton>
				</form>
=======
				<h1 className="text-xl font-bold mb-1">Disable 2FA</h1>
				<p className="msg-info mb-4">Enter your current 2FA code and password to confirm.</p>
				<hr className="divider" />
				{error && <p className="msg-error mb-3">{error}</p>}
				{msg && <p className="msg-success mb-3">{msg}</p>}
				<InputField
					label="2FA Code"
					type="text"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="6-digit code"
				/>
				<InputField
					label="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Your password"
				/>
				<div className="flex gap-3 justify-center mt-4">
					<FormButton variant="danger" onClick={handleDisable}>Confirm Disable</FormButton>
					<FormButton variant="secondary" onClick={() => navigate("/profile")}>Cancel</FormButton>
				</div>
>>>>>>> b9bc338 (feat: changing front)
			</div>
		</div>
	);
}
