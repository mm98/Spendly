import { db } from '../db.js'
import { fromEpoch } from './dates.js'
import { resolveVendor } from './findOrCreate.js'
import { MATCHERS, asciiNeedle, escapeLike, vendorIdsMatching } from './textSearch.js'
import { countsOnly, listOf, nameOrder, pageOf } from './listPage.js'
import { vendorKey } from './names.js'
import { lookalikePairs, vendorsAlikeTo, vendorsLike } from './vendorLookalikes.js'

/* A page of the account's vendors (GET /api/vendors with page, pageSize, ids, name or like): the
   filter, the order and the page boundary are the server's, so no reader holds the whole list. */

const counted = value => `CASE WHEN status_type IN ('draft', 'cancelled') OR exclude_from_stats = 1 THEN 0 ELSE ${value} END`
const STATS = `SELECT vendor_id, COUNT(*) AS orders, SUM(${counted('total')}) AS spend, SUM(${counted('saved')}) AS saved, MAX(date) AS last
	FROM orders WHERE user_id = @userId`

/* `stats` sorts read the account's grouped orders once; `fav` puts favourites first; `byName` is
   ordered by nameOrder. Ties go to the name as stored. */
const SORTS = {
	'name-asc': { fav: true, byName: true },
	// a picker's plain alphabetical list
	'name': { byName: true },
	'spend-desc': { fav: true, stats: true, by: 'COALESCE(s.spend, 0) DESC, v.name' },
	'spend-asc': { fav: true, stats: true, by: 'COALESCE(s.spend, 0) ASC, v.name' },
	'orders-desc': { fav: true, stats: true, by: 'COALESCE(s.orders, 0) DESC, v.name' },
	'saved-desc': { fav: true, stats: true, by: 'COALESCE(s.saved, 0) DESC, v.name' },
	'saved-asc': { fav: true, stats: true, by: 'COALESCE(s.saved, 0) ASC, v.name' },
	// the order list's filter rail: most used first
	'use': { stats: true, by: 'COALESCE(s.orders, 0) DESC, v.name' },
	// the merge picker: the most recently used first
	'recent': { stats: true, by: 's.last IS NULL, s.last DESC, v.name' }
}

export const LOOKALIKES = 'possible-duplicate'

const selectRows = db.prepare(`SELECT id, name, colour, favourite, archived, origin, default_exclude_from_stats FROM vendors
	WHERE user_id = @userId AND id IN (SELECT value FROM json_each(@ids))`)
const selectStats = db.prepare(`${STATS} AND vendor_id IN (SELECT value FROM json_each(@ids)) GROUP BY vendor_id`)
// a page's names are few, so groupNames orders them rather than a sort in SQL
const selectAliases = db.prepare(`SELECT vendor_id, name FROM vendor_aliases
	WHERE user_id = @userId AND vendor_id IN (SELECT value FROM json_each(@ids))`)
const selectDefaults = db.prepare(`SELECT d.vendor_id, c.name FROM vendor_default_categories d
	JOIN categories c ON c.id = d.category_id
	WHERE c.user_id = @userId AND d.vendor_id IN (SELECT value FROM json_each(@ids))`)
const selectActive = db.prepare('SELECT id, name, favourite FROM vendors WHERE user_id = ? AND archived = 0')
const selectAccountNames = db.prepare('SELECT name FROM vendors WHERE user_id = ?')
const selectAccountAliases = db.prepare('SELECT name FROM vendor_aliases WHERE user_id = ?')
const selectNames = db.prepare('SELECT id, name FROM vendors WHERE user_id = @userId AND id IN (SELECT value FROM json_each(@ids))')

/** Names by vendor id, each vendor's in the order SQLite's ORDER BY name gives. */
const groupNames = rows => {
	const by = new Map()
	for (const { vendor_id: id, name } of rows) by.set(id, [...(by.get(id) ?? []), name])
	for (const names of by.values()) names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
	return by
}

