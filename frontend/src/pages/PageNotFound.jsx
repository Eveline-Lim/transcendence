import { useNavigate } from "react-router-dom";
import FormButton from "../components/FormButton.jsx";

export default function PageNotFound() {
	const navigate = useNavigate();
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="card text-center max-w-sm">
				<h1 className="text-4xl font-bold mb-2">404</h1>
				<p className="msg-info mb-4">Page not found</p>
				<FormButton onClick={() => navigate("/home")}>Go Home</FormButton>
			</div>
		</div>
	);
}
