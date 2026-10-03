import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { fromEpoch } from '../lib/dates.js'
import { vendorStats, vendorStatsFor } from '../lib/aggregate.js'
import { findOrCreateCategory } from '../lib/findOrCreate.js'
import { colourFor } from '../lib/palette.js'
import { vendorKey } from '../lib/names.js'

export const router = Router()

const VENDOR_COLUMNS = 'id, name, initials, colour, favourite, lead, archived'
const selectAll = db.prepare('SELECT id, name, colour, favourite, archived FROM vendors WHERE user_id = ? ORDER BY name')
const selectOne = db.prepare(`SELECT ${VENDOR_COLUMNS} FROM vendors WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, lead)
	VALUES (@id, @userId, @name, @initials, @colour, @favourite, @lead)`)
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE vendor_id = ? AND user_id = ?')
const deleteOne = db.prepare('DELETE FROM vendors WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE vendors SET name=@name, initials=@initials, colour=@colour, favourite=@favourite, lead=@lead, archived=@archived WHERE id=@id AND user_id=@userId')

/* Aliases: the other strings a vendor resolves from (see migrations/002 and
   lib/findOrCreate.js). Owned by the vendor row -- deleting the vendor cascades them. */
const selectAllAliases = db.prepare('SELECT vendor_id, name FROM vendor_aliases WHERE user_id = ? ORDER BY name')
const selectAliasesForVendor = db.prepare('SELECT name, matched_at FROM vendor_aliases WHERE vendor_id = ? AND user_id = ? ORDER BY name')
const selectAccountNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = ?')
const selectAccountAliases = db.prepare(`SELECT a.vendor_id AS id, a.name, v.name AS owner FROM vendor_aliases a
	JOIN vendors v ON v.id = a.vendor_id WHERE a.user_id = ?`)
const deleteAlias = db.prepare('DELETE FROM vendor_aliases WHERE user_id = ? AND vendor_id = ? AND name = ?')
const insertAlias = db.prepare('INSERT INTO vendor_aliases (id, user_id, vendor_id, name, matched_at) VALUES (?, ?, ?, ?, ?)')
const deleteAliasesForVendor = db.prepare('DELETE FROM vendor_aliases WHERE vendor_id = ? AND user_id = ?')

const aliasesFor = (userId, vendorId) => selectAliasesForVendor.all(vendorId, userId).map(r => r.name)

/** The alias a receipt last found this vendor by, or null when none has matched yet. */
const lastMatchedFor = (userId, vendorId) => selectAliasesForVendor.all(vendorId, userId)
	.filter(r => r.matched_at != null).sort((a, b) => b.matched_at - a.matched_at)[0]?.name ?? null

/** Which other vendor a string already reaches, compared as receipts are matched (lib/names.js):
    `{ id, name, alias }`, where `alias` is the other vendor's alias it meets, or null for its name. */
function holderOf(userId, vendorId, text) {
	const key = vendorKey(text)
	if (!key) return null
	const named = selectAccountNames.all(userId).find(v => v.id !== vendorId && vendorKey(v.name) === key)
	if (named) return { id: named.id, name: named.name, alias: null }
	const aliased = selectAccountAliases.all(userId).find(a => a.id !== vendorId && vendorKey(a.name) === key)
	return aliased ? { id: aliased.id, name: aliased.owner, alias: aliased.name } : null
}

/* Carried as names, the shape an order's own categories travel in, so the order form drops
   them straight into its field. */
const selectAllDefaultCategories = db.prepare(`SELECT d.vendor_id, c.name FROM vendor_default_categories d
	JOIN categories c ON c.id = d.category_id
	JOIN vendors v ON v.id = d.vendor_id
	WHERE v.user_id = ? ORDER BY c.name`)
const selectDefaultCategoriesForVendor = db.prepare(`SELECT c.name FROM vendor_default_categories d
	JOIN categories c ON c.id = d.category_id
	WHERE d.vendor_id = ? AND c.user_id = ? ORDER BY c.name`)
const insertDefaultCategory = db.prepare('INSERT INTO vendor_default_categories (vendor_id, category_id) VALUES (?, ?)')
const deleteDefaultCategoriesForVendor = db.prepare('DELETE FROM vendor_default_categories WHERE vendor_id = ?')

const defaultCategoriesFor = (userId, vendorId) =>
	selectDefaultCategoriesForVendor.all(vendorId, userId).map(r => r.name)

/** Trims, drops empties, folds case-insensitive duplicates. Names, not ids: an unknown one is
    created on write (lib/findOrCreate.js), as saving an order does with the same field. */
