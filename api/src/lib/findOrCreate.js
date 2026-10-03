import { db } from '../db.js'
import { newId } from './ids.js'
import { VENDOR_PALETTE, colourFor, nextUnused } from './palette.js'
import { foldName, vendorKey } from './names.js'

/* Shared by manual order create/update and bulk import: a vendor or category named by string
   is matched case-insensitively against what the user already has, and created if nothing
   matches. One rule in one place, so a vendor typed on the create form and a vendor named in
   an imported order are resolved the same way — client.js's own comment on rules.js makes the
   same point about a value required at one door and not the other. Every caller only ever uses
   the id, so that's all these fetch and return. */

const selectVendorIdByName = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const selectVendorIdByAlias = db.prepare('SELECT vendor_id AS id, name FROM vendor_aliases WHERE user_id = ? AND lower(name) = lower(?)')
const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite)
	VALUES (@id, @userId, @name, @initials, @colour, 0)`)

const selectVendorNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = ?')
const selectAliasNames = db.prepare('SELECT vendor_id AS id, name FROM vendor_aliases WHERE user_id = ?')
const markAliasMatched = db.prepare(`UPDATE vendor_aliases SET matched_at = unixepoch()
	WHERE user_id = ? AND vendor_id = ? AND name = ?`)

/** The one string-to-vendor lookup: the vendor's own name first, then its aliases -- the
    name it had before a rename, the shortened form an invoice prints (vendor_aliases).
    Exact (any case) first; then compared as vendor keys (lib/names.js), so "INDBO MØBLER A/S"
    finds "Indbo Møbler". An alias that finds the vendor is marked as the last one that matched. */
export function findVendorIdByAnyName(userId, name) {
	const clean = String(name).trim()
	const named = selectVendorIdByName.get(userId, clean)
	if (named) return named.id
	const aliased = selectVendorIdByAlias.get(userId, clean)
	if (aliased) { markAliasMatched.run(userId, aliased.id, aliased.name); return aliased.id }
	const key = vendorKey(clean)
	if (!key) return undefined
	const byName = selectVendorNames.all(userId).find(v => vendorKey(v.name) === key)
	if (byName) return byName.id
	const byAlias = selectAliasNames.all(userId).find(a => vendorKey(a.name) === key)
	if (byAlias) { markAliasMatched.run(userId, byAlias.id, byAlias.name); return byAlias.id }
	return undefined
}

export function findOrCreateVendor(userId, name) {
	const clean = String(name).trim()
	const existing = findVendorIdByAnyName(userId, clean)
	if (existing) return existing
	const id = newId('v')
	insertVendor.run({ id, userId, name: clean, initials: clean.slice(0, 2).toUpperCase(),
		colour: colourFor(clean, VENDOR_PALETTE) })
	return id
}

const selectCategoryIdByName = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const insertCategory = db.prepare(`INSERT INTO categories (id, user_id, name, icon, colour, budget)
	VALUES (@id, @userId, @name, 'tag', @colour, 0)`)

const selectCategoryNames = db.prepare('SELECT id, name FROM categories WHERE user_id = ?')

/** The category a name means with case and accents set aside, or undefined. */
export const findCategoryByFold = (userId, name) => {
	const key = foldName(name)
	return selectCategoryNames.all(userId).find(c => foldName(c.name) === key)
}

const selectCategoryColours = db.prepare('SELECT colour FROM categories WHERE user_id = ?')

/** The colour a new category gets when nobody picked one: the next of the eight no category wears yet. */
export const nextCategoryColour = userId => nextUnused(selectCategoryColours.all(userId).map(r => r.colour))

export function findOrCreateCategory(userId, name) {
	const clean = String(name).trim()
	const existing = selectCategoryIdByName.get(userId, clean) ?? findCategoryByFold(userId, clean)
	if (existing) return existing.id
	const id = newId('c')
	insertCategory.run({ id, userId, name: clean, colour: nextCategoryColour(userId) })
	return id
}
