import { useSyncExternalStore } from 'react'
import { askAssistant, getAssistantFileStates } from '../api/client.js'

/* Ask's conversation (24a), kept for the visit: an answer still coming when the page is left
   lands in it. A turn is { id, question, answer, files, charts, state, doing }: working, answered,
   failed or stopped; `doing` is the file or chart being made while it works. */

let owner = null
let turns = []
let asking = null
let nextId = 1
const listeners = new Set()

const set = next => {
	turns = next
	listeners.forEach(fn => fn())
}
const subscribe = fn => {
	listeners.add(fn)
	return () => listeners.delete(fn)
}
const update = (id, patch) => set(turns.map(t => (t.id === id ? { ...t, ...patch } : t)))

/** The conversation of `user`; one another account left in this browser is ended, never shown. */
export function useConversation(user) {
	const now = useSyncExternalStore(subscribe, () => turns)
	if (owner !== user && turns.length) {
		asking?.abort()
		owner = user
		turns = []
	}
	return owner === user ? now : []
}

const pairsOf = list => list.filter(t => t.state === 'answered').flatMap(t => [{ role: 'user', text: t.question }, { role: 'assistant', text: t.answer }])

// what the server is sent: every answered turn before the one asked, then its question
const sentFor = turn => [...pairsOf(turns.slice(0, turns.indexOf(turn))), { role: 'user', text: turn.question }]

/** The answered questions and answers of `list`, as the conversation email takes them. */
export const answeredTurns = list => pairsOf(list)

function send(turn) {
	const controller = new AbortController()
	asking = controller
	askAssistant(sentFor(turn), controller.signal, step => update(turn.id, { doing: step })).then(
		out => update(turn.id, { state: 'answered', answer: out.answer, files: out.files ?? {}, charts: out.charts ?? {}, doing: null }),
		// a stopped question keeps its place without an answer, and so does one the day's limit refused
		error => update(turn.id, { state: controller.signal.aborted || error.status === 429 ? 'stopped' : 'failed' })
	).finally(() => { if (asking === controller) asking = null })
}

/** Asks `question` as the next turn, unless an answer is still coming. */
export function ask(user, question) {
	if (asking || !question.trim()) return
	if (owner !== user) turns = []
	owner = user
	const turn = { id: nextId++, question: question.trim(), state: 'working' }
	set([...turns, turn])
	send(turns.at(-1))
}

/** Asks a failed turn's question again, in its own place. */
export function askAgain(id) {
	if (asking) return
	update(id, { state: 'working', doing: null })
	send(turns.find(t => t.id === id))
}

/** Ends the answer that is coming; its question stays. */
export const stopAsking = () => asking?.abort()

/** Empties the conversation and answers what it held, for Undo; an answer coming is ended. */
export function clearConversation() {
	asking?.abort()
	const held = turns.map(t => (t.state === 'working' ? { ...t, state: 'stopped' } : t))
	set([])
	return held
}

/** Puts back what `clearConversation` answered, unless a question has been asked since. */
export function restoreConversation(held) {
	if (turns.length) return
	set(held)
}

/** Asks the server what each file in the conversation is now, so one deleted on Files, or past its
    days, reads as gone here too. */
export function refreshFiles() {
	const ids = turns.flatMap(t => Object.keys(t.files ?? {}))
	if (!ids.length) return
	getAssistantFileStates(ids).then(out => {
		const changed = turns.some(t => Object.keys(t.files ?? {}).some(id => out.files[id] && out.files[id].state !== t.files[id].state))
		if (changed) set(turns.map(t => (t.files ? { ...t, files: Object.fromEntries(Object.entries(t.files).map(([id, f]) => [id, out.files[id] ? { ...f, ...out.files[id] } : f])) } : t)))
	}, () => { /* the rows keep what they showed */ })
}

let emailed = null

/** Marks `list` as sent by email; it reads as sent until the conversation changes. */
export const noteEmailed = list => { emailed = list }
export const wasEmailed = list => list.length > 0 && emailed === list
