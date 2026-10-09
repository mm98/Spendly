import { db } from '../db.js'
import { emailMessage } from './emails.js'
import { inBackground, linkTo, mailAvailable, sendMail } from './mail.js'

/* The notices an account is sent when something about signing in changes (20f): its password, or
   a new passkey. Sent when this server can send email, without holding up the answer. */

const selectAccount = db.prepare('SELECT u.email, s.locale FROM users u LEFT JOIN settings s ON s.user_id = u.id WHERE u.id = ?')

/** "9 Oct 2026, 14.26" in the account's own locale; 'auto' takes the browser that asked, as the app does. */
function changedAt(req, locale) {
	const asked = locale && locale !== 'auto' ? [locale] : req.acceptsLanguages()
	const chosen = asked.find(l => { try { return Intl.DateTimeFormat.supportedLocalesOf(l).length } catch { return false } }) ?? 'en-GB'
	const format = new Intl.DateTimeFormat(chosen, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
	// an English short month is cut to three letters ("Sept" -> "Sep"), as the app writes it
	return format.formatToParts(new Date())
		.map(part => (part.type === 'month' && chosen.startsWith('en') ? part.value.slice(0, 3) : part.value)).join('')
}

function notify(req, userId, name, valuesFor) {
	if (!mailAvailable()) return
	const { email, locale } = selectAccount.get(userId)
	inBackground(sendMail(emailMessage(name, email, { email, changed_at: changedAt(req, locale), ...valuesFor(email) })))
}

/** Its button opens the reset page with the address filled in, so it never expires. */
export const sendPasswordChanged = (req, userId) =>
	notify(req, userId, 'password-changed', email => ({ action_url: linkTo(req, '/reset?email=' + encodeURIComponent(email)) }))

export const sendPasskeyAdded = (req, userId, passkeyName) =>
	notify(req, userId, 'passkey-added', () => ({ passkey_name: passkeyName, action_url: linkTo(req, '/settings/account') }))
