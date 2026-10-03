/* How two spellings of one vendor name are found to be the same: the rule the API matches
   receipts by (api/src/lib/names.js), so a page warns about exactly what a save would refuse. */

const LETTERS = { ø: 'o', æ: 'ae', ß: 'ss', œ: 'oe', ł: 'l', đ: 'd' }
const LEGAL = new Set(['as', 'aps', 'ivs', 'is', 'ks', 'ps', 'amba', 'smba', 'ltd', 'gmbh', 'ab', 'inc', 'llc', 'plc', 'oy', 'bv', 'nv', 'sa', 'srl', 'spa', 'co'])

const fold = name => String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '')
	.toLowerCase().replace(/[øæßœłđ]/g, c => LETTERS[c]).replace(/\s+/g, ' ').trim()

// "CVR 12345678", "CVR-nr. 12 34 56 78", "DK12345678", "SE-nr: 12345678": a label, a country, 8 to 12 digits
const VAT = /^(?:(?:cvr|vat|moms|se)(?:[\s.-]*(?:nr|no|nummer|number))?[\s.:-]*)?(?:[a-z]{2}[\s-]?)?(\d(?:[\s.-]?\d){7,11})$/
// "indbo.dk", "www.indbo.dk", "https://www.indbo.dk/kurv", "info@indbo.dk": the host, without www
const WEB = /^(?:[^\s@/]+@|(?:https?:\/\/)?(?:www\.)?)((?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,24})(?::\d+)?(?:[/?#]\S*)?$/u

/** The VAT (CVR) number a text is, as its digits, or null when it is no VAT number. */
export function vatNumberOf(text) {
	const found = VAT.exec(String(text ?? '').trim().toLowerCase())
	return found ? found[1].replace(/\D/g, '') : null
}

const webAddressOf = text => WEB.exec(String(text ?? '').trim().toLowerCase())?.[1] ?? null

/** A name with case, accents, punctuation and a closing legal form ("A/S", "ApS") set aside. A web
    address or a VAT number has one form, however it is written (5h). */
export function vendorKey(name) {
	const vat = vatNumberOf(name)
	if (vat) return 'cvr ' + vat
	const words = fold(webAddressOf(name) ?? name).replace(/\b([a-z])\/([a-z])\b/g, '$1$2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
	while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop()
	return words.join(' ')
}

// a receipt without the Danish letters writes them out, so "Møbler" and "Moebler" are compared that way
const SPELLED = { ø: 'oe', æ: 'ae', å: 'aa', ö: 'oe', ä: 'ae', ü: 'ue' }

function letterPairs(name) {
	const text = vendorKey(String(name ?? '').toLowerCase().replace(/[øæåöäü]/g, c => SPELLED[c])).replace(/ /g, '')
	const pairs = new Map()
	for (let i = 0; i < text.length - 1; i++) pairs.set(text.slice(i, i + 2), (pairs.get(text.slice(i, i + 2)) ?? 0) + 1)
	return { pairs, count: Math.max(0, text.length - 1) }
}

/** How alike two names are, 0 to 1: the share of letter pairs they have in common. */
export function likeness(a, b) {
	const x = letterPairs(a), y = letterPairs(b)
	if (x.count + y.count === 0) return 0
	let shared = 0
	for (const [pair, n] of x.pairs) shared += Math.min(n, y.pairs.get(pair) ?? 0)
	return (2 * shared) / (x.count + y.count)
}

const vatNumbers = vendor => new Set([vendor.name, ...(vendor.aliases ?? [])].map(vatNumberOf).filter(Boolean))

/** Whether two vendors look like one shop (5j): names alike past 0.85, or one VAT number. The
    API's lib/vendorLookalikes.js flags the same pairs. `b` may be a name still being typed. */
export function looksAlike(a, b) {
	const other = typeof b === 'string' ? { name: b } : b
	if (likeness(a.name, other.name) >= 0.85) return true
	const theirs = vatNumbers(other)
	return [...vatNumbers(a)].some(n => theirs.has(n))
}
