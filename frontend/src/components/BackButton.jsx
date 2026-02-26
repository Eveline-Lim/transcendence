import { useNavigate } from "react-router-dom";

export default function BackButton({ to = "/" }) {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate(to)}
			className="absolute top-4 left-4 flex items-center text-black cursor-pointer"
		>
			<svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="black" className="w-6 h-6">
				<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			<span className="ml-1 font-bold">Retour</span>
		</button>
	);
}
