import { db } from '../db.js'

const selectKeys = db.prepare('SELECT key, name FROM statuses WHERE user_id = ?')

/** The account's status keys. */
export const statusKeys = userId => selectKeys.all(userId).map(s => s.key)

/** A status as a caller wrote it -- its key, or its name in any case -- as the key the order row
    stores; null when the account has no such status. */
export function resolveStatus(userId, value) {
	const text = String(value ?? '').trim()
	if (!text) return null
	const all = selectKeys.all(userId)
	return (all.find(s => s.key === text) ?? all.find(s => s.key.toLowerCase() === text.toLowerCase() || s.name.toLowerCase() === text.toLowerCase()))?.key ?? null
}
