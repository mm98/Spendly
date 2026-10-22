import { db } from '../db.js'
import { newId } from './ids.js'
import { fromEpoch, nowEpoch, toEpoch } from './dates.js'
import { FILE_KEPT_DAYS, deleteFilesOfChat, restoreFilesOfChat } from './assistantFiles.js'

/* The chats on Ask (24a, 24f): every one kept for the account for 30 days after its last question,
   listed on Chats, opened again at /ask/:chatId, and deleted with the files its answers made. */

export const CHAT_KEPT_DAYS = FILE_KEPT_DAYS
// a deleted chat stays this long, for Undo on the toast
const UNDO_SECONDS = 60
const DAY = 86400
export const HEADING_MOST = 80

const insertChat = db.prepare(`INSERT INTO user_assistant_chats (id, user_id, first_question, asked_at, kept_until, expires_at)
	VALUES (?, ?, ?, ?, ?, ?)`)
const selectOpen = db.prepare('SELECT id, heading, first_question FROM user_assistant_chats WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND expires_at > ?')
const touchChat = db.prepare('UPDATE user_assistant_chats SET question_count = question_count + @count, asked_at = @now, kept_until = @keptUntil, expires_at = @expiresAt WHERE id = @id')
// a chart is kept as long as the chat that drew it
const touchCharts = db.prepare('UPDATE user_assistant_charts SET expires_at = ? WHERE chat_id = ?')
const insertTurn = db.prepare("INSERT INTO user_assistant_chat_turns (chat_id, question, state) VALUES (?, ?, 'working')")
const selectTurn = db.prepare('SELECT id, question, state FROM user_assistant_chat_turns WHERE id = ? AND chat_id = ?')
const restartTurn = db.prepare("UPDATE user_assistant_chat_turns SET state = 'working', answer = NULL WHERE id = ?")
const finishTurn = db.prepare('UPDATE user_assistant_chat_turns SET state = ?, answer = ? WHERE id = ?')
const selectTurns = db.prepare('SELECT id, question, answer, state FROM user_assistant_chat_turns WHERE chat_id = ? ORDER BY id')
const selectFirstTurn = db.prepare('SELECT MIN(id) id FROM user_assistant_chat_turns WHERE chat_id = ?')
const selectAnsweredBefore = db.prepare(`SELECT question, answer FROM user_assistant_chat_turns
	WHERE chat_id = ? AND id < ? AND state = 'answered' ORDER BY id DESC LIMIT ?`)
const writeHeading = db.prepare('UPDATE user_assistant_chats SET heading = ? WHERE id = ? AND heading IS NULL')
const markDeleted = db.prepare('UPDATE user_assistant_chats SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND expires_at > ?')
const selectDeleted = db.prepare('SELECT deleted_at FROM user_assistant_chats WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL')
const unmarkDeleted = db.prepare('UPDATE user_assistant_chats SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL')
const dropExpired = db.prepare('DELETE FROM user_assistant_chats WHERE expires_at <= ?')
const dropDeleted = db.prepare('DELETE FROM user_assistant_chats WHERE deleted_at IS NOT NULL AND deleted_at <= ?')

// a row on Chats: the files its answers made that are still kept, counted from the files' own chat index
const LIST_FIELDS = `c.id, c.heading, c.first_question, c.question_count, c.kept_until,
	(SELECT COUNT(*) FROM user_assistant_files f WHERE f.chat_id = c.id AND f.stored_name IS NOT NULL AND f.deleted_at IS NULL AND f.expires_at > @now) AS file_count`
const KEPT = 'c.user_id = @userId AND c.deleted_at IS NULL AND c.expires_at > @now'
// a match is in the heading, the first question, or any question or answer of the chat
const MATCHES = `(c.heading LIKE @like ESCAPE '\\' OR c.first_question LIKE @like ESCAPE '\\' OR EXISTS (SELECT 1 FROM user_assistant_chat_turns t
	WHERE t.chat_id = c.id AND (t.question LIKE @like ESCAPE '\\' OR t.answer LIKE @like ESCAPE '\\')))`
const countKept = db.prepare(`SELECT COUNT(*) n FROM user_assistant_chats c WHERE ${KEPT}`)
const countMatching = db.prepare(`SELECT COUNT(*) n FROM user_assistant_chats c WHERE ${KEPT} AND ${MATCHES}`)
const selectKept = db.prepare(`SELECT ${LIST_FIELDS} FROM user_assistant_chats c WHERE ${KEPT} ORDER BY c.asked_at DESC, c.rowid DESC LIMIT @limit OFFSET @offset`)
const selectMatching = db.prepare(`SELECT ${LIST_FIELDS} FROM user_assistant_chats c WHERE ${KEPT} AND ${MATCHES}
	ORDER BY c.asked_at DESC, c.rowid DESC LIMIT @limit OFFSET @offset`)

const keptFrom = (day, now) => ({ keptUntil: fromEpoch(toEpoch(day) + CHAT_KEPT_DAYS * DAY), expiresAt: now + CHAT_KEPT_DAYS * DAY })

function touch(id, day, now, count) {
	const kept = keptFrom(day, now)
	touchChat.run({ id, now, count, ...kept })
	touchCharts.run(kept.expiresAt, id)
}

