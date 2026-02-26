import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate("/", { replace: true });
		}, 2500);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6">
			<div className="text-center">
				<h1 className="text-9xl font-extrabold text-gray-800 tracking-widest">404</h1>
				<p className="text-lg text-gray-600">
					Redirection en cours...
				</p>
			</div>
		</div>
	);
}
