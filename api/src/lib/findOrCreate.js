import { db } from '../db.js'
import { newId } from './ids.js'
import { VENDOR_PALETTE, colourFor, nextUnused } from './palette.js'
import { foldName, vatNumberOf, vendorKey, webAddressOf } from './names.js'

/* Shared by manual order create/update and bulk import: a vendor or category named by string
   is matched case-insensitively against what the user already has, and created if nothing
   matches. One rule in one place, so a vendor typed on the create form and a vendor named in
   an imported order are resolved the same way — client.js's own comment on rules.js makes the
   same point about a value required at one door and not the other. Every caller only ever uses
   the id, so that's all these fetch and return. */

const selectVendorIdByName = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const selectVendorIdByAlias = db.prepare('SELECT vendor_id AS id, name FROM vendor_aliases WHERE user_id = ? AND lower(name) = lower(?)')
const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, made_by_order)
	VALUES (@id, @userId, @name, @initials, @colour, 0, @orderId)`)

const selectVendorNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = ?')
const selectAliasNames = db.prepare('SELECT vendor_id AS id, name FROM vendor_aliases WHERE user_id = ?')
const markAliasMatched = db.prepare(`UPDATE vendor_aliases SET matched_at = unixepoch()
	WHERE user_id = ? AND vendor_id = ? AND name = ?`)

/** The one string-to-vendor lookup: the vendor's own name first, then its aliases -- the
    name it had before a rename, the shortened form an invoice prints (vendor_aliases).
    Exact (any case) first; then compared as vendor keys (lib/names.js), so "INDBO MØBLER A/S"
    finds "Indbo Møbler". Answers `{ id, alias }`, `alias` being the alias that found it, or
    undefined. `except` is a vendor left out, as its own form asks about the others. */
export function resolveVendor(userId, name, except = null) {
	const clean = String(name ?? '').trim()
	if (!clean) return undefined
	const other = row => (row && row.id !== except ? row : undefined)
	const named = other(selectVendorIdByName.get(userId, clean))
	if (named) return { id: named.id, alias: null }
	const aliased = other(selectVendorIdByAlias.get(userId, clean))
	if (aliased) return { id: aliased.id, alias: aliased.name }
	const key = vendorKey(clean)
	if (!key) return undefined
	const byName = selectVendorNames.all(userId).find(v => v.id !== except && vendorKey(v.name) === key)
	if (byName) return { id: byName.id, alias: null }
	const byAlias = selectAliasNames.all(userId).find(a => a.id !== except && vendorKey(a.name) === key)
	return byAlias ? { id: byAlias.id, alias: byAlias.name } : undefined
}

/** The vendor a string files under, as an id; an alias that finds it is marked as the last one that matched. */
export function findVendorIdByAnyName(userId, name) {
	const found = resolveVendor(userId, name)
	if (found?.alias) markAliasMatched.run(userId, found.id, found.alias)
	return found?.id
}

/** The vendor a receipt names, tried as 5h says: its VAT number, then its web address, then the
    name it printed. Each is matched against every vendor's name and aliases, by `find`. */
export function findVendorIdForReceipt(userId, { vendor, website, vatNumber }, find = findVendorIdByAnyName) {
	const vat = vatNumberOf(vatNumber)
	const web = webAddressOf(website)
	return (vat ? find(userId, 'CVR ' + vat) : undefined)
		?? (web ? find(userId, web) : undefined)
		?? find(userId, vendor)
}

/** `orderId` is the order being saved, kept on a vendor it makes (migrations/190). */
export function findOrCreateVendor(userId, name, orderId = null) {
	const clean = String(name).trim()
	const existing = findVendorIdByAnyName(userId, clean)
	if (existing) return existing
	const id = newId('v')
	insertVendor.run({ id, userId, name: clean, initials: clean.slice(0, 2).toUpperCase(),
		colour: colourFor(clean, VENDOR_PALETTE), orderId })
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
