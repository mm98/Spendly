import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { vendorStats, vendorStatsFor } from '../lib/aggregate.js'
import { fromEpoch } from '../lib/dates.js'
import { colourFor } from '../lib/palette.js'

export const router = Router()

const VENDOR_COLUMNS = 'id, name, initials, colour, favourite, lead'
const selectAll = db.prepare(`SELECT ${VENDOR_COLUMNS} FROM vendors WHERE user_id = ? ORDER BY name`)
const selectOne = db.prepare(`SELECT ${VENDOR_COLUMNS} FROM vendors WHERE id = ? AND user_id = ?`)
const selectByNameExists = db.prepare('SELECT id FROM vendors WHERE user_id = ? AND lower(name) = lower(?)')
const insert = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, lead)
	VALUES (@id, @userId, @name, @initials, @colour, @favourite, @lead)`)
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE vendor_id = ? AND user_id = ?')
const deleteOne = db.prepare('DELETE FROM vendors WHERE id = ? AND user_id = ?')
const update = db.prepare('UPDATE vendors SET name=@name, initials=@initials, colour=@colour, favourite=@favourite, lead=@lead WHERE id=@id AND user_id=@userId')

/* Aliases: the other strings a vendor resolves from (see migrations/002 and
   lib/findOrCreate.js). Owned by the vendor row -- deleting the vendor cascades them. */
const selectAllAliases = db.prepare('SELECT vendor_id, name FROM vendor_aliases WHERE user_id = ? ORDER BY name')
const selectAliasesForVendor = db.prepare('SELECT name FROM vendor_aliases WHERE vendor_id = ? AND user_id = ? ORDER BY name')
const selectAliasOwner = db.prepare(`SELECT v.id, v.name FROM vendor_aliases a JOIN vendors v ON v.id = a.vendor_id
	WHERE a.user_id = ? AND lower(a.name) = lower(?)`)
const insertAlias = db.prepare('INSERT INTO vendor_aliases (id, user_id, vendor_id, name) VALUES (?, ?, ?, ?)')
const deleteAliasesForVendor = db.prepare('DELETE FROM vendor_aliases WHERE vendor_id = ? AND user_id = ?')

const aliasesFor = (userId, vendorId) => selectAliasesForVendor.all(vendorId, userId).map(r => r.name)

/** One rule for a submitted alias list, wherever it arrives from (create, edit, the scan
    review's learned alias). Trims, drops empties, folds case-insensitive duplicates, and
    answers either the clean list or the sentence refusing it -- an alias may not repeat the
    vendor's own name, and may not be another vendor's name or alias, because resolution
    reads each string back to exactly one vendor. */
function cleanAliases(userId, vendorId, vendorName, raw) {
	if (!Array.isArray(raw)) return { status: 400, error: 'Aliases must be a list of names.' }
	const seen = new Set()
	const aliases = []
	for (const value of raw) {
		const name = String(value ?? '').trim()
		if (!name) continue
		if (name.length > 80) return { status: 400, error: '80 characters at most for an alias.' }
		if (name.toLowerCase() === vendorName.toLowerCase())
			return { status: 400, error: `An alias must differ from the vendor's own name.` }
		if (seen.has(name.toLowerCase())) continue
		seen.add(name.toLowerCase())
		const clash = selectByNameExists.get(userId, name)
		if (clash && clash.id !== vendorId)
			return { status: 409, error: `You already have a vendor called ${name}.` }
		const owner = selectAliasOwner.get(userId, name)
		if (owner && owner.id !== vendorId)
			return { status: 409, error: `${name} is already an alias of ${owner.name}.` }
		aliases.push(name)
	}
	return { aliases }
}

/** Replaces a vendor's stored alias set with the validated list -- delete-and-reinsert, the
    same shape as an order's categories: nothing references an alias row by id. */
const writeAliases = db.transaction((userId, vendorId, aliases) => {
	deleteAliasesForVendor.run(vendorId, userId)
	for (const name of aliases) insertAlias.run(newId('va'), userId, vendorId, name)
})

/** The vendor row write and its alias rewrite, as one commit. Run separately they committed
    separately, so a failure between them left a renamed vendor whose old name had not become
    an alias -- receipts carrying it would stop resolving. writeAliases nests as a savepoint
    inside this, so it stays callable on its own where nothing else is written. */
