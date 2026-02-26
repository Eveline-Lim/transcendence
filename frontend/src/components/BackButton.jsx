import { useNavigate } from "react-router-dom";

export default function BackButton({ to = "/" }) {
	const navigate = useNavigate();
	return (
		<button onClick={() => navigate(to)} className="btn btn-secondary text-sm">
			&larr; Back
		</button>
	);
}
