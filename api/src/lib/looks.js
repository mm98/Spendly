import { db } from '../db.js'

/* Home's Needs a look rules, in rank order; each also has an entry in react/src/pages/needsLook.jsx.
   `on` is what a rule stands at until someone sets it. */
export const LOOKS = [
	{ id: 'over', on: true },
	{ id: 'near', on: true },
	{ id: 'late', on: true },
	{ id: 'vendors', on: true },
	{ id: 'receipt', on: false }
]

const selectSwitches = db.prepare('SELECT rule, enabled FROM home_attention_rules WHERE user_id = ?')
const upsertSwitch = db.prepare(`
	INSERT INTO home_attention_rules (user_id, rule, enabled) VALUES (?, ?, ?)
	ON CONFLICT (user_id, rule) DO UPDATE SET enabled = excluded.enabled
`)

/** Every rule, switched on or off: what the account set, else the rule's own default. */
export function looksOf(userId) {
	const set = new Map(selectSwitches.all(userId).map(r => [r.rule, Boolean(r.enabled)]))
	return Object.fromEntries(LOOKS.map(l => [l.id, set.get(l.id) ?? l.on]))
}

/** Stores the switches asked for. A rule that does not exist, or a value that is not true or false, is left out. */
export function setLooks(userId, asked) {
	if (!asked || typeof asked !== 'object') return
	for (const l of LOOKS) if (typeof asked[l.id] === 'boolean') upsertSwitch.run(userId, l.id, asked[l.id] ? 1 : 0)
}
