import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database of its own, set before anything opens the real one
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-two-step-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')
delete process.env.SPENDLY_SECRET_KEY

const { db } = await import('../src/db.js')
const { nowEpoch } = await import('../src/lib/dates.js')
const { SECRET_KEY_FILE, lockSecret, unlockSecret } = await import('../src/lib/secretBox.js')
const {
	base32, codeAt, stepAt, matchStep, startTwoStep, confirmTwoStep, checkCode, twoStepOn, twoStepState,
	turnOffTwoStep, renewRecoveryCodes, openTicket, readTicket, closeTicket
} = await import('../src/lib/twoStep.js')

const USER = 'u-two-step'
let secretOf

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, 'two-step@example.com')
	secretOf = () => unlockSecret(db.prepare('SELECT secret FROM user_two_step WHERE user_id = ?').get(USER).secret)
})

const fromBase32 = text => {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
	let bits = 0, value = 0
	const out = []
	for (const char of text) {
		value = (value << 5) | alphabet.indexOf(char)
		bits += 5
		if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
	}
	return Buffer.from(out)
}

test('codes match the RFC 6238 test values', () => {
	const secret = Buffer.from('12345678901234567890')
	// the RFC lists 8 digits; an app shows the last 6
	assert.equal(codeAt(secret, stepAt(59)), '287082')
	assert.equal(codeAt(secret, stepAt(1111111109)), '081804')
	assert.equal(codeAt(secret, stepAt(2000000000)), '279037')
	assert.equal(base32(Buffer.from('foobar')), 'MZXW6YTBOI')
})

test('a code from the next or last step counts, and never twice', () => {
	const secret = Buffer.from('12345678901234567890')
	const now = 1111111109
	const step = stepAt(now)
	assert.equal(matchStep(secret, codeAt(secret, step + 1), 0, now), step + 1)
	assert.equal(matchStep(secret, codeAt(secret, step - 1), 0, now), step - 1)
	assert.equal(matchStep(secret, codeAt(secret, step + 2), 0, now), null)
	assert.equal(matchStep(secret, codeAt(secret, step), step, now), null)
})

test('the key is stored locked, with a key file only its owner can read', () => {
	const locked = lockSecret(Buffer.from('secret'))
	assert.ok(!locked.includes(Buffer.from('secret')))
	assert.equal(unlockSecret(locked).toString(), 'secret')
	assert.equal(statSync(SECRET_KEY_FILE).mode & 0o777, 0o600)
	locked[locked.length - 1] ^= 1
	assert.equal(unlockSecret(locked), null)
})

test('turning on needs the first right code, and gives 10 recovery codes', () => {
	const { key, uri, qr } = startTwoStep(USER, 'two-step@example.com')
	assert.match(key, /^[A-Z2-7]{32}$/)
	assert.ok(qr.startsWith('<svg'))
	assert.equal(uri, 'otpauth://totp/Spendly%3Atwo-step%40example.com?secret=' + key + '&issuer=Spendly')
	assert.deepEqual(fromBase32(key), secretOf())
	assert.equal(twoStepOn(USER), false)
	assert.deepEqual(confirmTwoStep(USER, '000000').ok, undefined)
	const result = confirmTwoStep(USER, codeAt(secretOf(), stepAt()))
	assert.equal(result.ok, true)
	assert.equal(result.recoveryCodes.length, 10)
	assert.ok(result.recoveryCodes.every(code => /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(code)))
	assert.equal(twoStepOn(USER), true)
	assert.equal(twoStepState(USER).recoveryCodesLeft, 10)
	// the code that turned it on is used
	assert.equal(checkCode(USER, codeAt(secretOf(), stepAt())).ok, undefined)
})

test('a recovery code works once, typed any way', () => {
	db.prepare('DELETE FROM user_two_step_failures').run()
	const [first] = renewRecoveryCodes(USER)
	assert.equal(checkCode(USER, ` ${first.toLowerCase().replace('-', '')} `).kind, 'recovery')
	assert.equal(checkCode(USER, first).ok, undefined)
	assert.equal(twoStepState(USER).recoveryCodesLeft, 9)
})

test('five wrong codes stop the code step for five minutes', () => {
	db.prepare('DELETE FROM user_two_step_failures').run()
	for (let i = 0; i < 4; i++) assert.deepEqual(checkCode(USER, 'nope-nope'), {})
	const { wait } = checkCode(USER, 'nope-nope')
	assert.ok(wait > 290 && wait <= 300)
	// a right code waits too
	db.prepare('UPDATE user_two_step SET last_step = 0 WHERE user_id = ?').run(USER)
	assert.ok(checkCode(USER, codeAt(secretOf(), stepAt())).wait)
	db.prepare('UPDATE user_two_step_failures SET at = ?').run(nowEpoch() - 301)
	assert.equal(checkCode(USER, codeAt(secretOf(), stepAt())).ok, true)
})

test('a ticket opens the code step once', () => {
	const ticket = openTicket(USER, true)
	assert.equal(readTicket(ticket).userId, USER)
	closeTicket(ticket)
	assert.equal(readTicket(ticket), null)
	assert.equal(readTicket('made-up'), null)
})

test('turning off removes the key and the codes', () => {
	turnOffTwoStep(USER)
	assert.equal(twoStepOn(USER), false)
	assert.deepEqual(twoStepState(USER), { available: true, on: false, onSince: null, recoveryCodesLeft: 0 })
	assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_two_step_recovery_codes').get().n, 0)
})
