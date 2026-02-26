export default function InputField({ label, type = "text", placeholder, inputRef, error, autoFocus }) {
	return (
		<div>
			{label && <label className="label">{label}</label>}
			<input
				type={type}
				placeholder={placeholder}
				ref={inputRef}
				autoFocus={autoFocus}
				className="input"
			/>
			{error && <p className="msg-error mt-1">{error}</p>}
		</div>
	);
}
