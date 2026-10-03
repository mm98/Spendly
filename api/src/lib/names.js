/* How two spellings of one name are found to be the same. Kept apart from the SQL: SQLite's
   lower() folds neither accents nor punctuation. */

const LETTERS = { ø: 'o', æ: 'ae', ß: 'ss', œ: 'oe', ł: 'l', đ: 'd' }

/** A category name with case and accents set aside: "Decor" and "décor" are one category. */
export const foldName = name => String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '')
	.toLowerCase().replace(/[øæßœłđ]/g, c => LETTERS[c]).replace(/\s+/g, ' ').trim()

// The legal form a company name can end in, which receipts print and people leave out.
const LEGAL = new Set(['as', 'aps', 'ivs', 'is', 'ks', 'ps', 'amba', 'smba', 'ltd', 'gmbh', 'ab', 'inc', 'llc', 'plc', 'oy', 'bv', 'nv', 'sa', 'srl', 'spa', 'co'])

/** A vendor name or alias as receipts are matched on it: case and accents set aside, punctuation
    and a closing legal form ("A/S", "ApS", "Ltd", "GmbH") removed, spaces collapsed. */
export function vendorKey(name) {
	const folded = foldName(name)
	// "a/s" and "i/s" lose the slash first, so they read as one word
	const words = folded.replace(/\b([a-z])\/([a-z])\b/g, '$1$2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
	while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop()
	return words.join(' ')
}
