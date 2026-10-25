import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database and a storage folder of its own, set before anything opens the real ones
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-ask-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')
process.env.SPENDLY_STORAGE = path.join(scratch, 'storage')

const { db } = await import('../src/db.js')
const { STORAGE_DIR, storeFile } = await import('../src/lib/storage.js')
const { deleteFile, restoreFile, fileStates, sweepFiles } = await import('../src/lib/askFiles.js')
const { deleteChat, restoreChat, sweepChats } = await import('../src/lib/askChats.js')
const { nowEpoch } = await import('../src/lib/dates.js')

const USER = 'u-ask-deletes'
const UNDO_OVER = 61
let counter = 0

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, 'ask-deletes@example.com')
})

function addChat() {
	const id = `ch-test-${++counter}`
	const now = nowEpoch()
	db.prepare("INSERT INTO user_ask_chats (id, user_id, first_question, asked_at, kept_until, expires_at) VALUES (?, ?, 'Q', ?, '2099-01-01', ?)")
		.run(id, USER, now, now + 30 * 86400)
	db.prepare("INSERT INTO user_ask_chat_turns (chat_id, question, answer, state) VALUES (?, 'Q', 'A', 'answered')").run(id)
	db.prepare("INSERT INTO user_ask_charts (id, user_id, chat_id, chart, expires_at) VALUES (?, ?, ?, '{}', ?)").run(`ac-test-${counter}`, USER, id, now + 30 * 86400)
	return id
}

// a made file has bytes on disk; a failed one has only its row
function addFile(chatId, { failed = false } = {}) {
	const id = `af-test-${++counter}`
	const stored = failed ? null : storeFile(USER, 'ask-files', Buffer.from('a,b\n1,2\n'))
	db.prepare(`INSERT INTO user_ask_files (id, user_id, chat_id, title, type, asked_at, size, stored_name, failed_reason, kept_until, expires_at)
		VALUES (?, ?, ?, 'Orders', 'csv', '2026-10-25 08.00.00', 8, ?, ?, '2099-01-01', ?)`)
		.run(id, USER, chatId, stored, failed ? 'failed' : null, nowEpoch() + 30 * 86400)
	return { id, stored }
}

const fileRow = id => db.prepare('SELECT * FROM user_ask_files WHERE id = ?').get(id)
const bytesThere = stored => existsSync(path.join(STORAGE_DIR, USER, 'ask-files', stored))
const sweepAll = now => { sweepChats(now); sweepFiles(now) }

test('a deleted chat takes all its files with it once Undo is over: rows and bytes', () => {
	const chat = addChat()
	const made = addFile(chat)
	const failed = addFile(chat, { failed: true })
	assert.deepEqual(deleteChat(USER, chat), { files: 1 })
	sweepAll(nowEpoch() + UNDO_OVER)
	assert.equal(db.prepare('SELECT COUNT(*) n FROM user_ask_chats WHERE id = ?').get(chat).n, 0)
	assert.equal(db.prepare('SELECT COUNT(*) n FROM user_ask_chat_turns WHERE chat_id = ?').get(chat).n, 0)
	assert.equal(db.prepare('SELECT COUNT(*) n FROM user_ask_charts WHERE chat_id = ?').get(chat).n, 0)
	assert.equal(fileRow(made.id), undefined)
	assert.equal(fileRow(failed.id), undefined)
	assert.equal(bytesThere(made.stored), false)
})

test('a deleted chat brought back during Undo keeps its files', () => {
	const chat = addChat()
	const made = addFile(chat)
	deleteChat(USER, chat)
	sweepAll(nowEpoch())
	assert.equal(restoreChat(USER, chat), true)
	sweepAll(nowEpoch() + UNDO_OVER)
	assert.equal(fileRow(made.id).deleted_at, null)
	assert.equal(readFileSync(path.join(STORAGE_DIR, USER, 'ask-files', made.stored), 'utf8'), 'a,b\n1,2\n')
})

test('a chat past its days takes its files with it', () => {
	const chat = addChat()
	const made = addFile(chat)
	sweepAll(nowEpoch() + 31 * 86400)
	assert.equal(fileRow(made.id), undefined)
	assert.equal(bytesThere(made.stored), false)
})

test('one file deleted in a kept chat loses its bytes, and its chat still shows it as deleted', () => {
	const chat = addChat()
	const made = addFile(chat)
	assert.equal(deleteFile(USER, made.id), true)
	sweepAll(nowEpoch() + UNDO_OVER)
	assert.equal(bytesThere(made.stored), false)
	assert.equal(fileRow(made.id).stored_name, null)
	assert.equal(fileStates(USER, [made.id])[made.id].gone, 'deleted')
	assert.equal(restoreFile(USER, made.id), false)
})

test('one file deleted with no chat goes completely once Undo is over', () => {
	const made = addFile(null)
	deleteFile(USER, made.id)
	sweepAll(nowEpoch() + UNDO_OVER)
	assert.equal(fileRow(made.id), undefined)
	assert.equal(bytesThere(made.stored), false)
})

test('one file deleted, then its chat deleted: both go', () => {
	const chat = addChat()
	const made = addFile(chat)
	deleteFile(USER, made.id)
	sweepAll(nowEpoch() + UNDO_OVER)
	deleteChat(USER, chat)
	sweepAll(nowEpoch() + 2 * UNDO_OVER)
	assert.equal(fileRow(made.id), undefined)
})

test('the one-time cleanup removes only rows that hold no bytes and belong to no chat', () => {
	const chat = addChat()
	const inChat = addFile(chat, { failed: true })
	const kept = addFile(null)
	const leftover = addFile(null, { failed: true })
	const sql = readFileSync(new URL('../src/migrations/275_user_ask_files_shown_nowhere.sql', import.meta.url), 'utf8')
	db.exec(sql)
	assert.equal(fileRow(leftover.id), undefined)
	assert.ok(fileRow(inChat.id))
	assert.ok(fileRow(kept.id))
	assert.equal(bytesThere(kept.stored), true)
})