function cleanDefaultCategories(raw) {
	if (!Array.isArray(raw)) return { error: 'Default categories must be a list of names.' }
	const seen = new Set()
	const names = []
	for (const value of raw) {
		const name = String(value ?? '').trim()
		if (!name) continue
		if (name.length > 80) return { error: '80 characters at most for a category name.' }
		if (seen.has(name.toLowerCase())) continue
		seen.add(name.toLowerCase())
		names.push(name)
	}
	return { names }
}

/** Replaces a vendor's stored default set -- delete-and-reinsert, like the aliases beside it:
    nothing references one of these rows by id. */
const writeDefaultCategories = db.transaction((userId, vendorId, names) => {
	deleteDefaultCategoriesForVendor.run(vendorId)
	for (const name of names) insertDefaultCategory.run(vendorId, findOrCreateCategory(userId, name))
})

/** One rule for a submitted alias list, wherever it arrives from (create, edit, the scan
    review's learned alias). Trims, drops empties, folds case-insensitive duplicates, and
    answers either the clean list or the sentence refusing it -- an alias may not repeat the
    vendor's own name, and may not be another vendor's name or alias, because resolution
    reads each string back to exactly one vendor. */
function cleanAliases(userId, vendorId, vendorName, raw, move = []) {
	if (!Array.isArray(raw)) return { status: 400, error: 'Aliases must be a list of names.' }
	const moving = new Set((Array.isArray(move) ? move : []).map(m => vendorKey(m)))
	const seen = new Set()
	const aliases = []
	const moves = []
	for (const value of raw) {
		const name = String(value ?? '').trim()
		if (!name) continue
		if (name.length > 80) return { status: 400, error: '80 characters at most for an alias.' }
		const key = vendorKey(name)
		if (key === vendorKey(vendorName))
			return { status: 400, error: `An alias must differ from the vendor's own name.` }
		if (seen.has(key)) continue
		seen.add(key)
		const holder = holderOf(userId, vendorId, name)
		if (holder && !holder.alias)
			return { status: 409, error: `You already have a vendor called ${holder.name}.` }
		if (holder && !moving.has(key))
			return { status: 409, error: `Another vendor, ${holder.name}, already matches "${name}". Pick a different one.` }
		if (holder) moves.push(holder)
		aliases.push(name)
	}
	return { aliases, moves }
}

/** Replaces a vendor's stored alias set with the validated list -- delete-and-reinsert, the
    same shape as an order's categories: nothing references an alias row by id. */
const writeAliases = db.transaction((userId, vendorId, aliases, moves = []) => {
	const matched = new Map(selectAliasesForVendor.all(vendorId, userId).map(r => [r.name, r.matched_at]))
	for (const held of moves) deleteAlias.run(userId, held.id, held.alias)
	deleteAliasesForVendor.run(vendorId, userId)
	for (const name of aliases) insertAlias.run(newId('va'), userId, vendorId, name, matched.get(name) ?? null)
})

/** The vendor row write and its alias rewrite, as one commit. Run separately they committed
    separately, so a failure between them left a renamed vendor whose old name had not become
    an alias -- receipts carrying it would stop resolving. writeAliases nests as a savepoint
    inside this, so it stays callable on its own where nothing else is written. */
const saveVendor = db.transaction((writeRow, userId, vendorId, aliases, defaultCategories, moves) => {
	writeRow()
	writeAliases(userId, vendorId, aliases, moves)
	writeDefaultCategories(userId, vendorId, defaultCategories)
})

const withStats = (vendor, stats, aliases = [], defaultCategories = [], lastMatched = null) => {
	const s = stats.get(vendor.id) ?? { orders: 0, spend: 0, saved: 0 }
	return {
		id: vendor.id, name: vendor.name, initials: vendor.initials, colour: vendor.colour,
		favourite: Boolean(vendor.favourite), lead: vendor.lead ?? undefined, archived: Boolean(vendor.archived),
		aliases, lastMatched, defaultCategories,
		orders: s.orders, spend: s.spend, saved: s.saved
	}
}

// The single record as its page reads it: stats, aliases, which alias matched last, and its defaults.
const fullRecord = (userId, vendor) => withStats(vendor, statsForOne(userId, vendor.id), aliasesFor(userId, vendor.id),
	defaultCategoriesFor(userId, vendor.id), lastMatchedFor(userId, vendor.id))

/* The list's own shape: what the vendor list, the pickers, the filters and the palette read.
   The colour is the list's mark; initials and lead are the single-record route's. */
const listRow = (vendor, stats, aliases, defaultCategories) => {
	const s = stats.get(vendor.id) ?? { orders: 0, spend: 0, saved: 0, last: null }
	return {
		id: vendor.id, name: vendor.name, colour: vendor.colour, favourite: Boolean(vendor.favourite),
		archived: Boolean(vendor.archived), aliases, defaultCategories,
		orders: s.orders, spend: s.spend, saved: s.saved, lastOrder: s.last ? fromEpoch(s.last) : null
	}
}

