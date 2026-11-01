import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, sessionUser } from '../lib/auth.js'
import { LOCALES } from '../lib/constants.js'
import { nowEpoch } from '../lib/dates.js'
import { emailMessage } from '../lib/emails.js'
import { inBackground, linkTo, mailAvailable, sendMail } from '../lib/mail.js'
import { sendPasswordChanged } from '../lib/notices.js'
import { stopStatusEmail } from '../lib/statusEmail.js'
import { passkeySite } from '../lib/passkeys.js'
import { issueToken, readToken, resendWait, settleToken, useToken } from '../lib/tokens.js'
import { seedAccountDefaults } from '../seed.js'
import { limitPerVisitor, windowCounter } from '../lib/rateLimit.js'
import { openTicket, twoStepOn } from '../lib/twoStep.js'
import { securityLog } from '../lib/securityLog.js'
import { emailLanguageOf, words } from '../lib/phrases.js'
import { log } from '../lib/log.js'

export const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 12
export const MAX_NAME = 80
export const cleanName = value => String(value ?? '').trim().replace(/\s+/g, ' ')

const findUserByEmail = db.prepare('SELECT id, email, password_hash, needs_setup FROM users WHERE email = ?')
/* needs_setup named rather than left to its column default, which is 0. The default belongs to
   the accounts that already existed when the column was added; 1 belongs to accounts created
   from here, and writing it out is what keeps those two facts from being one fact
   (migrations/014_first_run.sql). */
const insertUser = db.prepare(`INSERT INTO users (id, email, password_hash, needs_setup, name, email_confirmed, password_changed_at)
	VALUES (?, ?, ?, 1, ?, ?, unixepoch())`)

/* Lock-out: this many wrong passwords for one address within the window pauses signing in to it
   until LOCK_SECONDS after the last one. Keyed by address, whether or not it has an account, and
   by the network address they came from, so a stranger's wrong guesses lock only the stranger. */
const LOCK_AFTER = 5
const LOCK_WINDOW_SECONDS = 15 * 60
const LOCK_SECONDS = 5 * 60
const recentFailures = db.prepare('SELECT COUNT(*) AS n, MAX(at) AS last FROM user_login_failures WHERE email = ? AND ip_address = ? AND at > ?')
const insertFailure = db.prepare('INSERT INTO user_login_failures (email, ip_address, at) VALUES (?, ?, ?)')
const purgeFailures = db.prepare('DELETE FROM user_login_failures WHERE at <= ?')
const clearFailures = db.prepare('DELETE FROM user_login_failures WHERE email = ?')

/** Seconds until signing in to this address works again, 0 when it works now. */
function lockedFor(email, ip, now = nowEpoch()) {
	const { n, last } = recentFailures.get(email, ip, now - LOCK_WINDOW_SECONDS)
	return n >= LOCK_AFTER ? Math.max(0, last + LOCK_SECONDS - now) : 0
}
export const locked = (res, wait) => res.status(429).json({ error: words('auth.tooManyAttempts'), retryAfter: wait })

/** A password checked under the lock-out, wherever one is asked for: `{ user }` when it is right,
    `{ wait }` in seconds while locked, `{}` when it is wrong. */
export async function checkPassword(req, email, password) {
	const wait = lockedFor(email, req.ip)
	if (wait) {
		securityLog(req, 'password-locked', { email, waitSeconds: wait })
		return { wait }
	}
	// counted before the check and cleared once it is right, so attempts sent at once all count
	const now = nowEpoch()
	db.transaction(() => {
		purgeFailures.run(now - 24 * 60 * 60)
		insertFailure.run(email, req.ip, now)
	})()
	const user = findUserByEmail.get(email)
	if (!user || !(await verifyPassword(password, user.password_hash))) {
		const after = lockedFor(email, req.ip, now)
		securityLog(req, 'password-wrong', { email, account: user ? user.id : 'none', ...(after ? { nowLockedSeconds: after } : {}) })
		return after ? { wait: after } : {}
	}
	clearFailures.run(email)
	return { user }
}

