import { db } from '../db.js'
import { newId } from './ids.js'

/* Shared by manual order create/update and bulk import: a vendor or category named by string
   is matched case-insensitively against what the user already has, and created if nothing
   matches. One rule in one place, so a vendor typed on the create form and a vendor named in
   an imported order are resolved the same way — client.js's own comment on rules.js makes the
   same point about a value required at one door and not the other. Every caller only ever uses
   the id, so that's all these fetch and return. */

const PALETTE = ['#235553', '#877364', '#177DA7', '#AD620D', '#8453F5', '#4F5BD5']
const colourFor = name => PALETTE[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length]

const selectVendorIdByName = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite)
	VALUES (@id, @userId, @name, @initials, @colour, 0)`)

export function findOrCreateVendor(userId, name) {
	const clean = String(name).trim()
	const existing = selectVendorIdByName.get(userId, clean)
	if (existing) return existing.id
	const id = newId('v')
	insertVendor.run({ id, userId, name: clean, initials: clean.slice(0, 2).toUpperCase(), colour: colourFor(clean) })
	return id
}

const selectCategoryIdByName = db.prepare('SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?)')
const insertCategory = db.prepare(`INSERT INTO categories (id, user_id, name, icon, colour, budget)
	VALUES (@id, @userId, @name, 'tag', 'var(--icon-red)', 0)`)

export function findOrCreateCategory(userId, name) {
	const clean = String(name).trim()
	const existing = selectCategoryIdByName.get(userId, clean)
	if (existing) return existing.id
	const id = newId('c')
	insertCategory.run({ id, userId, name: clean })
	return id
}
