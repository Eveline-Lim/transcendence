import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import InputField from "../components/InputField.jsx";
import FormButton from "../components/FormButton.jsx";

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const pwRef = useRef(null);
	const confirmRef = useRef(null);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		const password = pwRef.current.value;
		const confirm = confirmRef.current.value;
		if (password !== confirm) { setError("Passwords don't match"); return; }
		if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
		const res = await sendData("/api/v1/auth/password/reset", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, password }),
		});
		if (res.success !== false) {
			setMsg("Password reset! Redirecting...");
			setTimeout(() => navigate("/", { replace: true }), 2000);
		} else {
			setError(res.message || "Reset failed");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm">
				<h1 className="text-xl font-bold text-center mb-1">Reset Password</h1>
				<p className="msg-info text-center mb-4">Enter your new password</p>
				<hr className="divider" />
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<InputField label="New Password" type="password" inputRef={pwRef} autoFocus />
					<InputField label="Confirm Password" type="password" inputRef={confirmRef} />
					{error && <p className="msg-error text-center">{error}</p>}
					{msg && <p className="msg-success text-center">{msg}</p>}
					<FormButton type="submit">Reset Password</FormButton>
				</form>
			</div>
		</div>
	);
}