const LINK_EMAILS = { confirm: 'confirm-email', reset: 'reset-password' }
const selectScheme = db.prepare('SELECT colour_scheme FROM user_settings WHERE user_id = ?')

/** Emails a new link of `kind` ('confirm' or 'reset') to `email`. The earlier link keeps working until this one is sent. */
async function sendLink(req, user, kind, email) {
	const token = issueToken(user.id, kind, email)
	// a name is optional; the part before the @ stands in for it, as everywhere else in the app
	const values = { name: user.name || email.split('@')[0], email, action_url: linkTo(req, `/${kind}/${token}`) }
	try {
		await sendMail(emailMessage(LINK_EMAILS[kind], email, values, { scheme: selectScheme.get(user.id)?.colour_scheme, language: emailLanguageOf(user.id) }))
	} catch (e) {
		settleToken(user.id, kind, token, false)
		throw e
	}
	settleToken(user.id, kind, token, true)
}

// per visitor, beside the lock-out per address: enough for a household, too few to try many accounts
const signInLimit = limitPerVisitor({ most: 30, perSeconds: 15 * 60 })
const registerLimit = limitPerVisitor({ most: 10, perSeconds: 60 * 60 })
const resetLimit = limitPerVisitor({ most: 10, perSeconds: 60 * 60 })
// beside the minute between links: one address is never sent more than this many in a day
const resetEmailWait = windowCounter({ most: 5, perSeconds: 24 * 60 * 60 })

router.post('/register', registerLimit, async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: words('auth.emailInvalid') })
	if (password.length < MIN_PASSWORD) return res.status(400).json({ error: words('auth.passwordShort', { least: MIN_PASSWORD }) })
	const name = cleanName(req.body?.name)
	if (name.length > MAX_NAME) return res.status(400).json({ error: words('account.nameLong', { most: MAX_NAME }) })
	if (findUserByEmail.get(email)) return res.status(409).json({ error: words('auth.emailTaken') })

	/* Where the reader is, as their browser worked it out -- see the client's detectLocale
	   (react/src/api/format.js). It is a guess from a timezone, so it is offered rather than
	   trusted: anything not on the list becomes 'auto', which is the same answer an older
	   client that sends nothing at all gets. The reader is then shown the settings page with
	   this already selected, so a wrong guess costs one click and never goes unseen. */
	const locale = LOCALES.includes(String(req.body?.locale ?? '')) ? req.body.locale : 'auto'

	const id = newId('u')
	const passwordHash = await hashPassword(password)
	// an address can only be held unconfirmed when this server can send the link that confirms it
	const confirmed = mailAvailable() ? 0 : 1
	/* The pre-check above stays -- it spares the ~65ms scrypt hash on the common duplicate --
	   but it cannot be the guarantee: two same-email registrations can both pass it during that
	   await, and the loser's INSERT then hit the UNIQUE constraint and surfaced as a 500. The
	   constraint is the real check, so its violation gets the same 409 the serialized case gets. */
	try {
		db.transaction(() => {
			insertUser.run(id, email, passwordHash, name || null, confirmed)
			seedAccountDefaults(db, id, { locale })
		})()
	} catch (e) {
		if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
			return res.status(409).json({ error: words('auth.emailTaken') })
		throw e
	}

	if (!confirmed) inBackground(sendLink(req, { id, name }, 'confirm', email))
	const token = createSession(req, res, id)
	securityLog(req, 'account-created', { email, userId: id })
	res.status(201).json({ id, email, token, needsSetup: true, emailConfirmed: Boolean(confirmed) })
})

