import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth } from '../lib/auth.js'
import { LOCALES } from '../lib/constants.js'
import { nowEpoch } from '../lib/dates.js'
import { emailMessage } from '../lib/emails.js'
import { linkTo, mailAvailable, sendMail } from '../lib/mail.js'
import { issueToken, readToken, resendWait, settleToken, useToken } from '../lib/tokens.js'
import { seedAccountDefaults } from '../seed.js'

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
   until LOCK_SECONDS after the last one. Keyed by address, whether or not it has an account. */
const LOCK_AFTER = 5
const LOCK_WINDOW_SECONDS = 15 * 60
const LOCK_SECONDS = 5 * 60
const recentFailures = db.prepare('SELECT COUNT(*) AS n, MAX(at) AS last FROM login_failures WHERE email = ? AND at > ?')
const insertFailure = db.prepare('INSERT INTO login_failures (email, at) VALUES (?, ?)')
const purgeFailures = db.prepare('DELETE FROM login_failures WHERE at <= ?')
const clearFailures = db.prepare('DELETE FROM login_failures WHERE email = ?')

/** Seconds until signing in to this address works again, 0 when it works now. */
function lockedFor(email, now = nowEpoch()) {
	const { n, last } = recentFailures.get(email, now - LOCK_WINDOW_SECONDS)
	return n >= LOCK_AFTER ? Math.max(0, last + LOCK_SECONDS - now) : 0
}
const locked = (res, wait) => res.status(429).json({ error: 'Too many attempts.', retryAfter: wait })

const LINK_EMAILS = { confirm: 'confirm-email', reset: 'reset-password' }

/** Emails a new link of `kind` ('confirm' or 'reset') to `email`. The earlier link keeps working until this one is sent. */
async function sendLink(req, user, kind, email) {
	const token = issueToken(user.id, kind, email)
	// a name is optional; the part before the @ stands in for it, as everywhere else in the app
	const values = { name: user.name || email.split('@')[0], email, action_url: linkTo(req, `/${kind}/${token}`) }
	try {
		await sendMail(emailMessage(LINK_EMAILS[kind], email, values))
	} catch (e) {
		settleToken(user.id, kind, token, false)
		throw e
	}
	settleToken(user.id, kind, token, true)
}

const inBackground = sending => sending.catch(e => console.error(`[mail] could not send: ${e.message}`))

