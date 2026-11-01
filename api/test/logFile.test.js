import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startLogFile } from '../src/lib/logFile.js'
import { log } from '../src/lib/log.js'

const scratch = () => mkdtempSync(path.join(tmpdir(), 'spendly-logs-'))

test('other output is written to the day file with a time, a level and an area', () => {
	const dir = scratch()
	const stop = startLogFile(dir, { now: () => new Date(2026, 9, 26, 12, 0, 0) })
	console.error('something failed\n    at a place')
	console.error('(node:1) Warning: something is old')
	stop()
	const text = readFileSync(path.join(dir, 'spendly-2026-10-26.log'), 'utf8')
	assert.match(text, /^\d{4}-\d{2}-\d{2}T\S+Z ERROR \[output\] something failed\n {8}at a place\n\S+ WARN  \[output\] \(node:1\) Warning: something is old\n$/)
})

test('a line from the logger is written to the day file as it is', () => {
	const dir = scratch()
	const stop = startLogFile(dir, { now: () => new Date(2026, 9, 26, 12, 0, 0) })
	log.error('mail', 'Could not send: no answer')
	log.fault('backup', 'Daily backup failed', new Error('disk full'))
	stop()
	const lines = readFileSync(path.join(dir, 'spendly-2026-10-26.log'), 'utf8').split('\n')
	assert.match(lines[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z ERROR \[mail\] Could not send: no answer$/)
	assert.match(lines[1], /^\S+Z ERROR \[backup\] Daily backup failed: disk full$/)
	assert.match(lines[2], /^ {4}at /)
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
