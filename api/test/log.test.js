import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLogLine, logLine, reasonOf } from '../src/lib/log.js'

const at = new Date(Date.UTC(2026, 10, 1, 5, 54, 7, 123))

test('a line is the time, the level, the area and the message', () => {
	assert.equal(logLine('ERROR', 'mail', 'Could not send: no answer', at), '2026-11-01T05:54:07.123Z ERROR [mail] Could not send: no answer')
	assert.equal(logLine('INFO', 'server', 'Started', at), '2026-11-01T05:54:07.123Z INFO  [server] Started')
})

test('a line break in the message cannot start a line of its own', () => {
	assert.equal(logLine('WARN', 'browser', 'one\n2026-01-01T00:00:00.000Z ERROR [fake] two', at), '2026-11-01T05:54:07.123Z WARN  [browser] one 2026-01-01T00:00:00.000Z ERROR [fake] two')
})

test('a logger line is told from other output', () => {
	assert.ok(isLogLine(logLine('DEBUG', 'request', 'GET /api/orders 200', at)))
	assert.ok(!isLogLine('(node:1) Warning: something'))
})

test('the reason of an error carries its cause', () => {
	assert.equal(reasonOf(new Error('fetch failed', { cause: new Error('ECONNREFUSED') })), 'fetch failed (ECONNREFUSED)')
	assert.equal(reasonOf('plain'), 'plain')
})
