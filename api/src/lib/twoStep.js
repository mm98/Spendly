import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { renderSVG } from 'uqr'
import { db } from '../db.js'
import { nowEpoch } from './dates.js'
import { lockSecret, secretBoxReady, unlockSecret } from './secretBox.js'

/* Two-step sign-in: time-based codes from an authenticator app (RFC 6238: SHA-1, 6 digits,
   30 seconds, the values every app expects), and one-time recovery codes in their place. */

const STEP_SECONDS = 30
const DIGITS = 6
// a code from the step before or after also counts, for a phone clock a little off
const DRIFT_STEPS = 1
export const RECOVERY_CODE_COUNT = 10
// no 0/O, 1/I/L: a recovery code is often typed from paper
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/* Lock-out: this many wrong codes for one account within the window stops the code step until
   LOCK_SECONDS after the last one. Per account, because whoever reaches this step has its password. */
const LOCK_AFTER = 5
const LOCK_WINDOW_SECONDS = 15 * 60
const LOCK_SECONDS = 5 * 60

export function base32(bytes) {
	let bits = 0, value = 0, out = ''
	for (const byte of bytes) {
		value = (value << 8) | byte
		bits += 8
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31]
			bits -= 5
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
	return out
}

/** The code an app shows for `secret` in time step `step`. */
export function codeAt(secret, step) {
	const counter = Buffer.alloc(8)
	counter.writeBigUInt64BE(BigInt(step))
	const mac = createHmac('sha1', secret).update(counter).digest()
	const at = mac[mac.length - 1] & 0x0f
	const number = (mac.readUInt32BE(at) & 0x7fffffff) % 10 ** DIGITS
	return String(number).padStart(DIGITS, '0')
}

export const stepAt = (epoch = nowEpoch()) => Math.floor(epoch / STEP_SECONDS)

const sameText = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** The step `code` belongs to, when it is right now and newer than `lastStep`; otherwise null. */
export function matchStep(secret, code, lastStep, now = nowEpoch()) {
	const current = stepAt(now)
	for (let step = current - DRIFT_STEPS; step <= current + DRIFT_STEPS; step++)
		if (step > lastStep && sameText(codeAt(secret, step), code)) return step
	return null
}

const appCode = code => /^\d{6}$/.test(code)
// a recovery code is typed with or without its dash, in either case
const recoveryHash = code => createHash('sha256').update(code.toUpperCase().replace(/[\s-]/g, '')).digest('hex')

export const cleanCode = value => String(value ?? '').trim().replace(/\s+/g, '')

/* ---- what is stored ---- */

const selectTwoStep = db.prepare('SELECT secret, turned_on_at, last_step FROM user_two_step WHERE user_id = ?')
const upsertWaiting = db.prepare(`INSERT INTO user_two_step (user_id, secret, created_at) VALUES (?, ?, ?)
	ON CONFLICT (user_id) DO UPDATE SET secret = excluded.secret, created_at = excluded.created_at, turned_on_at = NULL, last_step = 0`)
const turnOnRow = db.prepare('UPDATE user_two_step SET turned_on_at = ?, last_step = ? WHERE user_id = ? AND turned_on_at IS NULL')
const setLastStep = db.prepare('UPDATE user_two_step SET last_step = ? WHERE user_id = ? AND last_step < ?')
const deleteTwoStep = db.prepare('DELETE FROM user_two_step WHERE user_id = ?')
const countCodes = db.prepare('SELECT COUNT(*) AS n FROM user_two_step_recovery_codes WHERE user_id = ?')
const insertCode = db.prepare('INSERT INTO user_two_step_recovery_codes (user_id, code_hash) VALUES (?, ?)')
const deleteCode = db.prepare('DELETE FROM user_two_step_recovery_codes WHERE user_id = ? AND code_hash = ?')
const deleteCodes = db.prepare('DELETE FROM user_two_step_recovery_codes WHERE user_id = ?')
const recentFailures = db.prepare('SELECT COUNT(*) AS n, MAX(at) AS last FROM user_two_step_failures WHERE user_id = ? AND at > ?')
const insertFailure = db.prepare('INSERT INTO user_two_step_failures (user_id, at) VALUES (?, ?)')
const purgeFailures = db.prepare('DELETE FROM user_two_step_failures WHERE at <= ?')
const clearFailures = db.prepare('DELETE FROM user_two_step_failures WHERE user_id = ?')

/** True when signing in to this account asks for a code. */
export const twoStepOn = userId => Boolean(selectTwoStep.get(userId)?.turned_on_at)

/** What Settings shows. */
export function twoStepState(userId) {
	const row = selectTwoStep.get(userId)
	const on = Boolean(row?.turned_on_at)
	return { available: secretBoxReady(), on, onSince: on ? row.turned_on_at : null, recoveryCodesLeft: on ? countCodes.get(userId).n : 0 }
}

