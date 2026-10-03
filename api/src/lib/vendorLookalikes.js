import { db } from '../db.js'
import { LIKENESS, letterPairs, likeness, vatNumberOf } from './names.js'

const selectVendors = db.prepare('SELECT id, name, origin, rowid AS made FROM vendors WHERE user_id = ? AND archived = 0')
const selectAliases = db.prepare('SELECT vendor_id AS id, name FROM vendor_aliases WHERE user_id = ?')
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE vendor_id = ? AND user_id = ?')

/** Look-alike vendors (5j) as `{ merge, keep }` id pairs: names LIKENESS alike, or one VAT number.
    `merge` is the likelier duplicate, in one pair at most; `orders` is counts the caller has. */
export function lookalikePairs(userId, orders = null) {
	const vendors = selectVendors.all(userId).map(v => ({ ...v, letters: letterPairs(v.name) }))
	const byId = new Map(vendors.map(v => [v.id, v]))
	const scores = new Map()
	const note = (a, b, score) => {
		const key = a.id < b.id ? `${a.id} ${b.id}` : `${b.id} ${a.id}`
		scores.set(key, Math.max(scores.get(key) ?? 0, score))
	}

	const byVat = new Map()
	for (const { id, name } of [...vendors, ...selectAliases.all(userId)]) {
		const vat = vatNumberOf(name)
		if (!vat || !byId.has(id)) continue
		if (!byVat.has(vat)) byVat.set(vat, new Set())
		byVat.get(vat).add(id)
	}
	for (const ids of byVat.values()) {
		const holders = [...ids].map(id => byId.get(id))
		for (let i = 0; i < holders.length; i++) for (let j = i + 1; j < holders.length; j++) note(holders[i], holders[j], 1)
	}

	// shortest names first: once the shorter cannot reach LIKENESS, a longer name cannot either
	const sorted = vendors.filter(v => v.letters.count > 0).sort((a, b) => a.letters.count - b.letters.count)
	for (let i = 0; i < sorted.length; i++) {
		const a = sorted[i]
		for (let j = i + 1; j < sorted.length; j++) {
			const b = sorted[j]
			if (2 * a.letters.count < LIKENESS * (a.letters.count + b.letters.count)) break
			const score = likeness(a.letters, b.letters)
			if (score >= LIKENESS) note(a, b, score)
		}
	}
	if (!scores.size) return []

	const counted = new Map()
	const ordersOf = id => {
		if (!counted.has(id)) counted.set(id, orders ? orders.get(id) ?? 0 : countOrders.get(id, userId).c)
		return counted.get(id)
	}
	// the likelier duplicate of the two goes first
	const duplicateFirst = (a, b) => (ordersOf(a.id) - ordersOf(b.id))
		|| ((b.origin === 'scan') - (a.origin === 'scan')) || (b.made - a.made)

	const best = new Map()
	for (const [key, score] of scores) {
		const [merge, keep] = key.split(' ').map(id => byId.get(id)).sort(duplicateFirst)
		if (!best.has(merge.id) || best.get(merge.id).score < score) best.set(merge.id, { merge: merge.id, keep: keep.id, score })
	}
	return [...best.values()].map(({ merge, keep }) => ({ merge, keep }))
}

/** How many vendors the pairs name, each once: the count Home shows and the vendor list filters to. */
export const vendorsIn = pairs => new Set(pairs.flatMap(p => [p.merge, p.keep])).size
