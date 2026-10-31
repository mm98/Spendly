import { Router } from 'express'
import {
	generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse
} from '@simplewebauthn/server'
import { db } from '../db.js'
import { createSession } from '../lib/auth.js'
import { nowEpoch } from '../lib/dates.js'
import { sendPasskeyAdded } from '../lib/notices.js'
import { keepChallenge, newTicket, passkeyName, passkeySite, takeChallenge } from '../lib/passkeys.js'
import { forgetReads } from '../lib/readCache.js'
import { limitPerVisitor } from '../lib/rateLimit.js'
import { securityLog } from '../lib/securityLog.js'
import { MAX_NAME, checkPassword, cleanName, locked } from './auth.js'
import { words } from '../lib/phrases.js'

/* Passkeys (20a, 20b, Settings > Passkeys): signing in with one, before the auth gate, and the
   account's own list, behind it. A passkey sits beside the password, never instead of it. */
export const signInRouter = Router()
export const router = Router()

const NOT_SET_UP = words('passkey.notSetUp')
// the vague sign-in error (20a): a passkey this server does not know reads like one that failed
const DID_NOT_WORK = "That passkey didn't work. Try again, or use your password."

const selectForSignIn = db.prepare(`SELECT p.id, p.user_id, p.public_key, p.counter, p.transports, u.email, u.needs_setup
	FROM user_passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?`)
const markUsed = db.prepare('UPDATE user_passkeys SET counter = ?, last_used_at = ? WHERE id = ?')
const selectMine = db.prepare('SELECT id, name, transports, created_at, last_used_at FROM user_passkeys WHERE user_id = ? ORDER BY created_at')
const insertPasskey = db.prepare(`INSERT INTO user_passkeys (id, user_id, public_key, counter, transports, name, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?)`)
const renamePasskey = db.prepare('UPDATE user_passkeys SET name = ? WHERE id = ? AND user_id = ?')
const deletePasskey = db.prepare('DELETE FROM user_passkeys WHERE id = ? AND user_id = ?')
const selectUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?')

const transportsOf = row => (row.transports ? JSON.parse(row.transports) : undefined)
const shown = row => ({ id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at ?? null })
const notSetUp = res => res.status(409).json({ error: NOT_SET_UP })
const userHandleOf = userId => Buffer.from(userId).toString('base64url')

/** A sign-in prompt. No address is asked for first: a passkey names its own account. */
// asked each time the sign-in page opens, and the prompts it makes are held in memory
signInRouter.post('/start', limitPerVisitor({ most: 60, perSeconds: 15 * 60 }), async (req, res) => {
	const site = passkeySite()
	if (!site) return notSetUp(res)
	const options = await generateAuthenticationOptions({ rpID: site.rpID, userVerification: 'preferred' })
	const ticket = newTicket()
	keepChallenge(`in:${ticket}`, options.challenge)
	res.json({ ticket, options })
})

/** The device's answer. A known passkey that proves itself signs in; a password lock-out does not stop it. */
signInRouter.post('/finish', async (req, res) => {
	const site = passkeySite()
	if (!site) return notSetUp(res)
	const challenge = takeChallenge(`in:${String(req.body?.ticket ?? '')}`)
	const answer = req.body?.response
	const row = challenge && typeof answer?.id === 'string' ? selectForSignIn.get(answer.id) : null
	const handle = answer?.response?.userHandle
	if (!row || (handle && handle !== userHandleOf(row.user_id))) {
		securityLog(req, 'passkey-sign-in-refused', { reason: !challenge ? 'no open prompt' : !row ? 'unknown passkey' : 'passkey of another account', ...(row ? { email: row.email, userId: row.user_id } : {}) })
		return res.status(401).json({ error: DID_NOT_WORK })
	}
	const result = await verifyAuthenticationResponse({
		response: answer, expectedChallenge: challenge, expectedOrigin: site.origin, expectedRPID: site.rpID,
		credential: { id: row.id, publicKey: new Uint8Array(row.public_key), counter: row.counter, transports: transportsOf(row) },
		requireUserVerification: false
	}).catch(error => {
		console.error('[passkey] the check failed:', error.message)
		return null
	})
	if (!result?.verified) {
		securityLog(req, 'passkey-sign-in-refused', { reason: 'did not prove itself', email: row.email, userId: row.user_id, passkeyId: row.id })
		return res.status(401).json({ error: DID_NOT_WORK })
	}
	markUsed.run(result.authenticationInfo.newCounter, nowEpoch(), row.id)
	// "last used" changed outside any request of the account's own, so its cached reads go
	forgetReads(row.user_id)
	securityLog(req, 'signed-in', { email: row.email, userId: row.user_id, with: 'passkey', passkeyId: row.id })
	const token = createSession(req, res, row.user_id, { remember: req.body?.remember !== false })
	res.json({ id: row.user_id, email: row.email, token, needsSetup: Boolean(row.needs_setup) })
})