/** The page's rows, in `ids` order: what the list, the pickers and the filters read of a vendor. */
function rowsFor(userId, ids, { duplicates = null, defaults = false, brief = false } = {}) {
	if (!ids.length) return []
	const params = { userId, ids: JSON.stringify(ids) }
	const byId = new Map(selectRows.all(params).map(v => [v.id, v]))
	// shape=brief: who the vendor is, for a lookup or a mark, with nothing counted
	if (brief) return ids.filter(id => byId.has(id)).map(id => {
		const v = byId.get(id)
		return { id, name: v.name, colour: v.colour, favourite: Boolean(v.favourite), archived: Boolean(v.archived) }
	})
	const stats = new Map(selectStats.all(params).map(s => [s.vendor_id, s]))
	const aliases = groupNames(selectAliases.all(params))
	const defaultsBy = defaults ? groupNames(selectDefaults.all(params)) : null
	const keeps = duplicates ? [...new Set(ids.map(id => duplicates.get(id)).filter(Boolean))] : []
	const keepNames = keeps.length ? new Map(selectNames.all({ userId, ids: JSON.stringify(keeps) }).map(v => [v.id, v.name])) : null
	return ids.filter(id => byId.has(id)).map(id => {
		const v = byId.get(id)
		const s = stats.get(id) ?? { orders: 0, spend: 0, saved: 0, last: null }
		const duplicateOf = duplicates?.get(id) ?? null
		return {
			id, name: v.name, colour: v.colour, favourite: Boolean(v.favourite), archived: Boolean(v.archived),
			createdByScan: v.origin === 'scan', aliases: aliases.get(id) ?? [],
			orders: s.orders, spend: s.spend, saved: s.saved, lastOrder: s.last ? fromEpoch(s.last) : null,
			...(duplicates ? { duplicateOf, duplicateName: duplicateOf ? keepNames.get(duplicateOf) ?? null : null } : {}),
			...(defaults ? { defaultCategories: defaultsBy.get(id) ?? [], defaultExcludeFromStats: Boolean(v.default_exclude_from_stats) } : {})
		}
	})
}

/** Ids already ranked in JS (a name lookup, a look-alike ranking), paged as a list is. */
function pageOfRanked(userId, q, ranked, options) {
	const { limit, offset } = pageOf(q, ranked.length)
	return { vendors: rowsFor(userId, ranked.slice(offset, offset + limit), options), matched: ranked.length }
}

