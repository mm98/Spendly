import path from 'node:path'
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { DB_PATH } from '../db.js'

/* Files kept on disk outside the database, so its backup leaves them out: one folder per account,
   each file under a random name. Removing an account's folder removes everything it kept. */

export const STORAGE_DIR = process.env.SPENDLY_STORAGE || path.join(path.dirname(DB_PATH), 'storage')
const SAFE = /^[\w-]{1,64}$/

function folderOf(userId, part) {
	if (!SAFE.test(userId) || !SAFE.test(part)) throw new Error('Not a storage folder name')
	return path.join(STORAGE_DIR, userId, part)
}

/** Writes `content` to the account's folder `part` under a new random name, and answers that name. */
export function storeFile(userId, part, content) {
	const folder = folderOf(userId, part)
	mkdirSync(folder, { recursive: true })
	const name = randomBytes(16).toString('hex')
	// written beside it first, so a file is never read half written
	writeFileSync(path.join(folder, `${name}.part`), content)
	renameSync(path.join(folder, `${name}.part`), path.join(folder, name))
	return name
}

/** The stored file's bytes, or null when it is not there. */
export function readStoredFile(userId, part, name) {
	if (!SAFE.test(name)) return null
	try {
		return readFileSync(path.join(folderOf(userId, part), name))
	} catch (error) {
		if (error.code === 'ENOENT') return null
		throw error
	}
}

export function removeStoredFile(userId, part, name) {
	if (SAFE.test(name)) rmSync(path.join(folderOf(userId, part), name), { force: true })
}

/** Removes the account's whole folder, every part in it. */
export function removeAccountFolder(userId) {
	if (!SAFE.test(userId)) throw new Error('Not a storage folder name')
	rmSync(path.join(STORAGE_DIR, userId), { recursive: true, force: true })
}

// a folder this new may be about to get its file (storeFile makes the folder first), so it is left
const SETTLED_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Removes every folder under the storage folder that holds no file, deepest first; the storage folder
    itself stays. Answers how many went. */
export function removeEmptyFolders(folder = STORAGE_DIR, now = Date.now()) {
	let removed = 0
	let entries
	try {
		entries = readdirSync(folder, { withFileTypes: true })
	} catch (error) {
		if (error.code === 'ENOENT') return 0
		throw error
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		const inner = path.join(folder, entry.name)
		// read before its own empty folders go, which makes it look new
		const settled = now - statSync(inner).mtimeMs >= SETTLED_MS
		removed += removeEmptyFolders(inner, now)
		try {
			if (!settled || readdirSync(inner).length) continue
			// fails, and is left, when a file arrived since it was read
			rmdirSync(inner)
			removed++
		} catch (error) {
			if (!['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes(error.code)) throw error
		}
	}
	return removed
}

/** Removes empty folders now, then once a day. */
export function scheduleStorageSweep() {
	const sweep = () => {
		try {
			const removed = removeEmptyFolders()
			if (removed) console.log(`[storage] removed ${removed} empty folder${removed === 1 ? '' : 's'}`)
		} catch (error) {
			console.error(`[storage] the daily clean-up stopped: ${error.message}`)
		}
	}
	sweep()
	setInterval(sweep, ONE_DAY_MS).unref()
}