/** The account's passkeys, oldest first. */
router.get('/', (req, res) => res.json({ passkeys: selectMine.all(req.user.id).map(shown) }))

/** A prompt to add one, once the password is given: a passkey outlives a password change, so a
    signed-in device alone is not enough. The device is told which passkeys it already holds. */
router.post('/start', async (req, res) => {
	const site = passkeySite()
	if (!site) return notSetUp(res)
	const { user: known, wait } = await checkPassword(req, req.user.email, String(req.body?.password ?? ''))
	if (wait) return locked(res, wait)
	if (!known) return res.status(400).json({ error: words('passkey.wrongPassword'), fields: { password: words('passkey.wrongPassword') } })
	const user = selectUser.get(req.user.id)
	const options = await generateRegistrationOptions({
		rpName: 'Spendly', rpID: site.rpID,
		userID: new TextEncoder().encode(user.id), userName: user.email, userDisplayName: user.name || user.email,
		attestationType: 'none',
		excludeCredentials: selectMine.all(user.id).map(p => ({ id: p.id, transports: transportsOf(p) })),
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
	})
	keepChallenge(`add:${user.id}`, options.challenge)
	res.json(options)
})

/** The device's new passkey, under the name its maker or device gives. The address is told (20f). */
router.post('/', async (req, res) => {
	const site = passkeySite()
	if (!site) return notSetUp(res)
	const challenge = takeChallenge(`add:${req.user.id}`)
	if (!challenge) return res.status(400).json({ error: words('passkey.tooLong') })
	const result = await verifyRegistrationResponse({
		response: req.body?.response, expectedChallenge: challenge, expectedOrigin: site.origin, expectedRPID: site.rpID,
		requireUserVerification: false
	}).catch(error => {
		console.error('[passkey] the check failed:', error.message)
		return null
	})
	if (!result?.verified) {
		securityLog(req, 'passkey-add-refused', { reason: 'did not prove itself' })
		return res.status(400).json({ error: words('passkey.notAdded') })
	}
	const { credential, aaguid } = result.registrationInfo
	const name = passkeyName(aaguid, req.get('user-agent'))
	const at = nowEpoch()
	try {
		insertPasskey.run(credential.id, req.user.id, Buffer.from(credential.publicKey), credential.counter,
			JSON.stringify(credential.transports ?? []), name, at)
	} catch (e) {
		if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return res.status(409).json({ error: words('passkey.alreadyAdded') })
		throw e
	}
	securityLog(req, 'passkey-added', { passkeyId: credential.id, name })
	sendPasskeyAdded(req, req.user.id, name)
	res.status(201).json(shown({ id: credential.id, name, created_at: at }))
})

router.patch('/:id', (req, res) => {
	const name = cleanName(req.body?.name)
	if (!name) return res.status(400).json({ error: words('passkey.nameMissing') })
	if (name.length > MAX_NAME) return res.status(400).json({ error: words('account.nameLong', { most: MAX_NAME }) })
	if (!renamePasskey.run(name, req.params.id, req.user.id).changes) return res.status(404).json({ error: words('passkey.notHere') })
	res.json({ id: req.params.id, name })
})

/** Removing one sends nothing, and the password keeps working, so removing the last one locks nobody out. */
router.delete('/:id', (req, res) => {
	if (!deletePasskey.run(req.params.id, req.user.id).changes) return res.status(404).json({ error: words('passkey.notHere') })
	securityLog(req, 'passkey-removed', { passkeyId: req.params.id })
	res.status(204).end()
})
