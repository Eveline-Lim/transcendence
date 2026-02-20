import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData";


export default function NavBar() {
	const [player, setPlayer] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			const token = localStorage.getItem("token");
			console.log("handleLogout: \n", handleLogout);

			await sendData("/api/auth/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			localStorage.removeItem("token");
			navigate("/");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	useEffect(() => {
		const fetchPlayer = async () => {
			const token = localStorage.getItem("token");
			console.log("token: ", token);
			try {
				const response = await sendData("/api/players/me", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				console.log("response: \n", response);

				if (response.success) {
					setPlayer(response);
				}
			} catch (error) {
				console.error("Error fetching player:", error);
			}
		};

		fetchPlayer();
	}, []);

	return (
		<header className="w-full h-16 flex items-center justify-between px-6 relative bg-blue-200">
			<button
			// Add a homepage
				onClick={() => navigate("/")}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth="1.5"
					stroke="currentColor"
					className="w-9 h-9 hover:text-blue-700 cursor-pointer"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
					/>
				</svg>
			</button>

			{player && (
				<div className="flex items-center gap-4">
					{/* User avatar + name */}
					<img
						src={player.avatarUrl}
						alt="User avatar"
						className="w-9 h-9 rounded-full border border-gray-400 object-cover"
					/>
					<span className="font-semibold">
						{player.displayName}
					</span>

					{/* Settings icon */}
					<svg
						onClick={() => setIsOpen(!isOpen)}
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="w-9 h-9 hover:text-blue-700 cursor-pointer transition"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0
							1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142
							1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44
							1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94
							1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107
							1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125
							1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55
							0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125
							1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125
							1.125 0 01.12-1.45l.773-.773a1.125
							1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
			)}

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute right-0 top-14 bg-white rounded-xl shadow-xl w-56 py-3 px-4 space-y-3 z-50">
					<button
						onClick={() => console.log("Dashboard")}
						className="w-full text-left hover:bg-gray-100 p-2 rounded-lg cursor-pointer"
					>
						Mon tableau de bord
					</button>

					<button
						onClick={() => console.log("Profile")}
						className="w-full text-left hover:bg-gray-100 p-2 rounded-lg cursor-pointer"
					>
						Mon profil
					</button>

					<button
						type="button"
						onClick={handleLogout}
						className="w-full text-left hover:bg-gray-100 p-2 rounded-lg cursor-pointer">
							Déconnexion
					</button>
				</div>
			)}
		</header>
	);
}

