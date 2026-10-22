import { db } from '../db.js'
import { newId } from './ids.js'
import { fromEpoch, nowEpoch, toEpoch } from './dates.js'
import { fileSizeLabel } from './copy.js'
import { DOCUMENT_TYPES } from './documentFiles.js'
import { usableLocale, writerFor } from './statusEmail.js'
import { readStoredFile, removeStoredFile, storeFile } from './storage.js'

/* The files Ask Spendly makes from the reader's own data (Ask 24d, 24e): kept 30 days for the signed-in
   owner only, listed on Files, and a limited number a day. The bytes are on disk (lib/storage.js), not in the database. */

const FOLDER = 'ask-files'

export const FILE_TYPES = Object.keys(DOCUMENT_TYPES)
export const FILE_KEPT_DAYS = 30
// SPENDLY_ASSISTANT_FILES_PER_DAY, set in docker-compose.yml; 0 lets no account make files
const PER_DAY = Math.max(0, Math.floor(Number(process.env.SPENDLY_ASSISTANT_FILES_PER_DAY ?? 10)) || 0)
// the most orders one file holds, and the most rows of any other table in it
export const FILE_ROWS_MOST = 5000
// a deleted file's bytes stay this long, for Undo on the toast
const UNDO_SECONDS = 60
const DAY = 86400

// why a file could not be made, after "Could not be made: "
export const FILE_REFUSALS = {
	tooMany: 'too many orders for one file. Ask for one year at a time.',
	usedUp: 'today\'s files are used up. Ask again tomorrow.',
	failed: 'something went wrong while it was made. Ask again.'
}

const KINDS = { xlsx: 'Excel', docx: 'Word', pdf: 'PDF', csv: 'CSV' }

const insertFile = db.prepare(`INSERT INTO user_assistant_files (id, user_id, chat_id, title, download_name, type, asked_at, size, stored_name, failed_reason, kept_until, expires_at)
	VALUES (@id, @userId, @chatId, @title, @downloadName, @type, @askedAt, @size, @storedName, @failedReason, @keptUntil, @expiresAt)`)
const selectMade = db.prepare('SELECT made_files_count FROM user_assistant_days WHERE user_id = ? AND day = ?')
const countMade = db.prepare(`INSERT INTO user_assistant_days (user_id, day, made_files_count) VALUES (?, ?, 1)
	ON CONFLICT (user_id, day) DO UPDATE SET made_files_count = made_files_count + 1`)
const selectAccount = db.prepare('SELECT s.locale, s.currency FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?')
// the + keeps SQLite on the id key: each id is one row, where the account's index walks every file it has
const selectStates = db.prepare(`SELECT f.id, f.chat_id, f.title, f.type, f.size, f.failed_reason, f.kept_until, f.expires_at, f.deleted_at
	FROM json_each(?) j CROSS JOIN user_assistant_files f ON f.id = j.value WHERE +f.user_id = ?`)
const selectKept = db.prepare(`SELECT id, chat_id, title, type, size, kept_until, expires_at, deleted_at, NULL AS failed_reason FROM user_assistant_files
	WHERE user_id = @userId AND stored_name IS NOT NULL AND deleted_at IS NULL AND expires_at > @now ORDER BY created_at DESC, rowid DESC LIMIT @limit OFFSET @offset`)
const countKept = db.prepare('SELECT COUNT(*) c FROM user_assistant_files WHERE user_id = ? AND stored_name IS NOT NULL AND deleted_at IS NULL AND expires_at > ?')
const selectDownload = db.prepare(`SELECT title, download_name, type, asked_at, stored_name FROM user_assistant_files
	WHERE id = ? AND user_id = ? AND stored_name IS NOT NULL AND deleted_at IS NULL AND expires_at > ?`)
// the files of a chat go and come back with it, all at the moment the chat was deleted
const markChatDeleted = db.prepare('UPDATE user_assistant_files SET deleted_at = ? WHERE chat_id = ? AND user_id = ? AND deleted_at IS NULL AND stored_name IS NOT NULL')
const unmarkChatDeleted = db.prepare('UPDATE user_assistant_files SET deleted_at = NULL WHERE chat_id = ? AND user_id = ? AND deleted_at = ? AND stored_name IS NOT NULL')
const markDeleted = db.prepare('UPDATE user_assistant_files SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND stored_name IS NOT NULL')
const unmarkDeleted = db.prepare('UPDATE user_assistant_files SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL AND stored_name IS NOT NULL')
const selectExpired = db.prepare('SELECT id, user_id, stored_name FROM user_assistant_files WHERE expires_at <= ?')
const dropFile = db.prepare('DELETE FROM user_assistant_files WHERE id = ?')
const selectDeletedStored = db.prepare('SELECT id, user_id, stored_name FROM user_assistant_files WHERE deleted_at IS NOT NULL AND deleted_at <= ? AND stored_name IS NOT NULL')
const forgetStored = db.prepare('UPDATE user_assistant_files SET stored_name = NULL WHERE id = ?')

/** The account's own way of writing an amount and a date, for a file's cells. */
export function fileWriter(userId, browserLocale) {
	const account = selectAccount.get(userId) ?? {}
	return writerFor({ locale: usableLocale(account.locale, browserLocale), currency: account.currency ?? 'DKK' })
}

/** The moment `at` as the reader's clock reads it in `zone`, a space before the time, its colons dots: 2026-10-22 14.05.33. */
export function askedAtIn(zone, at = new Date()) {
	let parts
	try {
		parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(at)
	} catch {
		parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(at)
	}
	const p = Object.fromEntries(parts.map(x => [x.type, x.value]))
	return `${p.year}-${p.month}-${p.day} ${p.hour}.${p.minute}.${p.second}`
}

