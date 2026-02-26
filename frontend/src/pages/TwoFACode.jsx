import { useRef, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import TwoFACodeInput from "../components/TwoFACodeInput.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function TwoFACode() {
<<<<<<< HEAD
	const { login } = useContext(AuthContext);
	const [code, setCode] = useState(Array(6).fill(""));
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState("");
=======
	const codeRef = useRef(null);
	const [error, setError] = useState(null);
>>>>>>> b9bc338 (feat: changing front)
	const navigate = useNavigate();
	const location = useLocation();
	const { login, updateUser, currentUser } = useContext(AuthContext);
	const isVerifying = location.state?.verifying;

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		const code = codeRef.current?.value?.trim();
		if (!code || code.length !== 6) { setError("Enter 6-digit code"); return; }

		const token = localStorage.getItem("token");
		const res = await sendData("/api/v1/auth/2fa/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ code }),
		});

<<<<<<< HEAD
		if (fullCode.length !== 6) {
			setMessage("Entrez le code à six chiffres");
			setMessageType("error");
			return;
		}

		console.log("Code entered:", fullCode);

		try {
			const token = localStorage.getItem("token");
			console.log("2FA CODE: \n", token);
			const response = await sendData("/api/auth/2fa/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					code: fullCode })
				});

			console.log("VERIFY BIS response: \n", response);

			if (response.success) {
				setMessage("L'authentification à deux facteurs a été vérifiée avec succès");
				setMessageType("success");
				login(response.user, response.accessToken);
				setTimeout(() => {
					navigate("/game", { replace: true });
				}, 2500);
			} else {
				setMessage("Erreur lors de la vérification du code. Veuillez réessayer.");
				setMessageType("error");
			}
		} catch (error) {
			setMessage("Une erreur est survenue. Veuillez réessayer");
			setMessageType("error");
=======
		if (res.success !== false) {
			if (isVerifying && currentUser) {
				updateUser({ ...currentUser, has2FAEnabled: "true" });
				navigate("/profile", { replace: true });
			} else if (res.accessToken) {
				login(res.user, res.accessToken);
				navigate("/home", { replace: true });
			} else {
				navigate("/home", { replace: true });
			}
		} else {
			setError(res.message || "Invalid code");
>>>>>>> b9bc338 (feat: changing front)
		}
	};

	return (
<<<<<<< HEAD
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="relative flex flex-col items-center bg-white border border-gray-200 p-8 rounded-lg shadow-lg max-w-md mx-auto text-black">
				<BackButton to="/" />
				<p className="text-black font-bold mt-4 mb-4">Entrez le code</p>

				<TwoFACodeInput
					value={code}
					onChange={setCode}
					length={6}
				/>

				<p className={`mt-3 mb-3 font-medium ${
					messageType === "success" ? "text-black" : "text-red-500"
				}`}>
					{message}
				</p>
				<FormButton onClick={handleVerify}>Vérifier</FormButton>
=======
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm text-center">
				<BackButton to={isVerifying ? "/twofa/enable" : "/"} />
				<h1 className="text-xl font-bold mb-1">
					{isVerifying ? "Verify 2FA Setup" : "Two-Factor Authentication"}
				</h1>
				<p className="msg-info mb-4">Enter the 6-digit code from your authenticator app</p>
				<hr className="divider" />
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<TwoFACodeInput codeRef={codeRef} />
					{error && <p className="msg-error">{error}</p>}
					<FormButton type="submit">Verify</FormButton>
				</form>
>>>>>>> b9bc338 (feat: changing front)
			</div>
		</div>
	);
}