router.post('/register', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
	if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` })
	const name = cleanName(req.body?.name)
	if (name.length > MAX_NAME) return res.status(400).json({ error: `A name is ${MAX_NAME} characters at most.` })
	if (findUserByEmail.get(email)) return res.status(409).json({ error: 'An account with that email already exists.' })

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
			return res.status(409).json({ error: 'An account with that email already exists.' })
		throw e
	}

	if (!confirmed) inBackground(sendLink(req, { id, name }, 'confirm', email))
	const token = createSession(req, res, id)
	res.status(201).json({ id, email, token, needsSetup: true, emailConfirmed: Boolean(confirmed) })
})

router.post('/login', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	const wait = lockedFor(email)
	if (wait) return locked(res, wait)
	const user = findUserByEmail.get(email)
	if (!user || !(await verifyPassword(password, user.password_hash))) {
		const now = nowEpoch()
		db.transaction(() => {
			purgeFailures.run(now - 24 * 60 * 60)
			insertFailure.run(email, now)
		})()
		const after = lockedFor(email, now)
		return after ? locked(res, after) : res.status(401).json({ error: 'Wrong email or password.' })
	}

	clearFailures.run(email)
	const token = createSession(req, res, user.id, { remember: req.body?.remember !== false })
	res.json({ id: user.id, email: user.email, token, needsSetup: Boolean(user.needs_setup) })
})

router.post('/logout', (req, res) => {
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
	receiptReading: Boolean(process.env.ANTHROPIC_API_KEY)
}))

const selectProfile = db.prepare(`SELECT u.name, u.pending_email, u.password_changed_at, p.updated_at AS picture_at
	FROM users u LEFT JOIN user_pictures p ON p.user_id = u.id WHERE u.id = ?`)

router.get('/me', requireAuth, (req, res) => {
	const profile = selectProfile.get(req.user.id)
	res.json({
		id: req.user.id, email: req.user.email, needsSetup: Boolean(req.user.needs_setup),
		name: profile.name ?? null,
		// the time it changed rides in the address, so a new picture is never answered from a cache
		picture: profile.picture_at ? `/api/account/picture?v=${profile.picture_at}` : null,
		emailConfirmed: Boolean(req.user.email_confirmed),
		pendingEmail: profile.pending_email ?? null,
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

const selectUser = db.prepare('SELECT id, name, email, email_confirmed, pending_email FROM users WHERE id = ?')
const confirmEmail = db.prepare('UPDATE users SET email = ?, email_confirmed = 1, pending_email = NULL WHERE id = ?')
const setPending = db.prepare('UPDATE users SET pending_email = ? WHERE id = ?')
const setUnconfirmedEmail = db.prepare('UPDATE users SET email = ?, pending_email = NULL WHERE id = ?')
const setPassword = db.prepare('UPDATE users SET password_hash = ?, password_changed_at = unixepoch() WHERE id = ?')
const dropPendingLinks = db.prepare(`DELETE FROM account_tokens WHERE user_id = @id AND kind = 'confirm' AND used_at IS NULL
	AND email = (SELECT pending_email FROM users WHERE id = @id)`)
const cancelPending = db.prepare('UPDATE users SET pending_email = NULL WHERE id = ?')
const endSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?')
const noMail = res => res.status(409).json({ error: 'This server cannot send email.' })
const notSent = (res, e) => {
	console.error(`[mail] could not send: ${e.message}`)
	return res.status(409).json({ error: 'The email could not be sent. Try again in a few minutes.' })
}

/** Tells the confirmed address that a move to `newEmail` was asked for (20f). Its link has no token, so it never expires. */
const sendEmailChanged = (req, email, newEmail) => inBackground(sendMail(emailMessage('email-changed', email,
	{ email, new_email: newEmail, action_url: linkTo(req, '/reset?email=' + encodeURIComponent(email)) })))

/** Sends the confirming link again, at most once a minute; the earlier link stops working. */
router.post('/confirm/resend', requireAuth, async (req, res) => {
	if (!mailAvailable()) return noMail(res)
	const user = selectUser.get(req.user.id)
	const email = user.pending_email ?? (user.email_confirmed ? null : user.email)
	if (!email) return res.status(409).json({ error: 'Your email is already confirmed.' })
	const wait = resendWait(user.id, 'confirm')
	if (wait) return res.status(429).json({ error: 'A link was sent a moment ago.', retryAfter: wait })
	try { await sendLink(req, user, 'confirm', email) } catch (e) { return notSent(res, e) }
	res.json({ email, retryAfter: resendWait(user.id, 'confirm') })
})

/** A new address to confirm. A confirmed address keeps working until the new one is confirmed. */
router.post('/email', requireAuth, async (req, res) => {
	if (!mailAvailable()) return noMail(res)
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
	const user = selectUser.get(req.user.id)
	const owner = findUserByEmail.get(email)
	if (owner && owner.id !== user.id) return res.status(409).json({ error: 'There is already an account with this email.' })
	if (user.email_confirmed && email === user.email) return res.status(400).json({ error: 'That is the address you already have.' })
	// the address changes only once its link is sent, so a failed send leaves the account as it was
	try { await sendLink(req, user, 'confirm', email) } catch (e) { return notSent(res, e) }
	if (user.email_confirmed) {
		setPending.run(email, user.id)
		// only a confirmed address hears of it: an unconfirmed one may be a typo for someone else's
		sendEmailChanged(req, user.email, email)
	} else {
		setUnconfirmedEmail.run(email, user.id)
	}
	res.json({ email, retryAfter: resendWait(user.id, 'confirm') })
})

/** Opening a confirming link confirms the address and signs this browser in. Opened twice, it
    answers "already" rather than an error, since mail programs open links on their own. */
router.post('/confirm', (req, res) => {
	const token = String(req.body?.token ?? '')
	const { state, row } = readToken(token, 'confirm')
	const user = row ? selectUser.get(row.user_id) : null
	if (state === 'expired') return res.json({ state, email: user ? user.pending_email ?? user.email : null })
	if (state === 'used') {
		const done = user.email === row.email && user.email_confirmed
		return res.json({ state: done ? 'already' : 'expired', email: user.pending_email ?? user.email })
	}
	const owner = findUserByEmail.get(row.email)
	if (owner && owner.id !== user.id) return res.status(409).json({ error: 'There is already an account with this email.' })
	db.transaction(() => {
		confirmEmail.run(row.email, user.id)
		useToken(token)
	})()
	createSession(req, res, user.id)
	res.json({ state: 'confirmed', email: row.email })
})

/** Asks for a reset link. The answer is the same whether or not the address has an account. */
router.post('/reset', (req, res) => {
	if (!mailAvailable()) return noMail(res)
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
	const user = findUserByEmail.get(email)
	// never awaited: how long the send takes, or whether it fails, must not tell which addresses have accounts
	if (user && !resendWait(user.id, 'reset')) inBackground(sendLink(req, user, 'reset', email))
	res.json({ email })
})

/** What a reset link still allows, read before the new password is asked for. */
router.get('/reset/:token', (req, res) => {
	const { state, row } = readToken(req.params.token, 'reset')
	res.json({ state, email: row?.email ?? null })
})

/** The new password from a reset link: every other session ends, a pending change of email is cancelled (20f),
    and this browser is signed in. */
router.post('/reset/:token', async (req, res) => {
	const { state, row } = readToken(req.params.token, 'reset')
	if (state !== 'valid') return res.status(410).json({ error: 'That link has expired.', state })
	const password = String(req.body?.password ?? '')
	if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` })
	const hash = await hashPassword(password)
	db.transaction(() => {
		setPassword.run(hash, row.user_id)
		endSessions.run(row.user_id)
		dropPendingLinks.run({ id: row.user_id })
		cancelPending.run(row.user_id)
		useToken(req.params.token)
	})()
	clearFailures.run(row.email)
	createSession(req, res, row.user_id)
	res.json({ email: row.email })
})
