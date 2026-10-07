/* How two spellings of one name are found to be the same. Kept apart from the SQL: SQLite's
   lower() folds neither accents nor punctuation. react/src/api/names.js holds the same rules. */

const LETTERS = { ø: 'o', æ: 'ae', ß: 'ss', œ: 'oe', ł: 'l', đ: 'd' }

/** A category name with case and accents set aside: "Decor" and "décor" are one category. */
export const foldName = name => String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '')
	.toLowerCase().replace(/[øæßœłđ]/g, c => LETTERS[c]).replace(/\s+/g, ' ').trim()

// The legal form a company name can end in, which receipts print and people leave out.
const LEGAL = new Set(['as', 'aps', 'ivs', 'is', 'ks', 'ps', 'amba', 'smba', 'ltd', 'gmbh', 'ab', 'inc', 'llc', 'plc', 'oy', 'bv', 'nv', 'sa', 'srl', 'spa', 'co'])

// "CVR 12345678", "CVR-nr. 12 34 56 78", "DK12345678", "SE-nr: 12345678": a label, a country, 8 to 12 digits
const VAT = /^(?:(?:cvr|vat|moms|se)(?:[\s.-]*(?:nr|no|nummer|number))?[\s.:-]*)?(?:[a-z]{2}[\s-]?)?(\d(?:[\s.-]?\d){7,11})$/
// "indbo.dk", "www.indbo.dk", "https://www.indbo.dk/kurv", "info@indbo.dk": the host, without www
const WEB = /^(?:[^\s@/]+@|(?:https?:\/\/)?(?:www\.)?)((?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,24})(?::\d+)?(?:[/?#]\S*)?$/u

/** The VAT (CVR) number a text is, as its digits, or null when it is no VAT number. */
export function vatNumberOf(text) {
	const found = VAT.exec(String(text ?? '').trim().toLowerCase())
	return found ? found[1].replace(/\D/g, '') : null
}

/** The web address a text is, as its host without "www.", or null when it is no web address. */
export function webAddressOf(text) {
	const found = WEB.exec(String(text ?? '').trim().toLowerCase())
	return found ? found[1] : null
}

/** A vendor name or alias as receipts match it: case, accents, punctuation and a closing legal form
    set aside. A web address or VAT number (5h) has one form, however it is written. */
export function vendorKey(name) {
	const vat = vatNumberOf(name)
	if (vat) return 'cvr ' + vat
	const folded = foldName(webAddressOf(name) ?? name)
	// "a/s" and "i/s" lose the slash first, so they read as one word
	const words = folded.replace(/\b([a-z])\/([a-z])\b/g, '$1$2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
	while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop()
	return words.join(' ')
}

// a receipt without the Danish letters writes them out, so "Møbler" and "Moebler" are compared that way
const SPELLED = { ø: 'oe', æ: 'ae', å: 'aa', ö: 'oe', ä: 'ae', ü: 'ue' }

/** A name's letter pairs, counted: what `likeness` compares, worked out once per name. */
export function letterPairs(name) {
	const text = vendorKey(String(name ?? '').toLowerCase().replace(/[øæåöäü]/g, c => SPELLED[c])).replace(/ /g, '')
	const pairs = new Map()
	for (let i = 0; i < text.length - 1; i++) pairs.set(text.slice(i, i + 2), (pairs.get(text.slice(i, i + 2)) ?? 0) + 1)
	return { pairs, count: Math.max(0, text.length - 1) }
}

/** How alike two names are, 0 to 1: the share of letter pairs they have in common. Takes names, or
    what `letterPairs` made of them. */
export function likeness(a, b) {
	const x = typeof a === 'object' ? a : letterPairs(a)
	const y = typeof b === 'object' ? b : letterPairs(b)
	if (x.count + y.count === 0) return 0
	let shared = 0
	for (const [pair, n] of x.pairs) shared += Math.min(n, y.pairs.get(pair) ?? 0)
	return (2 * shared) / (x.count + y.count)
}

/** Two vendors look like one shop (5j) from a likeness of this or more between their names. */
export const LIKENESS = 0.85

const CATEGORY_NAME_MAX = 40

/** Model output narrowed to names a category could have: short, once each, none empty. */
export function categoryNamesOf(list) {
	const out = []
	for (const raw of Array.isArray(list) ? list : []) {
		const name = String(raw ?? '').replace(/\s+/g, ' ').trim()
		if (name && name.length <= CATEGORY_NAME_MAX && !out.some(n => foldName(n) === foldName(name))) out.push(name)
	}
	return out
}