const saveVendor = db.transaction((writeRow, userId, vendorId, aliases) => {
	writeRow()
	writeAliases(userId, vendorId, aliases)
})

const withStats = (vendor, stats, aliases = []) => {
	const s = stats.get(vendor.id) ?? { orders: 0, spend: 0, saved: 0, latest: null }
	return {
		id: vendor.id, name: vendor.name, initials: vendor.initials, colour: vendor.colour,
		favourite: Boolean(vendor.favourite), lead: vendor.lead ?? undefined,
		aliases,
		orders: s.orders, spend: s.spend, saved: s.saved,
		// null for a vendor with no orders, which is the one case the card's "None" is for.
		latest: s.latest ? { date: fromEpoch(s.latest.date), items: s.latest.items, total: s.latest.total } : null
	}
}

router.get('/', (req, res) => {
	const stats = vendorStats(req.user.id)
	const aliasesBy = new Map()
	for (const row of selectAllAliases.all(req.user.id)) {
		if (!aliasesBy.has(row.vendor_id)) aliasesBy.set(row.vendor_id, [])
		aliasesBy.get(row.vendor_id).push(row.name)
	}
	res.json(selectAll.all(req.user.id).map(v => withStats(v, stats, aliasesBy.get(v.id) ?? [])))
})

router.post('/', (req, res) => {
	const name = String(req.body?.name ?? '').trim()
	if (!name) return res.status(400).json({ error: 'A vendor needs a name.' })
	if (selectByNameExists.get(req.user.id, name))
		return res.status(409).json({ error: `You already have a vendor called ${name}.` })
	const nameAsAlias = selectAliasOwner.get(req.user.id, name)
	if (nameAsAlias)
		return res.status(409).json({ error: `${name} is already an alias of ${nameAsAlias.name}.` })

	const look = req.body?.look ?? {}
	const cleaned = cleanAliases(req.user.id, null, name, look.aliases ?? [])
	if (cleaned.error) return res.status(cleaned.status).json({ error: cleaned.error })

	const vendor = {
		id: newId('v'), userId: req.user.id, name,
		initials: look.initials ?? name.slice(0, 2).toUpperCase(),
		colour: look.colour ?? colourFor(name),
		favourite: look.favourite ? 1 : 0, lead: look.lead ?? null
	}
	saveVendor(() => insert.run(vendor), req.user.id, vendor.id, cleaned.aliases)
	// Read back rather than echoed, so the answer holds the stored order (alphabetical).
	res.status(201).json(withStats({ ...vendor, favourite: vendor.favourite }, new Map(), aliasesFor(req.user.id, vendor.id)))
})

/* One vendor's stats, not vendorStats' whole-account rollup read for one entry -- the map
   groups all 50,000 of a big account's orders (~25ms) to render a single record this reads
   in ~2ms from that vendor's own indexed rows (lib/aggregate.js). */
const statsForOne = (userId, vendorId) => new Map([[vendorId, vendorStatsFor(userId, vendorId)]])

router.get('/:id', (req, res) => {
	const vendor = selectOne.get(req.params.id, req.user.id)
	if (!vendor) return res.status(404).json({ error: 'No vendor ' + req.params.id })
	res.json(withStats(vendor, statsForOne(req.user.id, vendor.id), aliasesFor(req.user.id, vendor.id)))
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
		const owner = selectAliasOwner.get(req.user.id, nextName)
		if (owner && owner.id !== vendor.id)
			return res.status(409).json({ error: `${nextName} is already an alias of ${owner.name}.` })
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
	const cleaned = cleanAliases(req.user.id, vendor.id, nextName, submitted)
	if (cleaned.error) return res.status(cleaned.status).json({ error: cleaned.error })

	const next = {
		name: nextName,
		initials: patch.initials ?? vendor.initials,
		colour: patch.colour ?? vendor.colour,
		favourite: patch.favourite != null ? (patch.favourite ? 1 : 0) : vendor.favourite,
		lead: patch.lead !== undefined ? patch.lead : vendor.lead
	}
	saveVendor(() => update.run({ ...next, id: vendor.id, userId: req.user.id }),
		req.user.id, vendor.id, cleaned.aliases)
	res.json(withStats(selectOne.get(vendor.id, req.user.id), statsForOne(req.user.id, vendor.id), aliasesFor(req.user.id, vendor.id)))
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
