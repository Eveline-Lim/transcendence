export default function FormButton({ children, type = "submit", onClick, primary = true }) {
	const baseClass = `text-xl py-3 px-10 rounded-md cursor-pointer transition-colors`;
	const primaryClass = `bg-blue-700 text-white hover:bg-blue-600`;
	const secondaryClass = `border text-black hover:bg-gray-200`;

	return (
	<button
		type={type}
		onClick={onClick}
		className={`${baseClass} ${primary ? primaryClass : secondaryClass}`}>
		{children}
	</button>
	);
}