router.get('/', (req, res) => {
	const stats = vendorStats(req.user.id)
	const groupByVendor = rows => {
		const by = new Map()
		for (const row of rows) {
			if (!by.has(row.vendor_id)) by.set(row.vendor_id, [])
			by.get(row.vendor_id).push(row.name)
		}
		return by
	}
	const aliasesBy = groupByVendor(selectAllAliases.all(req.user.id))
	/* One query for the whole account's defaults, grouped here -- the order form reads this
	   list to fill its categories field, so a per-vendor query would be one round of SQL per
	   row of a list that is already in hand. */
	const defaultsBy = groupByVendor(selectAllDefaultCategories.all(req.user.id))
	res.json(selectAll.all(req.user.id)
		.map(v => listRow(v, stats, aliasesBy.get(v.id) ?? [], defaultsBy.get(v.id) ?? [])))
})

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'A vendor needs a name.' })
	if (selectByNameExists.get(req.user.id, name))
		return res.status(409).json({ error: `You already have a vendor called ${name}.` })
	const nameAsAlias = holderOf(req.user.id, null, name)
	if (nameAsAlias?.alias)
		return res.status(409).json({ error: `Another vendor, ${nameAsAlias.name}, already matches "${name}". Pick a different name.` })

	const look = req.body?.look ?? {}
	const cleaned = cleanAliases(req.user.id, null, name, look.aliases ?? [], look.move)
	if (cleaned.error) return res.status(cleaned.status).json({ error: cleaned.error })
	const defaults = cleanDefaultCategories(look.defaultCategories ?? [])
	if (defaults.error) return res.status(400).json({ error: defaults.error })

	const vendor = {
		id: newId('v'), userId: req.user.id, name,
		initials: look.initials ?? name.slice(0, 2).toUpperCase(),
		colour: look.colour ?? colourFor(name),
		favourite: look.favourite ? 1 : 0, lead: look.lead ?? null
	}
	saveVendor(() => insert.run(vendor), req.user.id, vendor.id, cleaned.aliases, defaults.names, cleaned.moves)
	// Read back rather than echoed, so the answer holds the stored order (alphabetical).
	res.status(201).json(withStats({ ...vendor, favourite: vendor.favourite }, new Map(),
		aliasesFor(req.user.id, vendor.id), defaultCategoriesFor(req.user.id, vendor.id)))
})

/* One vendor's stats, not vendorStats' whole-account rollup read for one entry -- the map
   groups all 50,000 of a big account's orders (~25ms) to render a single record this reads
   in ~2ms from that vendor's own indexed rows (lib/aggregate.js). */
const statsForOne = (userId, vendorId) => new Map([[vendorId, vendorStatsFor(userId, vendorId)]])

router.get('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	res.json(fullRecord(req.user.id, vendor))
})

router.patch('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	const patch = req.body ?? {}
	/* The same rule the create door enforces: '' survives `?.trim() ?? fallback` because an
	   empty string is not nullish, so a whitespace rename stored an empty vendor name that
	   rendered blank in every list -- and a non-string patch.name threw at .trim into a 500. */
	const nextName = patch.name !== undefined ? String(patch.name).trim() : vendor.name
	if (!nextName) return res.status(400).json({ error: 'A vendor needs a name.' })
	const currentAliases = aliasesFor(req.user.id, vendor.id)
	/* Renaming a vendor to one of its own aliases swaps the two: the alias becomes the name,
	   and the name it had until now is kept as an alias -- the receipts that carry it should
	   go on resolving here. Detected before the clash checks, because to those a rename onto
	   your own alias looks like a collision and is not one. */
	const renamedToOwnAlias = nextName.toLowerCase() !== vendor.name.toLowerCase()
		&& currentAliases.some(a => a.toLowerCase() === nextName.toLowerCase())
	if (nextName.toLowerCase() !== vendor.name.toLowerCase()) {
		const clash = selectByNameExists.get(req.user.id, nextName)
		if (clash) return res.status(409).json({ error: `You already have a vendor called ${nextName}.` })
		const owner = holderOf(req.user.id, vendor.id, nextName)
		if (owner?.alias)
			return res.status(409).json({ error: `Another vendor, ${owner.name}, already matches "${nextName}". Pick a different name.` })
	}

	/* The submitted set replaces the stored one; absent, the stored one stands. Either way
	   the swap above is applied to it -- the new name leaves the alias list, the old name
	   joins it -- so the rule holds whichever fields the caller sent together. */
	let submitted = (patch.aliases !== undefined ? patch.aliases : currentAliases)
		.map(a => String(a ?? '').trim())
	if (renamedToOwnAlias) {
		submitted = submitted.filter(a => a.toLowerCase() !== nextName.toLowerCase())
		if (!submitted.some(a => a.toLowerCase() === vendor.name.toLowerCase())) submitted.push(vendor.name)
	}
	const cleaned = cleanAliases(req.user.id, vendor.id, nextName, submitted, patch.move)
	if (cleaned.error) return res.status(cleaned.status).json({ error: cleaned.error })
	// Same rule as the aliases above: the submitted set replaces the stored one, absent it stands.
	const defaults = cleanDefaultCategories(patch.defaultCategories !== undefined
		? patch.defaultCategories : defaultCategoriesFor(req.user.id, vendor.id))
	if (defaults.error) return res.status(400).json({ error: defaults.error })

	const next = {
		name: nextName,
		initials: patch.initials ?? vendor.initials,
		colour: patch.colour ?? vendor.colour,
		favourite: patch.favourite != null ? (patch.favourite ? 1 : 0) : vendor.favourite,
		lead: patch.lead !== undefined ? patch.lead : vendor.lead,
		archived: patch.archived != null ? (patch.archived ? 1 : 0) : vendor.archived
	}
	saveVendor(() => update.run({ ...next, id: vendor.id, userId: req.user.id }),
		req.user.id, vendor.id, cleaned.aliases, defaults.names, cleaned.moves)
	res.json(fullRecord(req.user.id, selectOne.get(vendor.id, req.user.id)))
})

