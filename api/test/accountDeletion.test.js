import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

// a database of its own, set before anything opens the real one
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-account-deletion-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')
delete process.env.SPENDLY_SECRET_KEY

const { db } = await import('../src/db.js')
const { app } = await import('../src/app.js')
const { STORAGE_DIR, storeFile } = await import('../src/lib/storage.js')
const { codeAt, stepAt, startTwoStep, confirmTwoStep } = await import('../src/lib/twoStep.js')
const { unlockSecret } = await import('../src/lib/secretBox.js')
const { accountDeletionsDone } = await import('../src/lib/accountDeletion.js')

let server, base
before(async () => {
	server = app.listen(0)
	await new Promise(resolve => server.once('listening', resolve))
	base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

/** A signed-in account: `ask(path, init)` sends with its session. */
async function account(email, password = 'a-long-password-1') {
	const r = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
	assert.equal(r.status, 201, await r.clone().text())
	const { id, token } = await r.json()
	const ask = (where, { body, ...init } = {}) => fetch(base + where, {
		...init,
		headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
		body: body ? JSON.stringify(body) : undefined
	})
	return { id, email, password, token, ask }
}

async function fill(user, orders) {
	const r = await user.ask('/api/demo-data', { method: 'POST', body: { seed: 7, orders, months: 6 } })
	assert.equal(r.status, 200, await r.clone().text())
}

/** Every file in a ZIP archive, by name. */
function unzip(buffer) {
	const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
	const count = buffer.readUInt16LE(end + 10)
	let at = buffer.readUInt32LE(end + 16)
	const files = new Map()
	for (let i = 0; i < count; i++) {
		const size = buffer.readUInt32LE(at + 20)
		const nameLength = buffer.readUInt16LE(at + 28)
		const extraLength = buffer.readUInt16LE(at + 30)
		const local = buffer.readUInt32LE(at + 42)
		const name = buffer.toString('utf8', at + 46, at + 46 + nameLength)
		const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
		files.set(name, inflateRawSync(buffer.subarray(start, start + size)))
		at += 46 + nameLength + extraLength
	}
	return files
}

const tables = () => db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).pluck().all()
const hasUserId = name => db.prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = 'user_id'`).get(name)
const rowsOf = userId => Object.fromEntries(tables().filter(hasUserId)
	.map(name => [name, db.prepare(`SELECT COUNT(*) FROM "${name}" WHERE user_id = ?`).pluck().get(userId)]))

test('the copy holds every order and its files, and imports into another account', async () => {
	const owner = await account('copy-owner@example.com')
	await fill(owner, 120)
	// a photo on a line, so the copy has a file to carry
	const line = db.prepare('SELECT oi.order_id, oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.user_id = ? LIMIT 1').get(owner.id)
	const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#3a7' } }).png().toBuffer()
	const form = new FormData()
	form.append('files', new Blob([photo], { type: 'image/png' }), 'photo.png')
	const sent = await fetch(`${base}/api/orders/${line.order_id}/items/${line.id}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: form })
	assert.equal(sent.status, 201, await sent.clone().text())

	const r = await owner.ask('/api/export')
	assert.equal(r.status, 200)
	assert.match(r.headers.get('content-disposition'), /spendly-export-\d{4}-\d{2}-\d{2}\.zip/)
	const files = unzip(Buffer.from(await r.arrayBuffer()))
	const { orders } = JSON.parse(files.get('orders.json'))
	assert.equal(orders.length, db.prepare('SELECT COUNT(*) FROM orders WHERE user_id = ?').pluck().get(owner.id))
	const listed = orders.flatMap(o => [...(o.attachments ?? []), ...o.items.flatMap(i => i.attachments ?? [])])
	const stored = db.prepare(`SELECT COUNT(*) FROM order_attachments a LEFT JOIN order_items oi ON oi.id = a.order_item_id
		JOIN orders o ON o.id = COALESCE(a.order_id, oi.order_id) WHERE o.user_id = ?`).pluck().get(owner.id)
	assert.equal(listed.length, stored)
	assert.ok(stored > 0)
	for (const file of listed) assert.ok(files.has(file.file), `${file.file} is in the .zip`)
	assert.equal(files.size, listed.length + 1)

	const other = await account('copy-reader@example.com')
	const back = await other.ask('/api/orders/import', { method: 'POST', body: { orders } })
	const result = await back.json()
	assert.deepEqual(result.failed, [])
	assert.equal(result.imported, orders.length)
})

