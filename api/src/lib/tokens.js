import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db.js'
import { nowEpoch } from './dates.js'

// a confirming link lasts a day; a reset link an hour, because it can change a password (20b, 20c)
export const TOKEN_TTL = { confirm: 24 * 60 * 60, reset: 60 * 60 }
// how long a reader waits before the same link can be sent again
export const RESEND_AFTER_SECONDS = 60

const hashOf = token => createHash('sha256').update(String(token)).digest('hex')

const dropOpen = db.prepare('DELETE FROM account_tokens WHERE user_id = ? AND kind = ? AND used_at IS NULL')
const insertToken = db.prepare(`INSERT INTO account_tokens (token_hash, user_id, kind, email, expires_at, created_at)
	VALUES (?, ?, ?, ?, ?, ?)`)
const selectToken = db.prepare('SELECT user_id, kind, email, expires_at, used_at FROM account_tokens WHERE token_hash = ?')
const markUsed = db.prepare('UPDATE account_tokens SET used_at = ? WHERE token_hash = ?')
const lastSent = db.prepare('SELECT MAX(created_at) AS at FROM account_tokens WHERE user_id = ? AND kind = ?')

/** A new single-use token; any earlier one of the same kind for this account stops working. */
export function issueToken(userId, kind, email) {
	const token = randomBytes(24).toString('base64url')
	const now = nowEpoch()
	db.transaction(() => {
		dropOpen.run(userId, kind)
		insertToken.run(hashOf(token), userId, kind, email, now + TOKEN_TTL[kind], now)
	})()
	return token
}

/** Seconds until another link of this kind may be sent, 0 when it may be sent now. */
export function resendWait(userId, kind) {
	const at = lastSent.get(userId, kind)?.at
	return at ? Math.max(0, at + RESEND_AFTER_SECONDS - nowEpoch()) : 0
}

/** { state: 'valid' | 'used' | 'expired', row } -- a malformed token reads as expired (20b). */
export function readToken(token, kind) {
	const row = selectToken.get(hashOf(token))
	if (!row || row.kind !== kind) return { state: 'expired', row: null }
	if (row.used_at) return { state: 'used', row }
	if (row.expires_at <= nowEpoch()) return { state: 'expired', row }
	return { state: 'valid', row }
}

export const useToken = token => markUsed.run(nowEpoch(), hashOf(token))
