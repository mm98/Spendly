import { db } from '../db.js'
import { forgetModel } from './categoryModel.js'
import { forgetTrashOf } from './orderTrash.js'
import { removeAccountFolder } from './storage.js'
import { closeTicketsOf } from './twoStep.js'

/* First at once: the account is marked, its address freed and every way in ended. Then in the background,
   orders in batches so other requests run between, and the users row, which every per-account table cascades from. */

const ORDERS_PER_BATCH = 200

const selectAccount = db.prepare('SELECT u.email, s.locale, s.colour_scheme FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL')
// the address is replaced by one no person can type, so it is free for a new account at once and no sign-in finds it
const markDeleted = db.prepare(`UPDATE users SET deleted_at = unixepoch(), email = 'deleted:' || id WHERE id = ?`)
// sessions, passkeys, assistant tokens and email links; settings too, so no status email goes out meanwhile
const endWaysIn = ['user_sessions', 'user_passkeys', 'user_mcp_tokens', 'user_tokens', 'user_settings']
	.map(table => db.prepare(`DELETE FROM ${table} WHERE user_id = ?`))
// counted by address, so the address starts clean for a new account
const deleteLoginFailures = db.prepare('DELETE FROM user_login_failures WHERE email = ?')
const deleteOrderBatch = db.prepare(`DELETE FROM orders WHERE id IN (SELECT id FROM orders WHERE user_id = ? LIMIT ${ORDERS_PER_BATCH})`)
const deleteUser = db.prepare('DELETE FROM users WHERE id = ? AND deleted_at IS NOT NULL')
const selectDeleting = db.prepare('SELECT id FROM users WHERE deleted_at IS NOT NULL').pluck()

// the freed pages are written over, so the deleted rows cannot be read back from the database file
function securely(write) {
	db.pragma('secure_delete = ON')
	try {
		return db.transaction(write)()
	} finally {
		db.pragma('secure_delete = OFF')
	}
}

const pause = () => new Promise(resolve => setImmediate(resolve))

async function removeRows(userId) {
	while (securely(() => deleteOrderBatch.run(userId).changes)) await pause()
	securely(() => deleteUser.run(userId))
	removeAccountFolder(userId)
	forgetTrashOf(userId)
	forgetModel(userId)
}

// one removal at a time, in the order they were asked for
let removals = Promise.resolve()
const queueRemoval = userId => {
	removals = removals.then(() => removeRows(userId))
		.catch(e => console.error(`[account] deleting ${userId} stopped, and finishes when the server starts again: ${e.message}`))
	return removals
}

/** Deletes the account and everything it owns: at once for the person, its rows in the background.
    Answers { email, locale, colour_scheme }, read before it went, for the last email; null when there is no such account. */
export function deleteAccount(userId) {
	const account = selectAccount.get(userId)
	if (!account) return null
	securely(() => {
		markDeleted.run(userId)
		for (const statement of endWaysIn) statement.run(userId)
		deleteLoginFailures.run(account.email)
	})
	closeTicketsOf(userId)
	queueRemoval(userId)
	return account
}

/** Finishes every delete a stopped server left partway. */
export function finishAccountDeletions() {
	for (const userId of selectDeleting.all()) queueRemoval(userId)
	return removals
}

/** Resolves once every delete asked for so far has finished. */
export const accountDeletionsDone = () => removals