/** What the reader's row shows about one file (ChatFile in react/src/components/Chat.jsx). */
export function fileMeta(row, now = nowEpoch()) {
	const base = { id: row.id, title: row.title, type: row.type, kind: KINDS[row.type], chatId: row.chat_id ?? null }
	if (row.failed_reason) return { ...base, state: 'failed', reason: row.failed_reason }
	if (row.deleted_at) return { ...base, state: 'gone', gone: 'deleted' }
	if (row.expires_at <= now) return { ...base, state: 'gone', gone: 'expired' }
	return { ...base, state: 'ready', size: fileSizeLabel(row.size), keptUntil: row.kept_until, href: `/api/assistant/files/${row.id}/download` }
}

/** The files named by `ids`, by id; a file the sweep removed reads as expired. */
export function fileStates(userId, ids) {
	const now = nowEpoch()
	const found = new Map(selectStates.all(JSON.stringify(ids), userId).map(r => [r.id, fileMeta(r, now)]))
	return Object.fromEntries(ids.map(id => [id, found.get(id) ?? { id, state: 'gone', gone: 'expired' }]))
}

/** The files still kept, newest first, one page at a time. */
export function keptFiles(userId, { page = 1, pageSize = 25 } = {}) {
	const now = nowEpoch()
	const matched = countKept.get(userId, now).c
	const size = Math.max(0, Math.min(100, Math.floor(pageSize)))
	const pages = Math.max(1, Math.ceil(matched / (size || 1)))
	const at = Math.min(Math.max(1, Math.floor(page) || 1), pages)
	const files = size ? selectKept.all({ userId, now, limit: size, offset: (at - 1) * size }).map(r => fileMeta(r, now)) : []
	return { files, matched, pages, page: at, keptDays: FILE_KEPT_DAYS }
}

/** A kept file's bytes and the name it downloads as: its heading, then when it was asked. */
export function fileDownload(userId, id) {
	const row = selectDownload.get(id, userId, nowEpoch())
	const content = row && readStoredFile(userId, FOLDER, row.stored_name)
	if (!content) return null
	// a name every system can save: no path or reserved characters, and short enough for any disk
	const title = (row.download_name || row.title).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150).trim() || 'Spendly'
	// a file made before has a T before the time: 2026-10-22T14-05 or 2026-10-22T14.05.33
	const askedAt = row.asked_at.replace(/T(\d\d)[-.](\d\d)/, ' $1.$2')
	return { name: `${title} (${askedAt}).${row.type}`, mime: DOCUMENT_TYPES[row.type].mime, content }
}

export const deleteFile = (userId, id) => markDeleted.run(nowEpoch(), id, userId).changes > 0
export const restoreFile = (userId, id) => unmarkDeleted.run(id, userId).changes > 0

/** Deletes the kept files of a chat at `at`, the moment the chat was deleted; answers how many went. */
export const deleteFilesOfChat = (userId, chatId, at) => markChatDeleted.run(at, chatId, userId).changes
export const restoreFilesOfChat = (userId, chatId, at) => { unmarkChatDeleted.run(chatId, userId, at) }

/** Whether the reader may make another file on `day`; the server's owner has no limit. */
export const fileAllowed = (userId, day, unlimited) => unlimited || (selectMade.get(userId, day)?.made_files_count ?? 0) < PER_DAY

/** Makes one file of `doc` (lib/documentFiles.js) for the question `title`, or keeps why it could not
    be made. Answers the reader's row for it either way. */
export function makeFile({ userId, chatId = null, day, unlimited, title, askedAt, type, doc, write, refusal }) {
	const now = nowEpoch()
	const row = { id: newId('af'), userId, chatId, title, downloadName: doc?.title || null, type, askedAt, size: 0, storedName: null, failedReason: refusal ?? null,
		keptUntil: fromEpoch(toEpoch(day) + FILE_KEPT_DAYS * DAY), expiresAt: now + FILE_KEPT_DAYS * DAY }
	if (!row.failedReason && !fileAllowed(userId, day, unlimited)) row.failedReason = FILE_REFUSALS.usedUp
	if (!row.failedReason) {
		try {
			const content = DOCUMENT_TYPES[type].build(doc, write)
			row.size = content.length
			row.storedName = storeFile(userId, FOLDER, content)
		} catch (error) {
			console.error('Assistant file failed:', error.message)
			row.failedReason = FILE_REFUSALS.failed
		}
	}
	try {
		db.transaction(() => {
			insertFile.run(row)
			if (row.storedName) countMade.run(userId, day)
		})()
	} catch (error) {
		if (row.storedName) removeStoredFile(userId, FOLDER, row.storedName)
		throw error
	}
	return fileMeta({ id: row.id, chat_id: chatId, title, type, size: row.size, failed_reason: row.failedReason, kept_until: row.keptUntil, expires_at: row.expiresAt, deleted_at: null }, now)
}

/** Removes files past their 30 days, and the bytes of deleted files once Undo is over. */
export function sweepFiles(now = nowEpoch()) {
	for (const f of selectExpired.all(now)) {
		if (f.stored_name) removeStoredFile(f.user_id, FOLDER, f.stored_name)
		dropFile.run(f.id)
	}
	for (const f of selectDeletedStored.all(now - UNDO_SECONDS)) {
		removeStoredFile(f.user_id, FOLDER, f.stored_name)
		forgetStored.run(f.id)
	}
}
