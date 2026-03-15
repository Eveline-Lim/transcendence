import { Link } from "react-router-dom";

export default function Footer() {
	return (
		<footer className="mt-12 py-6 text-center text-xs text-gray-500 border-t border-gray-800">
			<div className="flex justify-center gap-6 mb-2">
				<Link
					to="/privacy-policy"
					className="hover:text-emerald-400 transition-colors"
				>
					Privacy Policy
				</Link>

				<Link
					to="/terms-service"
					className="hover:text-emerald-400 transition-colors"
				>
					Terms of Service
				</Link>
			</div>

			<p className="text-gray-700">
				Made with ❤️
			</p>
		</footer>
	);
}
