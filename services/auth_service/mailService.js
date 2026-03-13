import nodemailer from "nodemailer";

/*
 * Sends a password reset email to the specified address.
 * Uses Gmail as the SMTP transport, authenticated via environment variables.
 * The email contains a styled HTML button linking to the reset URL.
 */
export async function sendResetEmail(to, resetLink) {
	const transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD,
		},
	});

	const info = await transporter.sendMail({
		from: `"Your App" <${process.env.SMTP_USER}>`,
		to,
		subject: "Password reset",
		html: `
			<div style="font-family: Arial, sans-serif; padding: 20px;">
				<h2>Password Reset</h2>
				<p>You requested to reset your password.</p>
				<p>Click the button below:</p>
				<a href="${resetLink}"
					style="display:inline-block; padding:10px 20px;
					background-color:#3b82f6; color:white;
					text-decoration:none; border-radius:5px;">
					Reset My Password
				</a>
				<p style="margin-top:20px; font-size:12px; color:#666;">
					This link expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.
				</p>
			</div>
		`,
	});
}
