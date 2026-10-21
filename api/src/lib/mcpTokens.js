import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db.js'
import { newId } from './ids.js'
import { nowEpoch } from './dates.js'
import { windowCounter } from './rateLimit.js'

// the prefix tells a token from a session id before any lookup, and lets a secret scanner find one
export const MCP_TOKEN_PREFIX = 'spendly_mcp_'
// last_used_at is a day-level fact for the reader, so a busy token does not write on every call
const TOUCH_AFTER_SECONDS = 60 * 60

/** Every read with a token counts, through /mcp or straight at a route: seconds to wait, or 0. */
export const mcpReadWait = windowCounter({ most: 60, perSeconds: 60 })

/* The routes the /mcp tools read through, and the only ones a token opens. Each answers from what is
   stored: a GET that writes, reads a file with Claude or fetches another site is never listed here. */
const MCP_READ_ROUTES = [
	/^\/api\/orders$/, /^\/api\/orders\/[\w-]+$/,
	/^\/api\/categories$/, /^\/api\/vendors$/,
	/^\/api\/budget$/, /^\/api\/budget\/\d{4}$/,
	/^\/api\/stats$/, /^\/api\/stats\/months$/,
	/^\/api\/search$/
]

const hashOf = token => createHash('sha256').update(String(token)).digest('hex')

const insertToken = db.prepare('INSERT INTO user_mcp_tokens (id, user_id, token_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
const selectMine = db.prepare('SELECT id, name, created_at, last_used_at FROM user_mcp_tokens WHERE user_id = ? ORDER BY created_at DESC, rowid DESC')
const deleteToken = db.prepare('DELETE FROM user_mcp_tokens WHERE id = ? AND user_id = ?')
const selectTokenUser = db.prepare(`SELECT t.id AS token_id, t.last_used_at, u.id, u.email, u.needs_setup, u.email_confirmed
	FROM user_mcp_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?`)
const touchToken = db.prepare('UPDATE user_mcp_tokens SET last_used_at = ? WHERE id = ?')

const shown = row => ({ id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at ?? null })

export const mcpMayRead = req => (req.method === 'GET' || req.method === 'HEAD')
	&& MCP_READ_ROUTES.some(route => route.test(req.originalUrl.split('?')[0]))

export const isMcpToken = token => typeof token === 'string' && token.startsWith(MCP_TOKEN_PREFIX)

/** A new token for the account. The answer is the only place the token itself ever appears. */
export function createMcpToken(userId, name) {
	const token = MCP_TOKEN_PREFIX + randomBytes(24).toString('base64url')
	const id = newId('mcp')
	const at = nowEpoch()
	insertToken.run(id, userId, hashOf(token), name, at)
	return { ...shown({ id, name, created_at: at }), token }
}

export const listMcpTokens = userId => selectMine.all(userId).map(shown)

export const removeMcpToken = (userId, id) => deleteToken.run(id, userId).changes > 0

/** The account a token reads, or null. Read-only: the caller decides which requests it may make. */
export function mcpTokenUser(token) {
	if (!isMcpToken(token)) return null
	const row = selectTokenUser.get(hashOf(token))
	if (!row) return null
	const now = nowEpoch()
	if (!row.last_used_at || now - row.last_used_at >= TOUCH_AFTER_SECONDS) touchToken.run(now, row.token_id)
	return { id: row.id, email: row.email, needs_setup: row.needs_setup, email_confirmed: row.email_confirmed }
}
