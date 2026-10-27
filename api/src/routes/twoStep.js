import { Router } from 'express'
import { createSession, endOtherSessions } from '../lib/auth.js'
import { limitPerVisitor } from '../lib/rateLimit.js'
import {
	checkCode, closeTicket, confirmTwoStep, readTicket, renewRecoveryCodes, startTwoStep, turnOffTwoStep, twoStepOn, twoStepState
} from '../lib/twoStep.js'
import { db } from '../db.js'
import { checkPassword, locked } from './auth.js'

/* Two-step sign-in: the code step after a right password, before the auth gate, and the account's
   own card (Settings), behind it. */
export const signInRouter = Router()
export const router = Router()

const WRONG_CODE = 'That code is not right.'
const TIMED_OUT = 'Signing in took too long. Start again.'

const selectUser = db.prepare('SELECT id, email, needs_setup FROM users WHERE id = ?')

/** The code after the password: an app code or a recovery code. A right one signs in. */
signInRouter.post('/', limitPerVisitor({ most: 30, perSeconds: 15 * 60 }), (req, res) => {
	const ticket = String(req.body?.ticket ?? '')
	const kept = readTicket(ticket)
	if (!kept) return res.status(410).json({ error: TIMED_OUT })
	const { ok, wait, missing } = checkCode(kept.userId, req.body?.code)
	if (wait) {
		// after the wait, signing in starts again from the password
		closeTicket(ticket)
		return locked(res, wait)
	}
	// `missing`: two-step sign-in was turned off while the step was open, and the password was right
	if (!ok && !missing) return res.status(401).json({ error: WRONG_CODE })
	closeTicket(ticket)
	const user = selectUser.get(kept.userId)
	const token = createSession(req, res, user.id, { remember: kept.remember })
	res.json({ id: user.id, email: user.email, token, needsSetup: Boolean(user.needs_setup) })
})

/** What the Settings card shows. */
router.get('/', (req, res) => res.json(twoStepState(req.user.id)))

/** A new key for the app, once the password is given. Nothing is on until /confirm. */
router.post('/start', async (req, res) => {
	if (twoStepOn(req.user.id)) return res.status(409).json({ error: 'Two-step sign-in is already on.' })
	const { user, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!user) return res.status(401).json({ error: 'Wrong password.' })
	res.json(startTwoStep(req.user.id, req.user.email))
})

/** The app's first code turns it on. The recovery codes are in this answer only. Every other
    session ends, since it was opened with the password alone. */
router.post('/confirm', (req, res) => {
	const { ok, wait, missing, recoveryCodes } = confirmTwoStep(req.user.id, req.body?.code)
	if (missing) return res.status(409).json({ error: 'Start again: there is no new key waiting.' })
	if (wait) return locked(res, wait)
	if (!ok) return res.status(401).json({ error: WRONG_CODE })
	endOtherSessions(req, req.user.id)
	res.json({ ...twoStepState(req.user.id), recoveryCodes })
})

/** New recovery codes for a right code; the earlier ones stop working. */
router.post('/recovery-codes', (req, res) => {
	const { ok, wait, missing } = checkCode(req.user.id, req.body?.code)
	if (missing) return res.status(409).json({ error: 'Two-step sign-in is off.' })
	if (wait) return locked(res, wait)
	if (!ok) return res.status(401).json({ error: WRONG_CODE })
	res.json({ ...twoStepState(req.user.id), recoveryCodes: renewRecoveryCodes(req.user.id) })
})

/** Off, with the password and a code. */
router.post('/off', async (req, res) => {
	if (!twoStepOn(req.user.id)) return res.status(409).json({ error: 'Two-step sign-in is off.' })
	const { user, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!user) return res.status(401).json({ error: 'Wrong password.' })
	const code = checkCode(req.user.id, req.body?.code)
	if (code.wait) return locked(res, code.wait)
	if (!code.ok) return res.status(401).json({ error: WRONG_CODE })
	turnOffTwoStep(req.user.id)
	res.json(twoStepState(req.user.id))
})
