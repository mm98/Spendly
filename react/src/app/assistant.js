import { useSyncExternalStore } from 'react'
import { askAssistant } from '../api/client.js'

/* The palette's conversation (9d), kept for the visit: an answer still coming when the palette closes
   lands in it. A turn is { id, question, answer, state }: working, answered, failed or stopped. */

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

// what the server is sent: every answered turn before the one asked, then its question
function sentFor(turn) {
	const before = turns.slice(0, turns.indexOf(turn)).filter(t => t.state === 'answered')
	return [...before.flatMap(t => [{ role: 'user', text: t.question }, { role: 'assistant', text: t.answer }]), { role: 'user', text: turn.question }]
}

function send(turn) {
	const controller = new AbortController()
	asking = controller
	askAssistant(sentFor(turn), controller.signal).then(
		out => update(turn.id, { state: 'answered', answer: out.answer }),
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
	update(id, { state: 'working' })
	send(turns.find(t => t.id === id))
}

/** Ends the answer that is coming; its question stays. */
export const stopAsking = () => asking?.abort()

/** Ends the conversation. */
export function endConversation() {
	asking?.abort()
	set([])
}
