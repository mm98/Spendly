import path from 'node:path'
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
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
