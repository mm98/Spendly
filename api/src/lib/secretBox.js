import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { DB_PATH } from '../db.js'

/* The key is SPENDLY_SECRET_KEY when set, else a file beside the database made on first use.
   Changing or losing it makes every locked secret unreadable. */

export const SECRET_KEY_FILE = path.join(path.dirname(DB_PATH), 'secret.key')

let key = null

function loadKey() {
	if (key) return key
	const set = process.env.SPENDLY_SECRET_KEY?.trim()
	if (set) return (key = createHash('sha256').update(set).digest())
	try {
		key = Buffer.from(readFileSync(SECRET_KEY_FILE, 'utf8').trim(), 'base64')
	} catch (e) {
		if (e.code !== 'ENOENT') throw e
		key = randomBytes(32)
		// 'wx' fails if another process made the file first; then that one is read
		try {
			writeFileSync(SECRET_KEY_FILE, key.toString('base64') + '\n', { flag: 'wx', mode: 0o600 })
		} catch (raced) {
			if (raced.code !== 'EEXIST') throw raced
			key = Buffer.from(readFileSync(SECRET_KEY_FILE, 'utf8').trim(), 'base64')
		}
		chmodSync(SECRET_KEY_FILE, 0o600)
	}
	if (key.length !== 32) throw new Error(`${SECRET_KEY_FILE} does not hold a 32-byte key.`)
	return key
}

/** nonce (12) + tag (16) + the locked bytes */
export function lockSecret(plain) {
	const nonce = randomBytes(12)
	const cipher = createCipheriv('aes-256-gcm', loadKey(), nonce)
	const locked = Buffer.concat([cipher.update(plain), cipher.final()])
	return Buffer.concat([nonce, cipher.getAuthTag(), locked])
}

/** The secret, or null when the key it was locked with is not this server's key now. */
export function unlockSecret(stored) {
	const box = Buffer.from(stored)
	try {
		const decipher = createDecipheriv('aes-256-gcm', loadKey(), box.subarray(0, 12))
		decipher.setAuthTag(box.subarray(12, 28))
		return Buffer.concat([decipher.update(box.subarray(28)), decipher.final()])
	} catch {
		return null
	}
}
