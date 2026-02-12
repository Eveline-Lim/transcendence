import nodemailer from "nodemailer";

export async function sendResetEmail(to, resetLink) {
	const transporter = nodemailer.createTransport({
		service: "Gmail",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD,
		},
	});

	const info = await transporter.sendMail({
		from: `"Your App" <${process.env.SMTP_USER}>`,
		to,
		subject: "Réinitialisation de votre mot de passe",
		html: `
			<div style="font-family: Arial, sans-serif; padding: 20px;">
				<h1>Réinitialisation du mot de passe</h1>
				<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
				<p>Cliquez sur le bouton ci-dessous :</p>
				<a href="${resetLink}"
					style="display:inline-block;padding:10px 20px;
					background-color:#3b82f6;color:white;
					text-decoration:none;border-radius:5px;">
					Réinitialiser mon mot de passe
				</a>
				<p style="margin-top:20px;font-size:12px;color:#666;">
					Ce lien expire dans 15 minutes. Si vous n'avez pas demandé la réinitialisation de votre mot de passe, vous pouvez ignorer cet email en toute sécurité.
				</p>
			</div>
		`,
		// html: `
		// 	<div style="font-family: Arial, sans-serif; padding: 20px;">
		// 		<h2>Password Reset</h2>
		// 		<p>You requested to reset your password.</p>
		// 		<p>Click the button below:</p>
		// 		<a href="${resetLink}"
		// 			style="display:inline-block; padding:10px 20px;
		// 			background-color:#3b82f6; color:white;
		// 			text-decoration:none; border-radius:5px;">
		// 			Reset My Password
		// 		</a>
		// 		<p style="margin-top:20px; font-size:12px; color:#666;">
		// 			This link expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.
		// 		</p>
		// 	</div>
		// `,
	});
	// console.log("MAIL INFO: ", info);
}
