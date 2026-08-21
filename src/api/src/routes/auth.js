import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth } from '../lib/auth.js'
import { LOCALES } from '../lib/constants.js'
import { seedAccountDefaults } from '../seed.js'

export const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const findUserByEmail = db.prepare('SELECT id, email, password_hash, needs_setup FROM users WHERE email = ?')
/* needs_setup named rather than left to its column default, which is 0. The default belongs to
   the accounts that already existed when the column was added; 1 belongs to accounts created
   from here, and writing it out is what keeps those two facts from being one fact
   (migrations/014_first_run.sql). */
const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, needs_setup) VALUES (?, ?, ?, 1)')
/* Cleared the moment the reader arrives on the settings page, not when they leave it or save
   something: the flag records that they were shown the page, and they have been. Anything
   later -- a save, a navigation away -- makes a reader who reads the page and closes the tab
   into a reader who gets sent back to it next time, which is the one behaviour a one-time
   detour must not have. */
const clearNeedsSetup = db.prepare('UPDATE users SET needs_setup = 0 WHERE id = ?')

router.post('/register', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
	if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
	if (findUserByEmail.get(email)) return res.status(409).json({ error: 'An account with that email already exists.' })

	/* Where the reader is, as their browser worked it out -- see the client's detectLocale
	   (src/react/src/api/format.js). It is a guess from a timezone, so it is offered rather than
	   trusted: anything not on the list becomes 'auto', which is the same answer an older
	   client that sends nothing at all gets. The reader is then shown the settings page with
	   this already selected, so a wrong guess costs one click and never goes unseen. */
	const locale = LOCALES.includes(String(req.body?.locale ?? '')) ? req.body.locale : 'auto'

	const id = newId('u')
	const passwordHash = await hashPassword(password)
	/* The pre-check above stays -- it spares the ~65ms scrypt hash on the common duplicate --
	   but it cannot be the guarantee: two same-email registrations can both pass it during that
	   await, and the loser's INSERT then hit the UNIQUE constraint and surfaced as a 500. The
	   constraint is the real check, so its violation gets the same 409 the serialized case gets. */
	try {
		db.transaction(() => {
			insertUser.run(id, email, passwordHash)
			seedAccountDefaults(db, id, { locale })
		})()
	} catch (e) {
		if (e.code === 'SQLITE_CONSTRAINT_UNIQUE')
			return res.status(409).json({ error: 'An account with that email already exists.' })
		throw e
	}

	const token = createSession(res, id)
	res.status(201).json({ id, email, token, needsSetup: true })
})

router.post('/login', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	const user = findUserByEmail.get(email)
	if (!user || !(await verifyPassword(password, user.password_hash)))
		return res.status(401).json({ error: 'Wrong email or password.' })

	const token = createSession(res, user.id)
	res.json({ id: user.id, email: user.email, token, needsSetup: Boolean(user.needs_setup) })
})

router.post('/logout', (req, res) => {
	destroySession(req, res)
	res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
	res.json({
		id: req.user.id, needsSetup: Boolean(req.user.needs_setup),
		// An install fact, not an account one -- whether this server can actually read a
		// scanned document (lib/scanParse.js needs ANTHROPIC_API_KEY) or only store it. Scan
		// itself works either way; this is what lets the page stop promising a read it can't
		// do. Carried on the one request every page already makes before it renders
		// (src/react/src/routes.jsx's route loader) rather than a second fetch Scan alone would pay for.
		scanAiEnabled: Boolean(process.env.ANTHROPIC_API_KEY)
	})
})

/** Marks the settings page as seen. A POST rather than a side effect of GET /settings: that
    route is read by the route loader on every navigation, so hanging a write off it would
    clear the flag before the reader had been sent anywhere by it. */
router.post('/setup-seen', requireAuth, (req, res) => {
	clearNeedsSetup.run(req.user.id)
	res.status(204).end()
})
