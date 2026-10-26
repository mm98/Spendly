import { db } from '../db.js'
import { OFFER_MONTHS, OFFER_SOURCES, offerSourcesFor } from './index.js'

/* The vendors and categories whose orders get each source's Check offers (Settings and import 11a). The first
   time a source is read for an account, the vendors it knows by name or alias are picked; never again after. */

const selectStarted = db.prepare('SELECT 1 FROM user_offer_sources WHERE user_id = ? AND source_key = ?')
const insertStarted = db.prepare('INSERT OR IGNORE INTO user_offer_sources (user_id, source_key) VALUES (?, ?)')
const selectVendorNames = db.prepare(`SELECT id, name FROM vendors WHERE user_id = @userId
	UNION ALL SELECT vendor_id, name FROM vendor_aliases WHERE user_id = @userId`)
const insertVendor = db.prepare('INSERT OR IGNORE INTO user_offer_source_vendors (user_id, source_key, vendor_id) SELECT @userId, @sourceKey, id FROM vendors WHERE id = @id AND user_id = @userId')
const insertCategory = db.prepare('INSERT OR IGNORE INTO user_offer_source_categories (user_id, source_key, category_id) SELECT @userId, @sourceKey, id FROM categories WHERE id = @id AND user_id = @userId')
const deleteVendor = db.prepare('DELETE FROM user_offer_source_vendors WHERE user_id = @userId AND source_key = @sourceKey AND vendor_id = @id')
const deleteCategory = db.prepare('DELETE FROM user_offer_source_categories WHERE user_id = @userId AND source_key = @sourceKey AND category_id = @id')
const deleteVendors = db.prepare('DELETE FROM user_offer_source_vendors WHERE user_id = ? AND source_key = ?')
const deleteCategories = db.prepare('DELETE FROM user_offer_source_categories WHERE user_id = ? AND source_key = ?')
const selectVendors = db.prepare(`SELECT v.id, v.name, v.colour FROM user_offer_source_vendors p JOIN vendors v ON v.id = p.vendor_id
	WHERE p.user_id = ? AND p.source_key = ? ORDER BY v.name COLLATE NOCASE`)
const selectCategories = db.prepare(`SELECT c.id, c.name, c.icon, c.colour FROM user_offer_source_categories p JOIN categories c ON c.id = p.category_id
	WHERE p.user_id = ? AND p.source_key = ? ORDER BY c.name COLLATE NOCASE`)
const selectVendorPicked = db.prepare('SELECT source_key FROM user_offer_source_vendors WHERE user_id = ? AND vendor_id = ?')
const selectCategoryPicked = db.prepare('SELECT source_key FROM user_offer_source_categories WHERE user_id = ? AND category_id = ?')
const selectOrderPicked = db.prepare(`SELECT source_key FROM user_offer_source_vendors WHERE user_id = @userId AND vendor_id = @vendorId
	UNION SELECT source_key FROM user_offer_source_categories WHERE user_id = @userId AND category_id IN (SELECT value FROM json_each(@categoryIds))`)

const start = db.transaction((userId, source) => {
	if (selectStarted.get(userId, source.key)) return
	const known = new Set(selectVendorNames.all({ userId }).filter(v => source.shopKey(v.name)).map(v => v.id))
	for (const id of known) insertVendor.run({ userId, sourceKey: source.key, id })
	insertStarted.run(userId, source.key)
})

/** Makes the first picks of every source for the account, once. */
export const startPicks = userId => { for (const source of OFFER_SOURCES) start(userId, source) }

/** Every source with what it covers, whether the account can use it, and its picks: Settings' Offers pane. */
export function offerPicks(userId) {
	startPicks(userId)
	const usable = new Set(offerSourcesFor(userId).map(s => s.key))
	return OFFER_SOURCES.map(source => ({
		key: source.key,
		name: source.name,
		goods: source.goods,
		country: source.country,
		currencyName: source.currencyName,
		months: OFFER_MONTHS,
		usable: usable.has(source.key),
		vendors: selectVendors.all(userId, source.key),
		categories: selectCategories.all(userId, source.key)
	}))
}

/** Replaces the picks of the sources named in `sources` ({ [key]: { vendorIds, categoryIds } }); an id
    the account does not have is left out. */
export const setOfferPicks = db.transaction((userId, sources) => {
	startPicks(userId)
	for (const source of OFFER_SOURCES) {
		const asked = sources?.[source.key]
		if (!asked) continue
		deleteVendors.run(userId, source.key)
		deleteCategories.run(userId, source.key)
		for (const id of new Set(asked.vendorIds ?? [])) insertVendor.run({ userId, sourceKey: source.key, id })
		for (const id of new Set(asked.categoryIds ?? [])) insertCategory.run({ userId, sourceKey: source.key, id })
	}
})

const PICKED = {
	vendor: { select: selectVendorPicked, insert: insertVendor, remove: deleteVendor },
	category: { select: selectCategoryPicked, insert: insertCategory, remove: deleteCategory }
}

/** The sources the account can use, each with whether this vendor or category is picked: its page's Offers card. */
export function pickedFor(userId, kind, id) {
	startPicks(userId)
	const picked = new Set(PICKED[kind].select.all(userId, id).map(r => r.source_key))
	return offerSourcesFor(userId).map(source => ({ key: source.key, name: source.name, months: OFFER_MONTHS, picked: picked.has(source.key) }))
}

/** Picks or unpicks one vendor or category for the sources in `sources` ({ [key]: boolean }), as its page saves. */
export const setPickedFor = db.transaction((userId, kind, id, sources) => {
	startPicks(userId)
	for (const source of OFFER_SOURCES) {
		if (typeof sources?.[source.key] !== 'boolean') continue
		const args = { userId, sourceKey: source.key, id }
		if (sources[source.key]) PICKED[kind].insert.run(args)
		else PICKED[kind].remove.run(args)
	}
})

/** The source an order is checked against: the first the account can use whose picks hold the order's vendor
    or one of its categories, or null. */
export function pickedSourceFor(userId, { vendorId, categoryIds }) {
	startPicks(userId)
	const picked = new Set(selectOrderPicked.all({ userId, vendorId: vendorId ?? null, categoryIds: JSON.stringify(categoryIds ?? []) }).map(r => r.source_key))
	return offerSourcesFor(userId).find(source => picked.has(source.key)) ?? null
}
