import { test, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database of its own, set before anything opens the real one; mail goes to the log
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-status-email-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')
process.env.SPENDLY_MAIL_LOG = '1'

const { db } = await import('../src/db.js')
const { sendDueStatusEmails, sendTestStatusEmail, stopStatusEmail } = await import('../src/lib/statusEmail.js')
const { issueToken } = await import('../src/lib/tokens.js')
const { seedAccountDefaults } = await import('../src/seed.js')

const USER = 'u-status-email'
const EMAIL = 'status-email@example.com'
const setSwitches = db.prepare(`UPDATE user_settings SET status_email_weekly = @weekly, status_email_monthly = @monthly,
	status_email_zone = 'UTC', status_email_weekly_sent = NULL, status_email_monthly_sent = NULL WHERE user_id = @userId`)
const switches = db.prepare('SELECT status_email_weekly weekly, status_email_monthly monthly FROM user_settings WHERE user_id = ?')

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, EMAIL)
	seedAccountDefaults(db, USER)
})

beforeEach(() => setSwitches.run({ userId: USER, weekly: 0, monthly: 0 }))

/** The subjects of the emails `run` sends, read from the mail log. */
async function subjectsOf(run) {
	const subjects = []
	const log = console.log
	console.log = line => {
		const found = String(line).match(new RegExp(`^\\[mail\\] to ${EMAIL}: (.*)`))
		if (found) subjects.push(found[1])
	}
	try {
		await run()
		await new Promise(resolve => setTimeout(resolve, 50))
	} finally {
		console.log = log
	}
	return subjects
}

const due = (when, on) => {
	setSwitches.run({ userId: USER, ...on })
	return subjectsOf(() => sendDueStatusEmails(new Date(when)))
}

test('Weekly alone sends on Monday, for the week just ended', async () => {
	const sent = await due('2025-12-08T09:00:00Z', { weekly: 1, monthly: 0 })
	assert.equal(sent.length, 1)
	assert.match(sent[0], /^Week 49/)
})

test('Monthly alone sends on the 1st, for the month just ended', async () => {
	const sent = await due('2026-01-01T09:00:00Z', { weekly: 0, monthly: 1 })
	assert.equal(sent.length, 1)
	assert.match(sent[0], /^December/)
})

test('with both on, a Monday that is not the 1st sends the weekly one only', async () => {
	const sent = await due('2025-12-08T09:00:00Z', { weekly: 1, monthly: 1 })
	assert.equal(sent.length, 1)
	assert.match(sent[0], /^Week 49/)
})

test('with both on, a 1st that is a Monday sends the monthly one only, and not the weekly one later', async () => {
	const sent = await due('2025-12-01T09:00:00Z', { weekly: 1, monthly: 1 })
	assert.equal(sent.length, 1)
	assert.match(sent[0], /^November/)
	assert.deepEqual(await subjectsOf(() => sendDueStatusEmails(new Date('2025-12-01T10:00:00Z'))), [])
})

test('an email is sent once for its period', async () => {
	await due('2025-12-08T09:00:00Z', { weekly: 1, monthly: 0 })
	assert.deepEqual(await subjectsOf(() => sendDueStatusEmails(new Date('2025-12-08T10:00:00Z'))), [])
})

test('the test email is the monthly one only when Monthly alone is on', async () => {
	for (const [on, frequency] of [[{ weekly: 0, monthly: 0 }, /^Test: Week/], [{ weekly: 1, monthly: 0 }, /^Test: Week/], [{ weekly: 1, monthly: 1 }, /^Test: Week/], [{ weekly: 0, monthly: 1 }, /^Test: (?!Week)/]]) {
		setSwitches.run({ userId: USER, ...on })
		const sent = await subjectsOf(() => sendTestStatusEmail(USER, { zone: 'UTC', locale: 'en-GB' }))
		assert.equal(sent.length, 1)
		assert.match(sent[0], frequency)
	}
})

test('Stop these emails turns both off, and a second stop link finds them off', async () => {
	setSwitches.run({ userId: USER, weekly: 1, monthly: 1 })
	assert.equal(stopStatusEmail(issueToken(USER, 'status-stop', EMAIL)).state, 'stopped')
	assert.deepEqual(switches.get(USER), { weekly: 0, monthly: 0 })
	assert.equal(stopStatusEmail(issueToken(USER, 'status-stop', EMAIL)).state, 'used')
})
