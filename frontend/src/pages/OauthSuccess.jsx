import { useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { sendData } from "../sendData";

export default function OAuthSuccess() {
	const navigate = useNavigate();
	const { login, updateUser } = useContext(AuthContext);
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) {
			return;
		}
		ran.current = true;

		const handleOAuth = async () => {
			const hash = window.location.hash.substring(1);
			console.log("hash: ", hash);
			const params = new URLSearchParams(hash);
			console.log("params: ", params);

			const accessToken = params.get("accessToken");
			console.log("accessToken: ", accessToken);
			const refreshToken = params.get("refreshToken");
			console.log("refreshToken: ", refreshToken);
			if (!accessToken) {
				navigate("/");
				return;
			}

			login(null, accessToken, refreshToken);
			//window.history.replaceState({}, document.title, "/oauth-success");

			try {
				const user = await sendData("/api/v1/players/me", {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});
				console.log("user: ", user);
				if (!user) {
					navigate("/");
					return;
				}

				updateUser(user);
				console.log("user updated: ", user);
				navigate("/home", { replace: true });
			} catch (error) {
				console.error("Failed to fetch user", error);
				navigate("/");
			}
		};

		handleOAuth();
	}, [login, updateUser, navigate]);

	return <p>Logging you in...</p>;
}