/** Adds one alias -- the scan review's learning path. When a receipt's vendor line said one
    string and the order was saved under another vendor, that correction is the mapping, so
    the client posts the scanned string here and the next receipt matches without it.
    Idempotent for the alias it already has, refused with the reason when the string belongs
    to something else. The vendor travels in the body (`vendorId`) rather than the path --
    /api/vendors/aliases is about the account's alias set, keyed to the vendor it extends. */
router.post('/aliases', (req, res) => {
	const vendorId = String(req.body?.vendorId ?? '')
	const vendor = selectOne.get(vendorId, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + vendorId })
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'An alias needs a name.' })
	const existing = aliasesFor(req.user.id, vendor.id)
	if (existing.some(a => a.toLowerCase() === name.toLowerCase()))
		return res.json({ id: vendor.id, aliases: existing })
	const cleaned = cleanAliases(req.user.id, vendor.id, vendor.name, [...existing, name])
	if (cleaned.error) return res.status(cleaned.status).json({ error: cleaned.error })
	writeAliases(req.user.id, vendor.id, cleaned.aliases)
	res.status(201).json({ id: vendor.id, aliases: aliasesFor(req.user.id, vendor.id) })
})

router.delete('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	if (countOrders.get(vendor.id, req.user.id).c > 0)
		return res.status(409).json({ error: 'That vendor still has orders.' })
	deleteOne.run(vendor.id, req.user.id)
	res.json({ id: vendor.id })
})

/* Merge (5j): orders move, the source's names become the target's aliases, the target keeps its
   own values where it has them, and `merges` keeps a record, since it cannot be undone. */
const moveOrders = db.prepare('UPDATE orders SET vendor_id = ? WHERE vendor_id = ? AND user_id = ?')
const insertMerge = db.prepare(`INSERT INTO merges (id, user_id, kind, source_name, target_id, orders)
	VALUES (?, ?, ?, ?, ?, ?)`)

const mergeVendors = db.transaction((userId, source, target) => {
	const moved = countOrders.get(source.id, userId).c
	const seen = new Set([vendorKey(target.name)])
	const aliases = []
	for (const name of [...aliasesFor(userId, target.id), source.name, ...aliasesFor(userId, source.id)]) {
		const key = vendorKey(name)
		if (!key || seen.has(key)) continue
		seen.add(key)
		aliases.push(name)
	}
	const defaults = defaultCategoriesFor(userId, target.id)
	const sourceDefaults = defaultCategoriesFor(userId, source.id)
	moveOrders.run(target.id, source.id, userId)
	deleteOne.run(source.id, userId)
	update.run({
		id: target.id, userId, name: target.name, initials: target.initials, colour: target.colour,
		favourite: target.favourite || source.favourite ? 1 : 0, lead: target.lead ?? source.lead, archived: target.archived
	})
	writeAliases(userId, target.id, aliases)
	writeDefaultCategories(userId, target.id, defaults.length ? defaults : sourceDefaults)
	insertMerge.run(newId('mg'), userId, 'vendor', source.name, target.id, moved)
})

router.post('/:id/merge', (req, res) => {
	const source = selectOne.get(req.params.id, req.user.id)
	if (!source) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	const target = selectOne.get(String(req.body?.into ?? ''), req.user.id)
	if (!target) return res.status(400).json({ error: 'Pick the vendor to merge into.' })
	if (target.id === source.id) return res.status(400).json({ error: 'A vendor cannot be merged into itself.' })
	mergeVendors(req.user.id, source, target)
	res.json(fullRecord(req.user.id, selectOne.get(target.id, req.user.id)))
})
