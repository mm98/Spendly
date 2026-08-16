import { db } from '../db.js'
import { newId } from './ids.js'
import { CATEGORY_PALETTE, VENDOR_PALETTE, colourFor } from './palette.js'

/* Shared by manual order create/update and bulk import: a vendor or category named by string
   is matched case-insensitively against what the user already has, and created if nothing
   matches. One rule in one place, so a vendor typed on the create form and a vendor named in
   an imported order are resolved the same way — client.js's own comment on rules.js makes the
   same point about a value required at one door and not the other. Every caller only ever uses
   the id, so that's all these fetch and return. */

const selectVendorIdByName = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const selectVendorIdByAlias = db.prepare('SELECT vendor_id AS id FROM vendor_aliases WHERE user_id = ? AND lower(name) = lower(?)')
const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite)
	VALUES (@id, @userId, @name, @initials, @colour, 0)`)

/** The one string-to-vendor lookup: the vendor's own name first, then its aliases -- the
    name it had before a rename, the shortened form an invoice prints (vendor_aliases).
    A scanned receipt saying "Bilka A/S" files under Bilka instead of creating a twin. */
export function findVendorIdByAnyName(userId, name) {
	const clean = String(name).trim()
	return (selectVendorIdByName.get(userId, clean) ?? selectVendorIdByAlias.get(userId, clean))?.id
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

/* The colour was the literal string 'var(--icon-red)' for every category created this way --
   both a leftover from before 9a66a34 moved category colours to hex, and the reason a ledger
   built by importing came out with a one-colour donut: every category the import created was
   the same red, so the breakdown ring, its legend swatches and every category tile agreed with
   each other and said nothing. Hashed off the name now, like a vendor's. README: Charts. */
export function findOrCreateCategory(userId, name) {
	const clean = String(name).trim()
	const existing = selectCategoryIdByName.get(userId, clean)
	if (existing) return existing.id
	const id = newId('c')
	insertCategory.run({ id, userId, name: clean, colour: colourFor(clean, CATEGORY_PALETTE) })
	return id
}
