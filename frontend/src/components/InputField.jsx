export default function InputField({ label, type = "text", placeholder, error, inputRef, autoFocus = false }) {
	const inputClass = `w-full rounded-md border px-4 py-3 text-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${
		error ? "border-red-500" : "border-gray-300"
	}`;

	return (
		<div className="flex flex-col gap-2">
			<label className="text-left text-xl">{label}</label>
			<input
				ref={inputRef}
				type={type}
				placeholder={placeholder}
				className={inputClass}
				autoFocus={autoFocus}
			/>
			{error && <p className="text-red-500 text-lg text-left">{error}</p>}
		</div>
	);
}
