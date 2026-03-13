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
			const params = new URLSearchParams(hash);

			const accessToken = params.get("accessToken");
			const refreshToken = params.get("refreshToken");
			if (!accessToken) {
				navigate("/");
				return;
			}

			login(null, accessToken, refreshToken);
			try {
				const user = await sendData("/api/v1/players/me", {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});
				if (!user) {
					navigate("/");
					return;
				}
				updateUser(user);
				navigate("/home", { replace: true });
			} catch (error) {
				navigate("/");
			}
		};

		handleOAuth();
	}, [login, updateUser, navigate]);

	return <p>Logging you in...</p>;
}
