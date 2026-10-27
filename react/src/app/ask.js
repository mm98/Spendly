import { useSyncExternalStore } from 'react'
import { askQuestion, getAskFileStates, getChat } from '../api/client.js'

/* The chats opened in this visit (24a, 24f), so an answer still coming when the page is left lands in its chat.
   A turn is { id, question, answer, made, state, doing, askedAt, answeredAt, answerMs, answerTokens }; `made` holds
   what the answer made by maker and id (file, chart), `doing` says what is being made, the two times are epoch
   seconds or null, and `answerMs` and `answerTokens` are what the answer took on the server, or null.
   A chat the server has not named yet is the draft, shown at /ask. */

let owner = null
// by id: { id, status, turns, error }, status loading, ready, gone or failed
let chats = new Map()
let draft = []
let shownId = null
let lastId = null
let asking = null
let nextKey = -1
const listeners = new Set()

const EMPTY = { id: null, status: 'ready', turns: [] }
let view = EMPTY

function emit() {
	const chat = shownId ? chats.get(shownId) : null
	view = chat ? { id: shownId, status: chat.status, turns: chat.turns, error: chat.error } : { ...EMPTY, turns: draft }
	listeners.forEach(fn => fn())
}
const subscribe = fn => {
	listeners.add(fn)
	return () => listeners.delete(fn)
}

function reset() {
	asking?.controller.abort()
	asking = null
	chats = new Map()
	draft = []
	shownId = null
	lastId = null
	view = EMPTY
}

/** The chat on screen for `user`: { id, status, turns }. One another account left in this browser is ended, never shown. */
export function useChat(user) {
	const now = useSyncExternalStore(subscribe, () => view)
	if (owner !== user) {
		if (owner !== null) reset()
		owner = user
	}
	return now
}

// the turns of the chat `chatId`, or of the draft when it is null, changed by `change`
function edit(chatId, change) {
	if (!chatId) draft = change(draft)
	else {
		const chat = chats.get(chatId)
		if (!chat) return
		chats.set(chatId, { ...chat, turns: change(chat.turns) })
	}
	emit()
}
const patch = (chatId, id, values) => edit(chatId, turns => turns.map(t => (t.id === id ? { ...t, ...values } : t)))

/** Shows the chat `id`, as it is on the server, unless an answer in it is still coming. */
export function showChat(id) {
	shownId = id
	lastId = id
	const held = chats.get(id)
	if (!held) chats.set(id, { id, status: 'loading', turns: [] })
	emit()
	if (asking?.chatId === id) return
	getChat(id).then(
		chat => {
			if (asking?.chatId === id) return
			chats.set(id, { id, status: 'ready', turns: chat.turns })
			emit()
		},
		error => {
			if (asking?.chatId === id) return
			chats.set(id, error.status === 404 ? { id, status: 'gone', turns: [] } : { ...(held ?? { id, turns: [] }), status: held?.status === 'ready' ? 'ready' : 'failed', error })
			emit()
		}
	)
}

/** Shows the draft: the empty page, or a first question the server has not named a chat for yet. */
export function showDraft() {
	shownId = null
	emit()
}

/** Leaves the chat on screen for the empty page; the chat stays on Chats. */
export function newChat() {
	if (asking && !asking.chatId) return
	draft = []
	shownId = null
	lastId = null
	emit()
}

/** The chat open last in this visit, which /ask shows. */
export const lastChat = () => lastId

/** Forgets a chat deleted on Chats; when it is on screen, Ask shows the empty page. */
export function forgetChat(id) {
	if (asking?.chatId === id) asking.controller.abort()
	chats.delete(id)
	if (lastId === id) lastId = null
	if (shownId === id) {
		shownId = null
		draft = []
	}
	emit()
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

function send(body, key) {
	const controller = new AbortController()
	const run = { controller, chatId: body.chatId, key }
	asking = run
	askQuestion(body, controller.signal, step => {
		if (!step.chat) return patch(run.chatId, run.key, { doing: step })
		// the server names the chat and the turn: a draft becomes the chat it now is
		if (!run.chatId) {
			chats.set(step.chat, { id: step.chat, status: 'ready', turns: draft })
			draft = []
			run.chatId = step.chat
			if (shownId === null) {
				shownId = step.chat
				lastId = step.chat
			}
		}
		patch(run.chatId, run.key, { id: step.turn })
		run.key = step.turn
	}).then(
		out => patch(run.chatId, run.key, { state: 'answered', answer: out.answer, made: out.made ?? {}, doing: null, answeredAt: nowSeconds(),
			answerMs: out.answerMs ?? null, answerTokens: out.answerTokens ?? null }),
		error => {
			if (error.status === 404 && error.body?.gone) {
				chats.set(run.chatId, { id: run.chatId, status: 'gone', turns: [] })
				return emit()
			}
			// a stopped question keeps its place without an answer, and so does one the day's limit refused
			const state = controller.signal.aborted || error.status === 429 ? 'stopped' : 'failed'
			patch(run.chatId, run.key, { state, doing: null, answeredAt: state === 'failed' ? nowSeconds() : null })
		}
	).finally(() => {
		if (asking !== run) return
		asking = null
		emit()
	})
}

/** Asks `question` in the chat on screen, or starts a chat with it, unless an answer is still coming. */
export function ask(question) {
	if (asking || !question.trim()) return
	const key = nextKey--
	const turn = { id: key, question: question.trim(), state: 'working', askedAt: nowSeconds() }
	edit(shownId, turns => [...turns, turn])
	send({ chatId: shownId, question: turn.question }, key)
}

/** Asks `question` from Chats or Files (24c): in the chat open last in this visit, or in a new chat when
    none was. Answers the address that shows it. */
export function askInLastChat(question) {
	if (asking || !question.trim()) return null
	shownId = lastId
	if (!lastId) draft = []
	ask(question)
	return lastId ? `/ask/${lastId}` : '/ask'
}

/** Whether an answer is coming, in any chat. */
export const useAsking = () => useSyncExternalStore(subscribe, () => !!asking)

/** Asks a failed turn's question again, in its own place. */
export function askAgain(id) {
	if (asking || !shownId) return
	patch(shownId, id, { state: 'working', doing: null, answeredAt: null, answerMs: null, answerTokens: null })
	send({ chatId: shownId, retry: id }, id)
}

/** Ends the answer that is coming; its question stays. */
export const stopAsking = () => asking?.controller.abort()

/** Asks the server what each file in the chat on screen is now, so one deleted on Files, or past its
    days, reads as gone here too. */
export function refreshFiles() {
	const chatId = shownId
	const turns = view.turns
	const filesOf = t => t.made?.file ?? {}
	const ids = turns.flatMap(t => Object.keys(filesOf(t)))
	if (!ids.length) return
	getAskFileStates(ids).then(out => {
		const changed = turns.some(t => Object.keys(filesOf(t)).some(id => out.files[id] && out.files[id].state !== filesOf(t)[id].state))
		if (changed) edit(chatId, list => list.map(t => (t.made?.file ? { ...t, made: { ...t.made, file: Object.fromEntries(Object.entries(t.made.file).map(([id, f]) => [id, out.files[id] ? { ...f, ...out.files[id] } : f])) } } : t)))
	}, () => { /* the rows keep what they showed */ })
}

let emailed = null

/** Marks `turns` as sent by email; they read as sent until the chat changes. */
export const noteEmailed = turns => { emailed = turns }
export const wasEmailed = turns => turns.length > 0 && emailed === turns
