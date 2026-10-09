import nodemailer from 'nodemailer'

/* Mail for the account's single-use links, sent through the SMTP server in SPENDLY_SMTP_*. Without
   one, SPENDLY_MAIL_LOG=1 writes each message to the server's own log instead. */

const host = process.env.SPENDLY_SMTP_HOST
const port = Number(process.env.SPENDLY_SMTP_PORT) || 465
const user = process.env.SPENDLY_SMTP_USER
const from = process.env.SPENDLY_MAIL_FROM || (user ? `Spendly <${user}>` : '')
const missing = [!process.env.SPENDLY_PUBLIC_URL && 'SPENDLY_PUBLIC_URL', !from && 'SPENDLY_SMTP_USER',
	user && !process.env.SPENDLY_SMTP_PASSWORD && 'SPENDLY_SMTP_PASSWORD'].filter(Boolean)

const smtp = host && !missing.length ? nodemailer.createTransport({
	host, port,
	// 465 is TLS from the first byte; on any other port the password waits for STARTTLS
	secure: port === 465, requireTLS: port !== 465,
	auth: user ? { user, pass: process.env.SPENDLY_SMTP_PASSWORD } : undefined
}) : null

export const mailAvailable = () => Boolean(smtp) || process.env.SPENDLY_MAIL_LOG === '1'

/** Where a link in a message points: SPENDLY_PUBLIC_URL. A request's own Host header is the sender's
    to choose, so it serves only the log, where nothing leaves the server. */
export function linkTo(req, hashPath) {
	const origin = process.env.SPENDLY_PUBLIC_URL || `${req.protocol}://${req.headers.host}`
	return `${origin.replace(/\/$/, '')}/#${hashPath}`
}

/** Resolves once the SMTP server has taken the message. `html` is optional; `text` is always sent beside it. */
export async function sendMail({ to, subject, text, html }) {
	if (smtp) return void await smtp.sendMail({ from, to, subject, text, html })
	if (!mailAvailable()) throw new Error('This server cannot send email.')
	console.log(`[mail] to ${to}: ${subject}\n${text}\n`)
}

/** Sends without holding up the answer; a failure goes to the log. */
export const inBackground = sending => sending.catch(e => console.error(`[mail] could not send: ${e.message}`))

/** Signs in to the SMTP server once at start, so a wrong password shows in the log before anyone needs a link. */
export function checkMail() {
	if (host && missing.length) console.error(`[mail] email is off until ${missing.join(' and ')} is set`)
	smtp?.verify().then(
		() => console.log(`[mail] sending as ${from} through ${host}`),
		e => console.error(`[mail] cannot sign in to ${host}: ${e.message}`))
}