test('a wrong password deletes nothing; the right one deletes the account and only it', async () => {
	const gone = await account('deleted@example.com')
	const kept = await account('kept@example.com')
	await fill(gone, 200)
	await fill(kept, 50)
	storeFile(gone.id, 'ask-files', Buffer.from('a file Ask made'))
	const keptBefore = rowsOf(kept.id)

	let r = await gone.ask('/api/account', { method: 'DELETE', body: { password: 'not-the-password' } })
	assert.equal(r.status, 400)
	assert.equal((await r.json()).fields.password, "That password isn't right.")
	assert.ok(Object.values(rowsOf(gone.id)).some(n => n > 0))

	r = await gone.ask('/api/account', { method: 'DELETE', body: { password: gone.password } })
	assert.equal(r.status, 204)
	assert.match(r.headers.get('set-cookie') ?? '', /spendly_session=;/)
	// at once, before the rows are gone: no way in, and the address is free
	assert.equal((await gone.ask('/api/auth/me')).status, 401)
	const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: gone.email, password: gone.password }) })
	assert.equal(login.status, 401)
	await account('deleted@example.com')

	await accountDeletionsDone()

	assert.deepEqual(Object.entries(rowsOf(gone.id)).filter(([, n]) => n > 0), [])
	assert.equal(db.prepare('SELECT COUNT(*) FROM users WHERE id = ?').pluck().get(gone.id), 0)
	// nothing is left pointing at a row that went
	assert.deepEqual(db.pragma('foreign_key_check'), [])
	assert.equal(existsSync(path.join(STORAGE_DIR, gone.id)), false)
	assert.deepEqual(rowsOf(kept.id), keptBefore)
})

test('with two-step sign-in on, the password and a code are both asked for', async () => {
	const user = await account('two-step-delete@example.com')
	startTwoStep(user.id, user.email)
	const secret = unlockSecret(db.prepare('SELECT secret FROM user_two_step WHERE user_id = ?').pluck().get(user.id))
	const { recoveryCodes } = confirmTwoStep(user.id, codeAt(secret, stepAt()))
	const pair = 'That password and code do not match. Check both and try again.'

	let r = await user.ask('/api/account', { method: 'DELETE', body: { password: user.password } })
	assert.equal(r.status, 400)
	assert.equal((await r.json()).fields.code, pair)
	r = await user.ask('/api/account', { method: 'DELETE', body: { password: 'not-the-password', code: recoveryCodes[0] } })
	assert.equal((await r.json()).fields.code, pair)
	assert.equal(db.prepare('SELECT COUNT(*) FROM users WHERE id = ?').pluck().get(user.id), 1)

	r = await user.ask('/api/account', { method: 'DELETE', body: { password: user.password, code: recoveryCodes[1] } })
	assert.equal(r.status, 204)
	await accountDeletionsDone()
	assert.deepEqual(Object.entries(rowsOf(user.id)).filter(([, n]) => n > 0), [])
})

test('the daily clean-up removes empty folders, and keeps new ones and ones with a file', async () => {
	const { mkdirSync, utimesSync, writeFileSync } = await import('node:fs')
	const { removeEmptyFolders } = await import('../src/lib/storage.js')
	const root = mkdtempSync(path.join(tmpdir(), 'spendly-storage-'))
	const old = new Date(Date.now() - 2 * 60 * 60 * 1000)
	const make = (where, stamp = old) => { mkdirSync(path.join(root, where), { recursive: true }); utimesSync(path.join(root, where), stamp, stamp) }
	make('u-empty/ask-files'); make('u-empty')
	make('u-full/ask-files'); writeFileSync(path.join(root, 'u-full/ask-files/f'), 'x'); utimesSync(path.join(root, 'u-full/ask-files'), old, old)
	make('u-new/ask-files', new Date())
	assert.equal(removeEmptyFolders(root), 2)
	assert.equal(existsSync(path.join(root, 'u-empty')), false)
	assert.equal(existsSync(path.join(root, 'u-full/ask-files/f')), true)
	assert.equal(existsSync(path.join(root, 'u-new/ask-files')), true)
	assert.equal(existsSync(root), true)
})