export function vendorPage(userId, q, languages = []) {
	const except = q.except ? String(q.except) : null
	const brief = q.shape === 'brief'
	const duplicates = q.with === 'duplicates' || q.flag === LOOKALIKES
		? new Map(lookalikePairs(userId).map(p => [p.merge, p.keep])) : null

	// the vendor a string files under, as receipts and orders are matched: one row or none
	if (q.name !== undefined) {
		const found = resolveVendor(userId, q.name, except)
		return pageOfRanked(userId, q, found ? [found.id] : [], { duplicates, defaults: true, brief })
	}
	if (q.like !== undefined)
		return pageOfRanked(userId, q, vendorsLike(userId, { name: String(q.like), aliases: String(q.aka ?? '').split('\n').filter(Boolean), except }), { duplicates, brief })

	const sort = Object.hasOwn(SORTS, q.sort) ? SORTS[q.sort] : SORTS['name-asc']
	const where = ['v.user_id = @userId']
	const params = { userId }
	if (q.archived !== 'all') where.push(q.archived === 'yes' ? 'v.archived = 1' : 'v.archived = 0')
	const ids = listOf(q.ids)
	if (q.ids !== undefined) { where.push('v.id IN (SELECT value FROM json_each(@ids))'); params.ids = JSON.stringify(ids) }
	if (except) { where.push('v.id <> @except'); params.except = except }
	const needle = String(q.query ?? '').trim().toLowerCase()
	if (needle) {
		const match = MATCHERS[asciiNeedle(needle) ? 'ascii' : 'fold']
		params.needle = asciiNeedle(needle) ? `%${escapeLike(needle)}%` : needle
		where.push(`v.id IN (${vendorIdsMatching(match)})`)
	}

	const statsJoin = `LEFT JOIN (${STATS} GROUP BY vendor_id) s ON s.vendor_id = v.id`
	const order = `${sort.fav ? 'v.favourite DESC, ' : ''}${sort.by}`
	// the name order is the reader's alphabet, so the ranking it pages by is made here
	const byName = (rows, lead = () => 0) => {
		const compare = nameOrder(languages)
		return rows.sort((a, b) => lead(a) - lead(b) || (sort.fav ? b.favourite - a.favourite : 0) || compare(a.name, b.name)).map(r => r.id)
	}
	const rankedSql = sort.byName
		? `SELECT json_extract(value, '$[0]') AS id, json_extract(value, '$[1]') AS r FROM json_each(@ranks)`
		: `SELECT v.id, ROW_NUMBER() OVER (ORDER BY ${order}) AS r FROM vendors v ${sort.stats ? statsJoin : ''}
			WHERE v.user_id = @userId AND v.archived = 0`
	let sql
	if (q.flag === LOOKALIKES && q.archived !== 'yes') {
		/* The look-alike view (10a): each kept vendor at its place `r` in the list's order, its duplicates
		   after it in that order; a vendor in two places is shown at the first. */
		params.pairs = JSON.stringify([...duplicates].map(([merge, keep]) => [merge, keep]))
		if (sort.byName) params.ranks = JSON.stringify(byName(selectActive.all(userId)).map((id, r) => [id, r + 1]))
		sql = `WITH ranked AS (${rankedSql}), pairs AS (
				SELECT json_extract(value, '$[0]') AS merge, json_extract(value, '$[1]') AS keep FROM json_each(@pairs)
			), slots AS (
				SELECT k.id, k.r AS g, 0 AS i FROM ranked k WHERE k.id IN (SELECT keep FROM pairs)
				UNION ALL SELECT m.id, k.r, m.r FROM pairs p JOIN ranked m ON m.id = p.merge JOIN ranked k ON k.id = p.keep
			), placed AS (SELECT id, MIN(g * 1000000000 + i) AS at FROM slots GROUP BY id)
			SELECT v.id FROM placed JOIN vendors v ON v.id = placed.id WHERE ${where.join(' AND ')}`
		// every vendor of a pair is an active one, so the count needs no ranking
		const paired = JSON.stringify([...new Set([...duplicates].flat())])
		const matched = db.prepare(`SELECT COUNT(*) c FROM vendors v WHERE ${where.join(' AND ')} AND v.id IN (SELECT value FROM json_each(@paired))`)
			.get({ ...params, paired }).c
		const { limit, offset } = pageOf(q, matched)
		const page = db.prepare(`${sql} ORDER BY placed.at LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset })
		return { vendors: rowsFor(userId, page.map(r => r.id), { duplicates, brief }), matched }
	}

	// the merge picker: the vendors this one looks like lead (5a)
	let lead = ''
	const alike = q.near ? vendorsAlikeTo(userId, String(q.near)) : []
	if (q.near) {
		params.alike = JSON.stringify(alike)
		lead = 'v.id NOT IN (SELECT value FROM json_each(@alike)), '
	}
	if (sort.byName) {
		const found = db.prepare(`SELECT v.id, v.name, v.favourite FROM vendors v WHERE ${where.join(' AND ')}`).all(params)
		if (countsOnly(q)) return { vendors: [], matched: found.length }
		return pageOfRanked(userId, q, byName(found, v => (alike.includes(v.id) ? 0 : 1)), { duplicates, brief })
	}
	const matched = db.prepare(`SELECT COUNT(*) c FROM vendors v WHERE ${where.join(' AND ')}`).get(params).c
	const { limit, offset } = pageOf(q, matched)
	sql = `SELECT v.id FROM vendors v ${sort.stats ? statsJoin : ''} WHERE ${where.join(' AND ')}
		ORDER BY ${lead}${order} LIMIT @limit OFFSET @offset`
	const page = db.prepare(sql).all({ ...params, limit, offset })
	return { vendors: rowsFor(userId, page.map(r => r.id), { duplicates, brief }), matched }
}

/** Which of these names a vendor of the account already files under: what an import would not create. */
export function knownVendorNames(userId, names) {
	const held = [...selectAccountNames.all(userId), ...selectAccountAliases.all(userId)].map(r => r.name)
	const exact = new Set(held.map(n => n.toLowerCase()))
	const keys = new Set(held.map(vendorKey).filter(Boolean))
	return names.filter(name => exact.has(name.toLowerCase()) || keys.has(vendorKey(name)))
}
