export default function TwoFACodeInput({ codeRef }) {
	return (
		<div>
			<label className="label">2FA Code</label>
			<input
				type="text"
				maxLength={6}
				placeholder="000000"
				ref={codeRef}
				className="input text-center text-lg tracking-widest"
				autoFocus
			/>
		</div>
	);
}
