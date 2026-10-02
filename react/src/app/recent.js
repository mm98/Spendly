/* Jump back in (9d): the last five records opened, kept in this browser for each account. */

const RECENT = 5
const PREFIX = 'spendly:recent:'

export const readRecent = user => {
	try { return JSON.parse(localStorage.getItem(PREFIX + user)) ?? [] } catch { return [] }
}

const writeRecent = (user, list) => {
	try { localStorage.setItem(PREFIX + user, JSON.stringify(list)) } catch { /* storage denied */ }
}

/** Puts a record first, once. */
export function noteRecent(user, seen) {
	const rest = readRecent(user).filter(r => r.kind !== seen.kind || r.id !== seen.id)
	writeRecent(user, [seen, ...rest].slice(0, RECENT))
}

/** Drops a record that is gone ('order' or 'vendor', and its id) from every account's list kept
    in this browser, so the palette never asks for it. Every tab shares the list. */
export function forgetRecent(kind, id) {
	let users = []
	try { users = Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length)) } catch { return }
	for (const user of users) {
		const list = readRecent(user)
		const kept = list.filter(r => r.kind !== kind || r.id !== id)
		if (kept.length !== list.length) writeRecent(user, kept)
	}
}