/** A new key, waiting for its first right code. Replaces one that waited before. */
export function startTwoStep(userId, email) {
	const secret = randomBytes(20)
	upsertWaiting.run(userId, lockSecret(secret), nowEpoch())
	const key = base32(secret)
	const label = encodeURIComponent(`Spendly:${email}`)
	// SHA-1, 6 digits and 30 seconds are what an app assumes when the address names none
	const uri = `otpauth://totp/${label}?secret=${key}&issuer=Spendly`
	return { key, uri, qr: renderSVG(uri) }
}

function newRecoveryCodes(userId) {
	const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
		const chars = Array.from({ length: 8 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join('')
		return `${chars.slice(0, 4)}-${chars.slice(4)}`
	})
	db.transaction(() => {
		deleteCodes.run(userId)
		for (const code of codes) insertCode.run(userId, recoveryHash(code))
	})()
	return codes
}

/** Seconds until a code may be tried again for this account, 0 when it may now. */
export function codeWait(userId, now = nowEpoch()) {
	const { n, last } = recentFailures.get(userId, now - LOCK_WINDOW_SECONDS)
	return n >= LOCK_AFTER ? Math.max(0, last + LOCK_SECONDS - now) : 0
}

/* Every code is checked under the lock-out, counted before the check and cleared once it is right,
   so codes sent at once all count. Answers `{ ok: true, kind }`, `{ wait }` or `{}`. */
function underLock(userId, check) {
	const wait = codeWait(userId)
	if (wait) return { wait }
	const now = nowEpoch()
	db.transaction(() => {
		purgeFailures.run(now - 24 * 60 * 60)
		insertFailure.run(userId, now)
	})()
	const kind = check()
	if (!kind) {
		const after = codeWait(userId, now)
		return after ? { wait: after } : {}
	}
	clearFailures.run(userId)
	return { ok: true, kind }
}

/** The first right code turns two-step sign-in on and gives the recovery codes. */
export function confirmTwoStep(userId, value) {
	const row = selectTwoStep.get(userId)
	if (!row || row.turned_on_at) return { missing: true }
	const code = cleanCode(value)
	let step = null
	const result = underLock(userId, () => {
		const secret = appCode(code) ? unlockSecret(row.secret) : null
		step = secret ? matchStep(secret, code, row.last_step) : null
		return step === null ? null : 'app'
	})
	if (!result.ok) return result
	turnOnRow.run(nowEpoch(), step, userId)
	return { ok: true, recoveryCodes: newRecoveryCodes(userId) }
}

/** An app code or a recovery code for an account with two-step sign-in on. A recovery code is used up. */
export function checkCode(userId, value) {
	const row = selectTwoStep.get(userId)
	if (!row?.turned_on_at) return { missing: true }
	const code = cleanCode(value)
	return underLock(userId, () => {
		if (appCode(code)) {
			const secret = unlockSecret(row.secret)
			const step = secret ? matchStep(secret, code, row.last_step) : null
			// the guard in the update makes two requests with one code count only once
			return step !== null && setLastStep.run(step, userId, step).changes ? 'app' : null
		}
		return code.length >= 8 && deleteCode.run(userId, recoveryHash(code)).changes ? 'recovery' : null
	})
}

/** New recovery codes; the earlier ones stop working. */
export const renewRecoveryCodes = userId => newRecoveryCodes(userId)

export const recoveryCodesLeft = userId => countCodes.get(userId).n

/** Removes the key and the recovery codes: signing in asks only for the password. */
export const turnOffTwoStep = userId => db.transaction(() => {
	deleteTwoStep.run(userId)
	deleteCodes.run(userId)
	clearFailures.run(userId)
})()

/* ---- the step between a right password and a session ---- */

// how long the code step stays open after the password
const TICKET_MS = 5 * 60 * 1000
// a ticket needs a right password, but they are capped all the same
const MAX_TICKETS = 1000
const tickets = new Map()   // ticket -> { userId, remember, at }, oldest first

/** A ticket for the code step. It opens nothing by itself. */
export function openTicket(userId, remember) {
	const now = Date.now()
	for (const [k, kept] of tickets) {
		if (now - kept.at <= TICKET_MS) break
		tickets.delete(k)
	}
	const ticket = randomBytes(24).toString('base64url')
	tickets.set(ticket, { userId, remember, at: now })
	while (tickets.size > MAX_TICKETS) tickets.delete(tickets.keys().next().value)
	return ticket
}

/** The ticket's account, or null when there is none or its time is over. */
export function readTicket(ticket) {
	const kept = tickets.get(ticket)
	if (kept && Date.now() - kept.at <= TICKET_MS) return kept
	tickets.delete(ticket)
	return null
}

export const closeTicket = ticket => tickets.delete(ticket)

/** Ends every open code step of the account. */
export function closeTicketsOf(userId) {
	for (const [ticket, kept] of tickets) if (kept.userId === userId) tickets.delete(ticket)
}
