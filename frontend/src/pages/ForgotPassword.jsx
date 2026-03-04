import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import InputField from "../components/InputField.jsx";
import FormButton from "../components/FormButton.jsx";
import BackButton from "../components/BackButton.jsx";

export default function ForgotPassword() {
	const emailRef = useRef(null);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setMsg(null);
		const email = emailRef.current.value.trim();
		if (!email) { setError("Email required"); return; }
		const res = await sendData("/api/v1/auth/password/forgot", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		if (res.success !== false) setMsg("If that email exists, a reset link was sent.");
		else setError(res.message || "Error sending reset email");
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm">
				<BackButton to="/" />
				<h1 className="text-xl font-bold text-center mb-1">Forgot Password</h1>
				<p className="msg-info text-center mb-4">Enter your email to receive a reset link</p>
				<hr className="divider" />
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<InputField label="Email" type="email" inputRef={emailRef} autoFocus />
					{error && <p className="msg-error text-center">{error}</p>}
					{msg && <p className="msg-success text-center">{msg}</p>}
					<FormButton type="submit">Send Reset Link</FormButton>
				</form>
			</div>
		</div>
	);
}
