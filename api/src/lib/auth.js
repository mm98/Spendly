import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '../db.js'
import { newId } from './ids.js'
import { nowEpoch } from './dates.js'
import { readCookie, setCookie, clearCookie, SESSION_COOKIE } from './cookies.js'

const scryptAsync = promisify(scrypt)

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, KEY_LEN = 64
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60   // 30 days

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

const insertSession = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
const purgeExpiredSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?')
/* The purge rides on session creation because nothing else ever removed an expired row: the
   lookup below filters them out but leaves them, logout deletes only its own, and no account
   flow deletes users -- so the table only grew, and requireAuth probes it on every request.
   Swept here, it stays at roughly the live-session count; one sweep and the insert commit
   together so a login costs the one fsync it always did. */
const openSession = db.transaction((id, userId, expiresAt) => {
	purgeExpiredSessions.run(nowEpoch())
	insertSession.run(id, userId, expiresAt)
})

export function createSession(res, userId) {
	const id = newId('sess')
	const expiresAt = nowEpoch() + SESSION_TTL_SECONDS
	openSession(id, userId, expiresAt)
	setCookie(res, SESSION_COOKIE, id, { maxAgeSeconds: SESSION_TTL_SECONDS })
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

const deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?')

export function destroySession(req, res) {
	const token = sessionToken(req)
	if (token) deleteSession.run(token)
	clearCookie(res, SESSION_COOKIE)
}

const selectSessionUser = db.prepare(`
	SELECT u.id, u.email, u.needs_setup FROM sessions s
	JOIN users u ON u.id = s.user_id
	WHERE s.id = ? AND s.expires_at > ?
`)

/** Loads req.user from the session token — Authorization: Bearer or the session cookie — or
    responds 401. Every data route sits behind this: a route never trusts a userId from the
    request body or params, only from here. */
export function requireAuth(req, res, next) {
	const token = sessionToken(req)
	const user = token ? selectSessionUser.get(token, nowEpoch()) : null
	if (!user) return res.status(401).json({ error: 'Not signed in.' })
	req.user = user
	next()
}
