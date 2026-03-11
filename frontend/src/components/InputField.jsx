export default function InputField({ label, type = "text", placeholder, inputRef, error, autoFocus, value, onChange }) {
	return (
		<div>
			{label && <label className="label">{label}</label>}
			<input
				name={label}
				type={type}
				placeholder={placeholder}
				ref={inputRef}
				autoFocus={autoFocus}
				className="input"
				{...(value !== undefined ? { value } : {})}
				{...(onChange ? { onChange } : {})}
			/>
			{error && <p className="msg-error mt-1">{error}</p>}
		</div>
	);
}
