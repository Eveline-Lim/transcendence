import { useRef } from "react";

export default function TwoFACodeInput({ value, onChange, length = 6 }) {
	const inputsRef = useRef([]);

	const handleChange = (inputValue, index) => {
		if (!/^[0-9]?$/.test(inputValue)) {
			return;
		}

		const newValue = [...value];
		newValue[index] = inputValue;
		onChange(newValue);

		// Move to next input automatically
		if (inputValue && index < length - 1) {
			inputsRef.current[index + 1].focus();
		}
	};

	const handleKeyDown = (e, index) => {
		// Go back on backspace
		if (e.key === "Backspace" && !value[index] && index > 0) {
			inputsRef.current[index - 1].focus();
		}
	};

	return (
		<div className="flex justify-center space-x-2 mb-4">
			{value.map((digit, index) => (
				<input
					key={index}
					ref={(el) => (inputsRef.current[index] = el)}
					type="text"
					maxLength="1"
					value={digit}
					autoFocus={index === 0}
					onChange={(e) => handleChange(e.target.value, index)}
					onKeyDown={(e) => handleKeyDown(e, index)}
					className="w-10 h-12 text-center border border-gray-300 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			))}
		</div>
	);
}
