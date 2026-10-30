import { Router } from 'express'
import { createSession, endOtherSessions } from '../lib/auth.js'
import { sendRecoveryCodeUsed, sendTwoStepOff, sendTwoStepOn } from '../lib/notices.js'
import { limitPerVisitor } from '../lib/rateLimit.js'
import { securityLog } from '../lib/securityLog.js'
import {
	checkCode, closeTicket, confirmTwoStep, readTicket, recoveryCodesLeft, renewRecoveryCodes, startTwoStep, turnOffTwoStep, twoStepOn, twoStepState
} from '../lib/twoStep.js'
import { db } from '../db.js'
import { checkPassword, locked } from './auth.js'
import { words } from '../lib/phrases.js'

/* Two-step sign-in: the code step after a right password, before the auth gate, and the account's
   own card (Settings), behind it. */
export const signInRouter = Router()
export const router = Router()

const WRONG_CODE = words('twoStep.wrongCode')
const WRONG_PASSWORD = words('account.wrongPassword')
// off answers a wrong pair vaguely, as sign-in does, so it does not say which half was wrong (11f)
const WRONG_PAIR = words('account.wrongPair')
const refused = (res, field, message) => res.status(400).json({ error: message, fields: { [field]: message } })
const TIMED_OUT = words('twoStep.timedOut')

const selectUser = db.prepare('SELECT id, email, needs_setup FROM users WHERE id = ?')
// what was typed, by its shape only: never the code itself
const typed = value => (/^\d{6}$/.test(String(value ?? '').replace(/\s+/g, '')) ? 'app code' : 'recovery code')

/** The code after the password: an app code or a recovery code. A right one signs in. */
signInRouter.post('/', limitPerVisitor({ most: 30, perSeconds: 15 * 60 }), (req, res) => {
	const ticket = String(req.body?.ticket ?? '')
	const kept = readTicket(ticket)
	if (!kept) {
		securityLog(req, 'code-step-refused', { reason: ticket ? 'timed out or unknown step' : 'no step' })
		return res.status(410).json({ error: TIMED_OUT })
	}
	const user = selectUser.get(kept.userId)
	const { ok, kind, wait, missing } = checkCode(kept.userId, req.body?.code)
	if (wait) {
		// after the wait, signing in starts again from the password
		closeTicket(ticket)
		securityLog(req, 'code-locked', { email: user.email, userId: user.id, typed: typed(req.body?.code), waitSeconds: wait })
		return locked(res, wait)
	}
	// `missing`: two-step sign-in was turned off while the step was open, and the password was right
	if (!ok && !missing) {
		securityLog(req, 'code-wrong', { email: user.email, userId: user.id, typed: typed(req.body?.code), at: 'sign-in' })
		return res.status(401).json({ error: WRONG_CODE })
	}
	closeTicket(ticket)
	const left = kind === 'recovery' ? recoveryCodesLeft(kept.userId) : null
	securityLog(req, 'signed-in', { email: user.email, userId: user.id, with: kind ? `password and ${kind === 'app' ? 'app code' : 'recovery code'}` : 'password', ...(left === null ? {} : { recoveryCodesLeft: left }) })
	if (kind === 'recovery') sendRecoveryCodeUsed(req, kept.userId, left)
	const token = createSession(req, res, user.id, { remember: kept.remember })
	res.json({ id: user.id, email: user.email, token, needsSetup: Boolean(user.needs_setup) })
})

/** Back on the code step: the ticket ends, and signing in starts again from the password. */
signInRouter.post('/cancel', (req, res) => {
	const kept = readTicket(String(req.body?.ticket ?? ''))
	if (kept) securityLog(req, 'code-step-left', { userId: kept.userId })
	closeTicket(String(req.body?.ticket ?? ''))
	res.status(204).end()
})

/** What the Settings card shows. */
router.get('/', (req, res) => res.json(twoStepState(req.user.id)))

/** A new key for the app, once the password is given. Nothing is on until /confirm. */
router.post('/start', async (req, res) => {
	if (!twoStepState(req.user.id).available) return res.status(409).json({ error: words('twoStep.unavailable') })
	if (twoStepOn(req.user.id)) return res.status(409).json({ error: words('twoStep.alreadyOn') })
	const { user, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!user) return refused(res, 'password', WRONG_PASSWORD)
	securityLog(req, 'two-step-key-made')
	res.json(startTwoStep(req.user.id, req.user.email))
})

/** The app's first code turns it on. The recovery codes are in this answer only. Every other
    session ends, since it was opened with the password alone. */
router.post('/confirm', (req, res) => {
	const { ok, wait, missing, recoveryCodes } = confirmTwoStep(req.user.id, req.body?.code)
	if (missing) return res.status(409).json({ error: words('twoStep.noKey') })
	if (wait) {
		securityLog(req, 'code-locked', { at: 'turning on', waitSeconds: wait })
		return locked(res, wait)
	}
	if (!ok) {
		securityLog(req, 'code-wrong', { typed: typed(req.body?.code), at: 'turning on' })
		return refused(res, 'code', WRONG_CODE)
	}
	endOtherSessions(req, req.user.id)
	securityLog(req, 'two-step-on', { endedOtherSessions: true })
	sendTwoStepOn(req, req.user.id)
	res.json({ ...twoStepState(req.user.id), recoveryCodes })
})

/** New recovery codes for a right code; the earlier ones stop working. */
router.post('/recovery-codes', (req, res) => {
	const { ok, wait, missing } = checkCode(req.user.id, req.body?.code)
	if (missing) return res.status(409).json({ error: words('twoStep.off') })
	if (wait) {
		securityLog(req, 'code-locked', { at: 'new recovery codes', waitSeconds: wait })
		return locked(res, wait)
	}
	if (!ok) {
		securityLog(req, 'code-wrong', { typed: typed(req.body?.code), at: 'new recovery codes' })
		return refused(res, 'code', WRONG_CODE)
	}
	securityLog(req, 'recovery-codes-renewed', { with: typed(req.body?.code) })
	res.json({ ...twoStepState(req.user.id), recoveryCodes: renewRecoveryCodes(req.user.id) })
})

/** Off, with the password and a code. */
router.post('/off', async (req, res) => {
	if (!twoStepOn(req.user.id)) return res.status(409).json({ error: words('twoStep.off') })
	const { user, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!user) return refused(res, 'code', WRONG_PAIR)
	const code = checkCode(req.user.id, req.body?.code)
	if (code.wait) {
		securityLog(req, 'code-locked', { at: 'turning off', waitSeconds: code.wait })
		return locked(res, code.wait)
	}
	if (!code.ok) {
		securityLog(req, 'code-wrong', { typed: typed(req.body?.code), at: 'turning off' })
		return refused(res, 'code', WRONG_PAIR)
	}
	turnOffTwoStep(req.user.id)
	securityLog(req, 'two-step-off', { with: typed(req.body?.code) })
	sendTwoStepOff(req, req.user.id)
	res.json(twoStepState(req.user.id))
})
