import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '../db.js'
import { newSessionId } from './ids.js'
import { nowEpoch } from './dates.js'
import { readCookie, setCookie, clearCookie, SESSION_COOKIE } from './cookies.js'
import { mcpMayRead, mcpTokenUser } from './mcpTokens.js'

const scryptAsync = promisify(scrypt)

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, KEY_LEN = 64
// "Stay signed in" keeps a session 30 days; without it the cookie ends with the browser, and the row after a day
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
const SHORT_TTL_SECONDS = 24 * 60 * 60
// Sliding sessions renew on use, but not on every request -- only once the session is more than
// a day past its last renewal, so an active user never re-writes the row (and re-sends the
// cookie) more than once a day, while an idle one still expires a full term after their last request.
const SESSION_RENEW_AFTER_SECONDS = 24 * 60 * 60
const SHORT_RENEW_AFTER_SECONDS = 60 * 60
const ttlOf = remember => (remember ? SESSION_TTL_SECONDS : SHORT_TTL_SECONDS)
const renewAfterOf = remember => (remember ? SESSION_RENEW_AFTER_SECONDS : SHORT_RENEW_AFTER_SECONDS)

/** Self-describing so the cost parameters can change later without breaking existing hashes. */
export async function hashPassword(password) {
	const salt = randomBytes(16)
	const hash = await scryptAsync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
	return `${SCRYPT_N}.${SCRYPT_R}.${SCRYPT_P}.${salt.toString('hex')}.${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
	const [N, r, p, saltHex, hashHex] = stored.split('.')
	const salt = Buffer.from(saltHex, 'hex')
	const expected = Buffer.from(hashHex, 'hex')
	const actual = await scryptAsync(password, salt, expected.length,
		{ N: Number(N), r: Number(r), p: Number(p) })
	return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const insertSession = db.prepare('INSERT INTO user_sessions (id, user_id, expires_at, remember) VALUES (?, ?, ?, ?)')
const purgeExpiredSessions = db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?')
/* The purge rides on session creation because nothing else ever removed an expired row: the
   lookup below filters them out but leaves them, logout deletes only its own, and no account
   flow deletes users -- so the table only grew, and requireAuth probes it on every request.
   Swept here, it stays at roughly the live-session count; one sweep and the insert commit
   together so a login costs the one fsync it always did. */
const openSession = db.transaction((id, userId, expiresAt, remember) => {
	purgeExpiredSessions.run(nowEpoch())
	insertSession.run(id, userId, expiresAt, remember ? 1 : 0)
})

export function createSession(req, res, userId, { remember = true } = {}) {
	const id = newSessionId()
	const expiresAt = nowEpoch() + ttlOf(remember)
	openSession(id, userId, expiresAt, remember)
	setCookie(req, res, SESSION_COOKIE, id, { maxAgeSeconds: remember ? SESSION_TTL_SECONDS : undefined })
	// Returned so login and register can hand the same token back in the body: a script uses
	// it as `Authorization: Bearer <token>` instead of parsing Set-Cookie. One token, two
	// carriers, one session row either way.
	return id
}

/** The one place a session token is read from a request: an explicit Authorization header
    wins, the browser's cookie is the default. Both carry the same server-side session id, so
    everything below them -- lookup, expiry, logout -- is identical for either. */
function sessionToken(req) {
	const bearer = req.headers.authorization
	if (bearer?.startsWith('Bearer ')) return bearer.slice(7).trim()
	return readCookie(req, SESSION_COOKIE)
}

const deleteSession = db.prepare('DELETE FROM user_sessions WHERE id = ?')
const deleteOtherSessions = db.prepare('DELETE FROM user_sessions WHERE user_id = ? AND id <> ?')

/** Signs the user out everywhere but the session this request came with. */
export function endOtherSessions(req, userId) {
	deleteOtherSessions.run(userId, sessionToken(req) ?? '')
}

export function destroySession(req, res) {
	const token = sessionToken(req)
	if (token) deleteSession.run(token)
	clearCookie(res, SESSION_COOKIE)
}

const selectSessionUser = db.prepare(`
	SELECT u.id, u.email, u.needs_setup, u.email_confirmed, s.expires_at, s.remember FROM user_sessions s
	JOIN users u ON u.id = s.user_id
	WHERE s.id = ? AND s.expires_at > ?
`)
const renewSession = db.prepare('UPDATE user_sessions SET expires_at = ? WHERE id = ?')

/** The signed-in user, or null, for a route open to everyone that answers differently for a user.
    Does not renew the session: only requireAuth does that. */
export function sessionUser(req) {
	const token = sessionToken(req)
	return token ? selectSessionUser.get(token, nowEpoch()) ?? null : null
}

/** Loads req.user from the session token — Authorization: Bearer or the session cookie — or
    responds 401. Every data route sits behind this: a route never trusts a userId from the
    request body or params, only from here.

    Sliding expiration: a session used within SESSION_RENEW_AFTER_SECONDS of its last renewal is
    left alone; past that, both the row and the cookie are pushed out another SESSION_TTL_SECONDS
    from now, so an active session never expires mid-use and an idle one still expires a full term
    after the last request that touched it. */
export function requireAuth(req, res, next) {
	const token = sessionToken(req)
	const now = nowEpoch()
	const user = token ? selectSessionUser.get(token, now) : null
	if (!user) {
		// an assistant's token opens only the read routes /mcp asks for what its tools answer
		const reader = mcpMayRead(req) ? mcpTokenUser(token) : null
		if (!reader) return res.status(401).json({ error: 'Not signed in.' })
		req.user = reader
		return next()
	}
	const ttl = ttlOf(user.remember)
	if (user.expires_at - now < ttl - renewAfterOf(user.remember)) {
		renewSession.run(now + ttl, token)
		setCookie(req, res, SESSION_COOKIE, token, { maxAgeSeconds: user.remember ? ttl : undefined })
	}
	req.user = user
	next()
}

/** Scanning and importing wait until the account's email is confirmed (20b). */
export function requireConfirmed(req, res, next) {
	if (!req.user.email_confirmed) return res.status(403).json({ error: 'Confirm your email first. Then you can scan receipts and import orders.' })
	next()
}
