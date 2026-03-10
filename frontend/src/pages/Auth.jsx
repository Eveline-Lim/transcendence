import { useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { validateUsername, validatePassword, validateEmail } from "../utils/validators.js";
import { sendData } from "../sendData.jsx";
import { AuthContext } from "../context/AuthContext";
import InputField from "../components/InputField";
import FormButton from "../components/FormButton";

export default function Auth() {
	const [mode, setMode] = useState("login");
	const [error, setError] = useState({});
	const navigate = useNavigate();
	const { login } = useContext(AuthContext);

	const loginIdRef = useRef(null);
	const loginPwRef = useRef(null);
	const signupUsernameRef = useRef(null);
	const signupDisplayRef = useRef(null);
	const signupPwRef = useRef(null);
	const signupEmailRef = useRef(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError({});
		if (mode === "login") await doLogin();
		else await doSignup();
	};

	const handle42Login = () => {
		const origin = window.location.origin;
		console.log("AUTH origin: ", origin);
		window.location.href = "/api/v1/auth/oauth/fortytwo"
	};

	const doLogin = async () => {
		const identifier = loginIdRef.current.value.trim();
		const password = loginPwRef.current.value.trim();
		const errs = {};
		const isEmail = identifier.includes("@");
		if (isEmail && !validateEmail(identifier)) errs.identifier = "Invalid email";
		else if (!isEmail && !validateUsername(identifier)) errs.identifier = "Invalid username";
		if (!password || !validatePassword(password)) errs.password = "Invalid password";
		if (Object.keys(errs).length) { setError(errs); return; }

		try {
			const res = await sendData("/api/v1/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, password }),
			});
			console.log("LOGIN RES: ", res);
			if (res.success === false) {
				setError({ form: res.message || "Invalid credentials" });
			} else if (res.requires2FA === "true" || res.requires2FA === true) {
				login(res.user, res.accessToken, res.refreshToken);
				navigate("/twofaCode", { replace: true });
			} else if (res.accessToken) {
				login(res.user, res.accessToken, res.refreshToken);
				navigate("/home", { replace: true });
			} else {
				setError({ form: "Unexpected response from server" });
			}
		} catch {
			setError({ form: "Connection error" });
		}
	};

	const doSignup = async () => {
		const username = signupUsernameRef.current.value.trim();
		const displayName = signupDisplayRef.current.value.trim();
		const password = signupPwRef.current.value.trim();
		const email = signupEmailRef.current.value.trim();
		const errs = {};
		if (!validateUsername(username)) errs.username = "Username must be 3–20 characters and contain only letters, numbers, or _";
		if (!displayName) errs.displayName = "Required";
		if (!password || !validatePassword(password)) errs.password = "Password must be 8–128 characters and include uppercase, lowercase, number and special character";
		if (!validateEmail(email)) errs.email = "Invalid email";
		if (Object.keys(errs).length) { setError(errs); return; }

		try {
			const res = await sendData("/api/v1/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, displayName, password, email }),
			});
			console.log("REGISTER RES: ", res);
			if (res.success === false) {
				setError({ form: res.message || "Registration failed" });
			} else if (res.accessToken) {
				login(res.user, res.accessToken, res.refreshToken);
				navigate("/home", { replace: true });
			} else {
				setError({ form: "Unexpected response from server" });
			}
		} catch {
			setError({ form: "Connection error" });
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card w-full max-w-sm">
				<h1 className="text-xl font-bold text-center mb-1">
					{mode === "login" ? "Login" : "Sign Up"}
				</h1>
				<p className="msg-info text-center mb-4">
					{mode === "login" ? "Sign in to your account" : "Create a new account"}
				</p>
				<hr className="divider" />
				<form key={mode} onSubmit={handleSubmit} className="flex flex-col gap-3">
					{mode === "login" ? (
						<>
							<InputField label="Username or Email" inputRef={loginIdRef} error={error.identifier} autoFocus />
							<InputField label="Password" type="password" inputRef={loginPwRef} error={error.password} />
						</>
					) : (
						<>
							<InputField label="Username" inputRef={signupUsernameRef} error={error.username} autoFocus />
							<InputField label="Display Name" inputRef={signupDisplayRef} error={error.displayName} />
							<InputField label="Password" type="password" inputRef={signupPwRef} error={error.password} />
							<InputField label="Email" type="email" inputRef={signupEmailRef} error={error.email} />
						</>
					)}
					{error.form && <p className="msg-error text-center">{error.form}</p>}
					<FormButton type="submit">{mode === "login" ? "Login" : "Sign Up"}</FormButton>
					{mode === "login" && (
						<>
							<p className="link text-center" onClick={() => navigate("/password/forgot")}>Forgot password?</p>
							<hr className="divider" />
							<FormButton variant="secondary" onClick={handle42Login}>
								Login with 42
							</FormButton>
						</>
					)}
					<p className="msg-info text-center">
						{mode === "login" ? "No account? " : "Have an account? "}
						<span className="link" onClick={() => { setError({}); setMode(mode === "login" ? "signup" : "login"); }}>
							{mode === "login" ? "Sign up" : "Login"}
						</span>
					</p>
				</form>
			</div>
		</div>
	);
}
