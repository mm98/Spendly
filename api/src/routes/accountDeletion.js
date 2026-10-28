import { Router } from 'express'
import { deleteAccount } from '../lib/accountDeletion.js'
import { clearCookie, SESSION_COOKIE } from '../lib/cookies.js'
import { sendAccountDeleted } from '../lib/notices.js'
import { securityLog } from '../lib/securityLog.js'
import { checkCode, twoStepOn } from '../lib/twoStep.js'
import { checkPassword, locked } from './auth.js'

/* Delete account (Settings 11g): the password, and a code when two-step sign-in is on, delete the
   signed-in account for good and end every session it had (lib/accountDeletion.js). */
export const router = Router()

const WRONG_PASSWORD = "That password isn't right."
// with two-step sign-in on, a wrong pair is answered vaguely, as Turn off does, so it does not say which half was wrong
const WRONG_PAIR = 'That password and code do not match. Check both and try again.'
const refused = (res, field, message) => res.status(400).json({ error: message, fields: { [field]: message } })

router.delete('/', async (req, res) => {
	const userId = req.user.id
	const askCode = twoStepOn(userId)
	const { user, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!user) return askCode ? refused(res, 'code', WRONG_PAIR) : refused(res, 'password', WRONG_PASSWORD)
	if (askCode) {
		const code = checkCode(userId, req.body?.code)
		if (code.wait) {
			securityLog(req, 'code-locked', { at: 'deleting the account', waitSeconds: code.wait })
			return locked(res, code.wait)
		}
		if (!code.ok) {
			securityLog(req, 'code-wrong', { at: 'deleting the account' })
			return refused(res, 'code', WRONG_PAIR)
		}
	}
	const account = deleteAccount(userId)
	if (!account) return res.status(404).json({ error: 'There is no such account.' })
	securityLog(req, 'account-deleted', { with: askCode ? 'password and code' : 'password' })
	clearCookie(res, SESSION_COOKIE)
	sendAccountDeleted(req, account)
	res.status(204).end()
})
