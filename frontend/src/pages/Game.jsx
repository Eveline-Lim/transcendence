import { useEffect, useState } from "react";
import { sendData } from "../sendData.jsx";

export default function Game() {
	const [player, setPlayer] = useState(null);

	useEffect(() => {
		async function fetchPlayer() {
		const token = localStorage.getItem("token");
		console.log("token: \n", token);


		const response = await sendData("api/players/me", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		console.log("response: \n", response);

		if (response.success) {
			setPlayer(response);
		}
    }

	fetchPlayer();
	}, []);

	return (
		<div>
			<h1>Hello world</h1>

			{player && (
				<div className="flex items-center gap-4 relative mt-4">
					<div className="flex items-center gap-2">
						<img
							src={player.avatarUrl}
							alt="User avatar"
							className="w-10 h-10 rounded-full border border-purple-400 object-cover"
            			/>
						<span className="font-semibold">
							{player.username}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
