/* Mail for the account's single-use links. No outbound mail service is set up, so the only way
   out is the server's own log, and only when SPENDLY_MAIL_LOG=1 asks for it. */

export const mailAvailable = () => process.env.SPENDLY_MAIL_LOG === '1'

/** Where a link in a message points. SPENDLY_PUBLIC_URL wins: a request's own Host header is the
    sender's to choose, and a reset link must never point at an address a stranger picked. */
export function linkTo(req, hashPath) {
	const origin = process.env.SPENDLY_PUBLIC_URL || `${req.protocol}://${req.headers.host}`
	return `${origin.replace(/\/$/, '')}/#${hashPath}`
}

export function sendMail({ to, subject, text }) {
	if (!mailAvailable()) throw new Error('This server cannot send email.')
	console.log(`[mail] to ${to}: ${subject}\n${text}\n`)
}
