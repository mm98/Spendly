import { db } from '../db.js'

const LETTERS = { 'ø': 'oe', 'æ': 'ae', 'å': 'aa', 'ö': 'oe', 'ä': 'ae', 'ü': 'ue', 'ß': 'ss' }
// a company form says nothing about which shop it is, so "Indbo Moebler A/S" is "Indbo Møbler"
const FORMS = /\b(a\/s|aps|i\/s|k\/s|p\/s|as|ab|asa|oy|gmbh|ag|bv|nv|ltd|limited|inc|llc|plc|co|sa|srl|sarl)\b\.?/g

/** The part of a vendor's name that tells two vendors apart: letters and digits only, with the
    Danish letters written out as they are when a keyboard or a scanned receipt has none. */
export function vendorKey(name) {
	const lower = String(name ?? '').toLowerCase().replace(/[øæåöäüß]/g, ch => LETTERS[ch])
	const plain = lower.normalize('NFKD').replace(/[̀-ͯ]/g, '')
	return plain.replace(FORMS, ' ').replace(/[^a-z0-9]/g, '')
}

const selectVendorNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = ?')

/** The account's vendors that share a key with another vendor, in groups of two or more. */
export function lookalikeVendors(userId) {
	const groups = new Map()
	for (const v of selectVendorNames.all(userId)) {
		const key = vendorKey(v.name)
		if (!key) continue
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key).push(v)
	}
	return [...groups.values()].filter(group => group.length > 1)
}
