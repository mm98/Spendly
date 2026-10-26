import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startLogFile } from '../src/lib/logFile.js'

const scratch = () => mkdtempSync(path.join(tmpdir(), 'spendly-logs-'))

test('what the app prints is also written to the day file, with its time', () => {
	const dir = scratch()
	const stop = startLogFile(dir, { now: () => new Date(2026, 9, 26, 12, 0, 0) })
	console.error('Ask answer failed: something')
	stop()
	const text = readFileSync(path.join(dir, 'spendly-2026-10-26.log'), 'utf8')
	assert.match(text, /^\d{4}-\d{2}-\d{2}T\S+ Ask answer failed: something\n$/)
})

test('a new day starts a new file, and only the newest days are kept', () => {
	const dir = scratch()
	for (const day of ['2026-10-20', '2026-10-21', '2026-10-22']) writeFileSync(path.join(dir, `spendly-${day}.log`), 'old\n')
	writeFileSync(path.join(dir, 'notes.txt'), 'not a log\n')
	let at = new Date(2026, 9, 25, 23, 59, 0)
	const stop = startLogFile(dir, { now: () => at, keepDays: 2 })
	console.log('before midnight')
	at = new Date(2026, 9, 26, 0, 1, 0)
	console.log('after midnight')
	stop()
	assert.deepEqual(readdirSync(dir).sort(), ['notes.txt', 'spendly-2026-10-25.log', 'spendly-2026-10-26.log'])
	assert.match(readFileSync(path.join(dir, 'spendly-2026-10-26.log'), 'utf8'), /after midnight/)
})

test('a full day stops writing and says so once', () => {
	const dir = scratch()
	const stop = startLogFile(dir, { now: () => new Date(2026, 9, 26), maxBytesPerDay: 100 })
	for (let i = 0; i < 10; i++) console.log('a line that fills the file')
	stop()
	const text = readFileSync(path.join(dir, 'spendly-2026-10-26.log'), 'utf8')
	assert.equal(text.match(/The log for today is full/g).length, 1)
	assert.ok(Buffer.byteLength(text) < 200)
})

test('a folder that cannot be used leaves the app running with its output only', () => {
	const file = path.join(scratch(), 'a-file')
	writeFileSync(file, '')
	const stop = startLogFile(path.join(file, 'logs'))
	console.log('still printed')
	stop()
})