router.post('/login', signInLimit, async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	const { user, wait } = await checkPassword(req, email, password)
	if (wait) return locked(res, wait)
	if (!user) return res.status(401).json({ error: words('auth.wrongLogin') })
	const remember = req.body?.remember !== false
	// no session yet: the code step (POST /api/auth/two-step) opens it with this ticket
	if (twoStepOn(user.id)) {
		securityLog(req, 'password-right-code-asked', { email: user.email, userId: user.id })
		return res.json({ twoStep: true, ticket: openTicket(user.id, remember) })
	}
	securityLog(req, 'signed-in', { email: user.email, userId: user.id, with: 'password', remember })
	const token = createSession(req, res, user.id, { remember })
	res.json({ id: user.id, email: user.email, token, needsSetup: Boolean(user.needs_setup) })
})

router.post('/logout', (req, res) => {
	const user = sessionUser(req)
	if (user) securityLog(req, 'signed-out', { email: user.email, userId: user.id })
	destroySession(req, res)
	res.status(204).end()
})

// the operator's own terms and privacy notice, when set; otherwise the app's own pages are linked
const ownPage = name => (/^https?:\/\//.test(process.env[name] ?? '') ? process.env[name] : null)

/** What the signed-out pages may offer and state: a reset link needs mail; the privacy notice says
    whether receipts are sent out to be read. */
router.get('/options', (req, res) => res.json({
	mail: mailAvailable(),
	terms: ownPage('SPENDLY_TERMS_URL'),
	privacy: ownPage('SPENDLY_PRIVACY_URL'),
	receiptReading: Boolean(process.env.ANTHROPIC_API_KEY),
	// the one address passkeys work at; a page opened anywhere else does not offer them
	passkeys: passkeySite()?.origin ?? null
}))

const selectProfile = db.prepare(`SELECT u.name, u.password_changed_at, p.updated_at AS picture_at
	FROM users u LEFT JOIN user_pictures p ON p.user_id = u.id WHERE u.id = ?`)

router.get('/me', requireAuth, (req, res) => {
	const profile = selectProfile.get(req.user.id)
	res.json({
		id: req.user.id, email: req.user.email, needsSetup: Boolean(req.user.needs_setup),
		name: profile.name ?? null,
		// the time it changed rides in the address, so a new picture is never answered from a cache
		picture: profile.picture_at ? `/api/account/picture?v=${profile.picture_at}` : null,
		emailConfirmed: Boolean(req.user.email_confirmed),
		passwordChangedAt: profile.password_changed_at ?? null,
		mail: mailAvailable(),
		// An install fact, not an account one -- whether this server can actually read a
		// scanned document (lib/scanParse.js needs ANTHROPIC_API_KEY) or only store it. Scan
		// itself works either way; this is what lets the page stop promising a read it can't
		// do. Carried on the one request every page already makes before it renders
		// (react/src/routes.jsx's route loader) rather than a second fetch Scan alone would pay for.
		scanAiEnabled: Boolean(process.env.ANTHROPIC_API_KEY)
	})
})

/* ---- links by email: confirming an address (20b) and resetting a password (20c) ---- */

const selectUser = db.prepare('SELECT id, name, email, email_confirmed FROM users WHERE id = ?')
const confirmEmail = db.prepare('UPDATE users SET email_confirmed = 1 WHERE id = ?')
const setPassword = db.prepare('UPDATE users SET password_hash = ?, password_changed_at = unixepoch() WHERE id = ?')
const endSessions = db.prepare('DELETE FROM user_sessions WHERE user_id = ?')
// a reset proves only the email address, so a passkey someone else added must not outlive it
const removePasskeys = db.prepare('DELETE FROM user_passkeys WHERE user_id = ?')
const noMail = res => res.status(409).json({ error: words('mail.unavailable') })
const notSent = (res, e) => {
	log.error('mail', `Could not send: ${e.message}`)
	return res.status(409).json({ error: words('mail.failed') })
}

/** Sends the confirming link again, at most once a minute; the earlier link stops working. */
router.post('/confirm/resend', requireAuth, async (req, res) => {
	if (!mailAvailable()) return noMail(res)
	const user = selectUser.get(req.user.id)
	if (user.email_confirmed) return res.status(409).json({ error: words('auth.alreadyConfirmed') })
	const wait = resendWait(user.id, 'confirm')
	if (wait) return res.status(429).json({ error: words('auth.linkJustSent'), retryAfter: wait })
	try { await sendLink(req, user, 'confirm', user.email) } catch (e) { return notSent(res, e) }
	res.json({ email: user.email, retryAfter: resendWait(user.id, 'confirm') })
})

/** Confirms the address and never signs in: whoever registered chose the password, not the address's owner.
    Opened twice, it answers "already", since mail programs open links on their own. */
router.post('/confirm', (req, res) => {
	const token = String(req.body?.token ?? '')
	const { state, row } = readToken(token, 'confirm')
	const user = row ? selectUser.get(row.user_id) : null
	// a link for any address but the account's own confirms nothing: the address cannot be changed (20b)
	if (state === 'expired' || row.email !== user.email) {
		securityLog(req, 'email-link-refused', { kind: 'confirm', state, email: user?.email ?? null })
		return res.json({ state: 'expired', email: user?.email ?? null })
	}
	if (state === 'used') return res.json({ state: user.email_confirmed ? 'already' : 'expired', email: user.email })
	db.transaction(() => {
		confirmEmail.run(user.id)
		useToken(token)
	})()
	securityLog(req, 'email-confirmed', { email: row.email, userId: user.id })
	res.json({ state: 'confirmed', email: row.email })
})

/** Stop these emails, from a status email (20f): sets the setting to None without signing in. The
    page sends the token in the body; a mail program's own one-click stop sends it in the address. */
router.post('/status-email/stop', (req, res) => res.json(stopStatusEmail(String(req.body?.token ?? ''))))
router.post('/status-email/stop/:token', (req, res) => res.json(stopStatusEmail(req.params.token)))

/** Asks for a reset link. The answer is the same whether or not the address has an account. */
router.post('/reset', resetLimit, (req, res) => {
	if (!mailAvailable()) return noMail(res)
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: words('auth.emailInvalid') })
	const user = findUserByEmail.get(email)
	// never awaited: how long the send takes, or whether it fails, must not tell which addresses have accounts
	const sending = Boolean(user && !resendWait(user.id, 'reset') && !resetEmailWait(user.id))
	securityLog(req, 'reset-asked', { email, account: user ? user.id : 'none', sent: sending })
	if (sending) inBackground(sendLink(req, user, 'reset', email))
	res.json({ email })
})

