import { db } from '../db.js'
import { readYear } from './budget.js'
import { moneyPaid } from './moneyPaid.js'

// up to this many rows in a group, vendors in a category and categories in Spending; more join the smallest into Other (4h)
const MOST_SHOWN = 6

// each order once, under its first category by name, as Stacked counts it; MIN(c.name) makes the bare
// category_id the one of that name
const selectSpending = db.prepare(`
	SELECT category_id, category_name, vendor_id, v.name AS vendor_name, SUM(total) AS spent FROM (
		SELECT ot.total, ot.vendor_id, oc.category_id, MIN(c.name) AS category_name
		FROM orders ot
		LEFT JOIN order_categories oc ON oc.order_id = ot.id
		LEFT JOIN categories c ON c.id = oc.category_id
		WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to AND ${moneyPaid('ot.')} AND ot.exclude_from_stats = 0
		GROUP BY ot.id)
	JOIN vendors v ON v.id = vendor_id
	GROUP BY category_id, vendor_id
`)

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`
const epochOf = (year, month) => Date.UTC(year, month - 1, 1) / 1000
// the first second after a month: Date.UTC rolls month 13 into the next January
const afterMonth = (year, month) => Date.UTC(year, month, 1) / 1000

/** Every month from `from` to `to`, both YYYY-MM, as [year, month] pairs. */
function monthsBetween(from, to) {
	const out = []
	let [y, m] = from.split('-').map(Number)
	const [ty, tm] = to.split('-').map(Number)
	while (y < ty || (y === ty && m <= tm)) {
		out.push([y, m])
		if (++m > 12) { m = 1; y++ }
	}
	return out
}

/** The largest `MOST_SHOWN - 1` keep their place; the rest are one Other at the end, listing them. */
function joinSmall(items, otherId) {
	if (items.length <= MOST_SHOWN) return items
	const kept = new Set([...items].sort((a, b) => b.value - a.value).slice(0, MOST_SHOWN - 1))
	const rest = items.filter(i => !kept.has(i))
	return [
		...items.filter(i => kept.has(i)),
		{ id: otherId, other: true, value: rest.reduce((a, i) => a + i.value, 0), joined: rest.map(({ name, value }) => ({ name, value })) }
	]
}

const byValue = (a, b) => b.value - a.value
const sum = items => items.reduce((a, i) => a + i.value, 0)

/** The chart's whole answer for the months `from` to `to` (YYYY-MM): null when no year they touch has a sheet. */
export function cashFlow(userId, from, to) {
	const months = monthsBetween(from, to)
	const sheets = new Map()
	for (const [year] of months) if (!sheets.has(year)) sheets.set(year, readYear(userId, year))
	if (![...sheets.values()].some(Boolean)) return null

	// the accounts list is the same in every year; the newest sheet's copy is as good as any
	const accounts = [...sheets.values()].filter(Boolean).at(-1).accounts
	const income = new Map()
	// account id (or '' for none) > group key > { name, lines: series id > { name, value } }
	const costs = new Map()
	for (const [year, month] of months) {
		const sheet = sheets.get(year)
		if (!sheet) continue
		for (const group of sheet.groups) {
			for (const line of group.lines) {
				const { expected, real } = line.months[month - 1]
				// the real amount once entered, else the expected one, as Budget shows it
				const value = real ?? expected ?? 0
				if (!value) continue
				const account = line.accountId ?? ''
				if (group.kind === 'income') {
					income.set(account, (income.get(account) ?? 0) + value)
					continue
				}
				if (!costs.has(account)) costs.set(account, new Map())
				const groups = costs.get(account)
				// a period across a new year joins the same group and row of both sheets
				const groupKey = group.name.trim().toLocaleLowerCase('da')
				if (!groups.has(groupKey)) groups.set(groupKey, { id: `${account}:${groupKey}`, name: group.name, lines: new Map() })
				const lines = groups.get(groupKey).lines
				const seen = lines.get(line.seriesId) ?? { id: `${account}:${groupKey}:${line.seriesId}`, name: line.name, value: 0 }
				seen.value += value
				lines.set(line.seriesId, seen)
			}
		}
	}

	const accountOrder = [...accounts.map(a => a.id), '']
	const nameOf = id => accounts.find(a => a.id === id)?.name ?? null
	const branches = accountOrder.filter(id => costs.has(id)).map(id => {
		const groups = [...costs.get(id).values()]
			.map(g => {
				const lines = [...g.lines.values()].filter(l => l.value > 0)
				return { id: g.id, name: g.name, value: sum(lines), rows: lines.length, lines: joinSmall(lines, `${g.id}:other`) }
			})
			.filter(g => g.value > 0)
		return { id: `account:${id}`, name: nameOf(id), value: sum(groups), groups }
	}).filter(b => b.value > 0)

	const spent = selectSpending.all({ userId, from: epochOf(...months[0]), to: afterMonth(...months.at(-1)) })
	const categories = new Map()
	for (const r of spent) {
		if (!(r.spent > 0)) continue
		const key = r.category_id ?? ''
		if (!categories.has(key)) categories.set(key, { id: `category:${key}`, name: r.category_id ? r.category_name : null, lines: [] })
		categories.get(key).lines.push({ id: `category:${key}:${r.vendor_id}`, name: r.vendor_name, value: r.spent })
	}
	const groups = [...categories.values()]
		.map(c => {
			const lines = c.lines.sort(byValue)
			return { ...c, value: sum(lines), rows: lines.length, lines: joinSmall(lines, `${c.id}:other`) }
		})
		.sort(byValue)
	const shown = groups.length <= MOST_SHOWN ? groups : groups.slice(0, MOST_SHOWN - 1)
	if (groups.length > MOST_SHOWN) {
		const rest = groups.slice(MOST_SHOWN - 1)
		const vendors = new Map()
		for (const l of rest.flatMap(g => g.lines.flatMap(v => (v.other ? v.joined.map(j => ({ ...j, id: `${g.id}:${j.name}` })) : [v])))) {
			const seen = vendors.get(l.name) ?? { id: `other-categories:${l.name}`, name: l.name, value: 0 }
			seen.value += l.value
			vendors.set(l.name, seen)
		}
		const lines = [...vendors.values()].sort(byValue)
		shown.push({ id: 'other-categories', otherCategories: true, name: null, value: sum(rest), rows: lines.length, joined: rest.map(({ name, value }) => ({ name, value })), lines: joinSmall(lines, 'other-categories:other') })
	}
	if (shown.length) branches.push({ id: 'spending', spending: true, name: null, value: sum(shown), groups: shown })

	return {
		from: monthKey(...months[0]),
		to: monthKey(...months.at(-1)),
		income: accountOrder.filter(id => income.get(id) > 0).map(id => ({ id: `income:${id}`, name: nameOf(id), value: income.get(id) })),
		branches
	}
}
