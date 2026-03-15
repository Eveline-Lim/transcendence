export default function FormButton({ children, type = "button", onClick, variant = "primary", className = "" }) {
	return (
		<button
			type={type}
			onClick={onClick}
			className={`btn btn-${variant} ${className}`}
		>
			{children}
		</button>
	);
}
