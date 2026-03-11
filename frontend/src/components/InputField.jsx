import { useId } from "react";

export default function InputField({ label, type = "text", placeholder, inputRef, error, autoFocus, value, onChange }) {
	const id = useId();
	return (
		<div>
			{label && (<label htmlFor={id} className="label">{label}</label>)}
			<input
				id={id}
				name={label}
				type={type}
				autoComplete="off"
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