const pairsOf = rows => rows.reverse().flatMap(r => [{ role: 'user', text: r.question }, { role: 'assistant', text: r.answer }])

/** Starts `question` in the chat `chatId`, or a new one, and restarts its 30 days. Answers { chatId, turnId, turns,
    first }, `turns` being at most `pairsMost` answered pairs before it, then it; null when the chat is gone. */
export const startTurn = db.transaction(({ userId, chatId, question, day, pairsMost }) => {
	const now = nowEpoch()
	let id = chatId
	if (!id) {
		id = newId('ch')
		const kept = keptFrom(day, now)
		insertChat.run(id, userId, question, now, kept.keptUntil, kept.expiresAt)
	} else if (!selectOpen.get(id, userId, now)) return null
	const turnId = insertTurn.run(id, question).lastInsertRowid
	touch(id, day, now, 1)
	const turns = [...pairsOf(selectAnsweredBefore.all(id, turnId, pairsMost)), { role: 'user', text: question }]
	return { chatId: id, turnId: Number(turnId), turns, first: !chatId }
})

/** Starts answering a failed question of the chat again, in its place. Null when there is none. */
export const restartFailedTurn = db.transaction(({ userId, chatId, turnId, day, pairsMost }) => {
	const now = nowEpoch()
	if (!selectOpen.get(chatId, userId, now)) return null
	const turn = selectTurn.get(turnId, chatId)
	if (turn?.state !== 'failed') return null
	restartTurn.run(turn.id)
	touch(chatId, day, now, 0)
	const turns = [...pairsOf(selectAnsweredBefore.all(chatId, turn.id, pairsMost)), { role: 'user', text: turn.question }]
	return { chatId, turnId: turn.id, turns, first: selectFirstTurn.get(chatId).id === turn.id }
})

/** Ends a question as answered with `answer`, failed, or stopped. */
export const endTurn = (turnId, state, answer = null) => { finishTurn.run(state, answer, turnId) }

/** Keeps the chat's heading, written once after its first answer; a heading already there stays. */
export function nameChat(chatId, heading) {
	const clean = String(heading ?? '').replace(/\s+/g, ' ').replace(/^["'“”]+|["'“”.]+$/g, '').trim().slice(0, HEADING_MOST)
	if (clean) writeHeading.run(clean, chatId)
}

/** The chat as Ask shows it again: its turns in order, each answered, failed or stopped. Null when it
    is deleted or past its days. A question still being answered reads as stopped, as there is nothing to wait for. */
export function chatOf(userId, chatId) {
	const chat = selectOpen.get(chatId, userId, nowEpoch())
	if (!chat) return null
	const turns = selectTurns.all(chatId).map(t => ({ id: t.id, question: t.question, answer: t.answer, state: t.state === 'working' ? 'stopped' : t.state }))
	return { id: chat.id, heading: chat.heading ?? chat.first_question, turns }
}

/** The answered questions and answers of the chat, as the email shows them. Null when it is deleted or past its days. */
export function answeredTurnsOf(userId, chatId) {
	const chat = chatOf(userId, chatId)
	if (!chat) return null
	return chat.turns.filter(t => t.state === 'answered').flatMap(t => [{ role: 'user', text: t.question }, { role: 'assistant', text: t.answer }])
}

const chatRow = r => ({ id: r.id, heading: r.heading ?? r.first_question, questions: r.question_count, files: r.file_count, keptUntil: r.kept_until })

/** The chats still kept, latest asked first, one page at a time; `q` keeps those whose heading or text holds it. */
export function keptChats(userId, { q = '', page = 1, pageSize = 25 } = {}) {
	const now = nowEpoch()
	const query = String(q).trim().slice(0, 200)
	const like = `%${query.replace(/[\\%_]/g, m => `\\${m}`)}%`
	const total = countKept.get({ userId, now }).n
	const matched = query ? countMatching.get({ userId, now, like }).n : total
	const size = Math.max(0, Math.min(100, Math.floor(pageSize)))
	const pages = Math.max(1, Math.ceil(matched / (size || 1)))
	const at = Math.min(Math.max(1, Math.floor(page) || 1), pages)
	const params = { userId, now, like, limit: size, offset: (at - 1) * size }
	const rows = size ? (query ? selectMatching : selectKept).all(params) : []
	return { chats: rows.map(chatRow), matched, total, pages, page: at, keptDays: CHAT_KEPT_DAYS }
}

/** Deletes the chat and the files its answers made, for Undo; answers how many files went, or null. */
export const deleteChat = db.transaction((userId, chatId) => {
	const now = nowEpoch()
	if (!markDeleted.run(now, chatId, userId, now).changes) return null
	return { files: deleteFilesOfChat(userId, chatId, now) }
})

/** Brings back a deleted chat and the files deleted with it, while Undo lasts. */
export const restoreChat = db.transaction((userId, chatId) => {
	const chat = selectDeleted.get(chatId, userId)
	if (!chat || !unmarkDeleted.run(chatId, userId).changes) return false
	restoreFilesOfChat(userId, chatId, chat.deleted_at)
	return true
})

/** Removes chats past their 30 days, and deleted chats once Undo is over, with their turns and charts. */
export function sweepChats(now = nowEpoch()) {
	dropExpired.run(now)
	dropDeleted.run(now - UNDO_SECONDS)
}
