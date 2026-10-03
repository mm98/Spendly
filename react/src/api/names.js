/* How two spellings of one vendor name are found to be the same: the rule the API matches
   receipts by (api/src/lib/names.js), so a page warns about exactly what a save would refuse. */

const LETTERS = { ø: 'o', æ: 'ae', ß: 'ss', œ: 'oe', ł: 'l', đ: 'd' }
const LEGAL = new Set(['as', 'aps', 'ivs', 'is', 'ks', 'ps', 'amba', 'smba', 'ltd', 'gmbh', 'ab', 'inc', 'llc', 'plc', 'oy', 'bv', 'nv', 'sa', 'srl', 'spa', 'co'])

const fold = name => String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '')
	.toLowerCase().replace(/[øæßœłđ]/g, c => LETTERS[c]).replace(/\s+/g, ' ').trim()

/** A name with case, accents, punctuation and a closing legal form ("A/S", "ApS") set aside. */
export function vendorKey(name) {
	const words = fold(name).replace(/\b([a-z])\/([a-z])\b/g, '$1$2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
	while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop()
	return words.join(' ')
}

/** How alike two names are, 0 to 1: the share of letter pairs they have in common (5b's 0.85). */
export function likeness(a, b) {
	const pairs = s => {
		const t = vendorKey(s).replace(/ /g, '')
		const out = new Map()
		for (let i = 0; i < t.length - 1; i++) out.set(t.slice(i, i + 2), (out.get(t.slice(i, i + 2)) ?? 0) + 1)
		return out
	}
	const x = pairs(a), y = pairs(b)
	let shared = 0, total = 0
	for (const n of x.values()) total += n
	for (const n of y.values()) total += n
	for (const [p, n] of x) shared += Math.min(n, y.get(p) ?? 0)
	return total ? (2 * shared) / total : 0
}