/** What a reset link still allows, read before the new password is asked for. */
router.get('/reset/:token', (req, res) => {
	const { state, row } = readToken(req.params.token, 'reset')
	res.json({ state, email: row?.email ?? null })
})

/** The new password from a reset link: every other session and every passkey ends, and this browser is signed in. */
router.post('/reset/:token', async (req, res) => {
	const { state, row } = readToken(req.params.token, 'reset')
	if (state !== 'valid') {
		securityLog(req, 'email-link-refused', { kind: 'reset', state, email: row?.email ?? null })
		return res.status(410).json({ error: words('auth.linkExpired'), state })
	}
	const password = String(req.body?.password ?? '')
	if (password.length < MIN_PASSWORD) return res.status(400).json({ error: words('auth.passwordShort', { least: MIN_PASSWORD }) })
	const hash = await hashPassword(password)
	db.transaction(() => {
		setPassword.run(hash, row.user_id)
		endSessions.run(row.user_id)
		removePasskeys.run(row.user_id)
		useToken(req.params.token)
	})()
	clearFailures.run(row.email)
	sendPasswordChanged(req, row.user_id)
	securityLog(req, 'password-reset', { email: row.email, userId: row.user_id, endedEverySession: true, removedPasskeys: true })
	createSession(req, res, row.user_id)
	res.json({ email: row.email })
})
