import { db } from '../db.js'
import { newId } from './ids.js'

export const MONTHS = 12

const emptyMonths = () => Array.from({ length: MONTHS }, () => ({ expected: null, real: null }))

const notFound = what => Object.assign(new Error(`No such ${what}.`), { status: 404 })

/* ---- statements ---- */

const selectYears = db.prepare('SELECT year FROM budget_years WHERE user_id = ? ORDER BY year')
const selectYear = db.prepare('SELECT id, year FROM budget_years WHERE user_id = ? AND year = ?')
const selectGroups = db.prepare('SELECT id, kind, name, position FROM budget_groups WHERE user_id = ? AND year_id = ?')
const selectLines = db.prepare(`SELECT l.id, l.group_id, l.name, l.account_id, l.series_id, l.position, a.month, a.expected, a.real
	FROM budget_lines l LEFT JOIN budget_line_amounts a ON a.line_id = l.id
	WHERE l.user_id = ? AND l.group_id IN (SELECT id FROM budget_groups WHERE user_id = ? AND year_id = ?)`)
const selectAccounts = db.prepare('SELECT id, name, position, grey FROM budget_accounts WHERE user_id = ?')
const selectAccount = db.prepare('SELECT id, name FROM budget_accounts WHERE id = ? AND user_id = ?')
const selectAccountUse = db.prepare('SELECT account_id FROM budget_lines WHERE user_id = ? AND account_id IS NOT NULL')

const selectGroup = db.prepare(`SELECT g.id, g.kind, g.year_id, y.year FROM budget_groups g
	JOIN budget_years y ON y.id = g.year_id WHERE g.id = ? AND g.user_id = ?`)
const selectLine = db.prepare(`SELECT l.id, l.group_id, l.name, l.account_id, l.series_id, g.year_id, y.year FROM budget_lines l
	JOIN budget_groups g ON g.id = l.group_id JOIN budget_years y ON y.id = g.year_id
	WHERE l.id = ? AND l.user_id = ?`)
const selectSiblingGroups = db.prepare(
	'SELECT id, position FROM budget_groups WHERE user_id = ? AND year_id = ? AND kind = ?')
const selectSiblingLines = db.prepare('SELECT id, position FROM budget_lines WHERE user_id = ? AND group_id = ?')
const selectAmount = db.prepare('SELECT expected, real FROM budget_line_amounts WHERE line_id = ? AND month = ?')
const countMonthAmounts = db.prepare(`SELECT count(*) AS due FROM budget_line_amounts WHERE month = ? AND line_id IN
	(SELECT id FROM budget_lines WHERE user_id = ? AND group_id IN (SELECT id FROM budget_groups WHERE user_id = ? AND kind = 'expense' AND year_id =
	(SELECT id FROM budget_years WHERE user_id = ? AND year = ?)))`)

const insertYear = db.prepare('INSERT INTO budget_years (id, user_id, year) VALUES (?, ?, ?)')
const insertGroup = db.prepare(`INSERT INTO budget_groups (id, user_id, year_id, kind, name, position)
	VALUES (?, ?, ?, ?, ?, ?)`)
const insertLine = db.prepare(`INSERT INTO budget_lines (id, user_id, group_id, name, account_id, series_id, position)
	VALUES (?, ?, ?, ?, ?, ?, ?)`)
const selectLineSeries = db.prepare(`SELECT l.name, l.series_id, l.position, g.kind, g.position AS group_position, y.year
	FROM budget_years y JOIN budget_groups g ON g.year_id = y.id JOIN budget_lines l ON l.group_id = g.id
	WHERE y.user_id = ?`)
const insertAccount = db.prepare('INSERT INTO budget_accounts (id, user_id, name, position) VALUES (?, ?, ?, ?)')
const upsertAmount = db.prepare(`INSERT INTO budget_line_amounts (line_id, month, expected, real) VALUES (?, ?, ?, ?)
	ON CONFLICT (line_id, month) DO UPDATE SET expected = excluded.expected, real = excluded.real`)
const deleteAmount = db.prepare('DELETE FROM budget_line_amounts WHERE line_id = ? AND month = ?')

const deleteYearRow = db.prepare('DELETE FROM budget_years WHERE user_id = ? AND year = ?')
const deleteGroupRow = db.prepare('DELETE FROM budget_groups WHERE id = ? AND user_id = ?')
const deleteLineRow = db.prepare('DELETE FROM budget_lines WHERE id = ? AND user_id = ?')
const renameGroup = db.prepare('UPDATE budget_groups SET name = ? WHERE id = ? AND user_id = ?')
const setGroupPosition = db.prepare('UPDATE budget_groups SET position = ? WHERE id = ? AND user_id = ?')
const updateLineText = db.prepare('UPDATE budget_lines SET name = ?, account_id = ? WHERE id = ? AND user_id = ?')
const setLinePlace = db.prepare('UPDATE budget_lines SET group_id = ?, position = ? WHERE id = ? AND user_id = ?')
const renameAccountRow = db.prepare('UPDATE budget_accounts SET name = ? WHERE id = ? AND user_id = ?')
const setAccountGrey = db.prepare('UPDATE budget_accounts SET grey = ? WHERE id = ? AND user_id = ?')
const setAccountPosition = db.prepare('UPDATE budget_accounts SET position = ? WHERE id = ? AND user_id = ?')
const deleteAccountRow = db.prepare('DELETE FROM budget_accounts WHERE id = ? AND user_id = ?')
const selectLinks = db.prepare('SELECT pattern, kind, line_name, line_series_id FROM budget_bank_links WHERE user_id = ?')
const upsertLink = db.prepare(`INSERT INTO budget_bank_links (user_id, pattern, kind, line_name, line_series_id)
	VALUES (?, ?, ?, ?, ?)
	ON CONFLICT (user_id, pattern, kind) DO UPDATE SET line_name = excluded.line_name, line_series_id = excluded.line_series_id`)
const renameLinkedLine = db.prepare('UPDATE budget_bank_links SET line_name = ? WHERE user_id = ? AND line_series_id = ?')
const deleteLinkRow = db.prepare('DELETE FROM budget_bank_links WHERE user_id = ? AND pattern = ? AND kind = ?')

/* ---- reading ---- */

const byPosition = (a, b) => a.position - b.position
const kindOrder = kind => (kind === 'income' ? 0 : 1)

export const listYears = userId => selectYears.all(userId).map(r => r.year)

/** How many cost rows have an amount in one month, paid or not: the payments due then. */
export const countDue = (userId, year, month) => countMonthAmounts.get(month, userId, userId, userId, year).due

/** The account list, in its own order: the one list every year's rows pick from. */
export const listAccounts = userId => selectAccounts.all(userId).sort(byPosition)
	.map(({ id, name, grey }) => ({ id, name, grey: grey === 1 }))

/** The same list, each with how many rows in any year pick it. */
export function listAccountsInUse(userId) {
	const rows = new Map()
	for (const { account_id: id } of selectAccountUse.all(userId)) rows.set(id, (rows.get(id) ?? 0) + 1)
	return listAccounts(userId).map(a => ({ ...a, rows: rows.get(a.id) ?? 0 }))
}

/** One year's sheet: income groups first, then costs, each in its own order. */
export function readYear(userId, year) {
	const found = selectYear.get(userId, year)
	if (!found) return null
	const lines = new Map()
	for (const r of selectLines.all(userId, userId, found.id)) {
		let line = lines.get(r.id)
		if (!line) {
			line = { id: r.id, groupId: r.group_id, name: r.name, accountId: r.account_id, seriesId: r.series_id,
				position: r.position, months: emptyMonths() }
			lines.set(r.id, line)
		}
		if (r.month) line.months[r.month - 1] = { expected: r.expected, real: r.real }
	}
	const groups = selectGroups.all(userId, found.id)
		.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || byPosition(a, b))
		.map(g => ({
			id: g.id, kind: g.kind, name: g.name,
			lines: [...lines.values()].filter(l => l.groupId === g.id).sort(byPosition)
				.map(({ id, name, accountId, seriesId, months }) => ({ id, name, accountId, seriesId, months }))
		}))
	return { year: found.year, groups, accounts: listAccounts(userId) }
}

/* ---- writing ---- */

const writeMonth = (lineId, month, { expected, real }) => {
	if (expected == null && real == null) deleteAmount.run(lineId, month)
	else upsertAmount.run(lineId, month, expected ?? null, real ?? null)
}

// A row with no series of its own starts one.
const addLineRow = (userId, groupId, line, position) => {
	const id = newId('bl')
	insertLine.run(id, userId, groupId, line.name, line.accountId ?? null, line.seriesId ?? id, position)
	line.months?.forEach((m, i) => { if (m.expected != null || m.real != null) writeMonth(id, i + 1, m) })
	return id
}

const addGroupRows = (userId, yearId, group, position) => {
	const id = newId('bg')
	insertGroup.run(id, userId, yearId, group.kind, group.name, position)
	group.lines?.forEach((line, i) => addLineRow(userId, id, line, i))
	return id
}

const lineKey = (kind, name) => `${kind}:${name.trim().toLocaleLowerCase('da')}`

/* The series a written row continues: the stored row of the same kind and name, in the year it
   replaces first, then the newest year. Each series is taken once per year. */
function seriesFinder(userId, year) {
	const stored = selectLineSeries.all(userId).sort((a, b) => (b.year === year) - (a.year === year) || b.year - a.year
		|| a.group_position - b.group_position || a.position - b.position)
	const series = new Map()
	for (const l of stored) if (!series.has(lineKey(l.kind, l.name))) series.set(lineKey(l.kind, l.name), l.series_id)
	const taken = new Set()
	return (kind, name) => {
		const found = series.get(lineKey(kind, name))
		if (!found || taken.has(found)) return null
		taken.add(found)
		return found
	}
}

/** Writes whole years, each replacing a year already stored under the same number. Rows name
    their account; a name the list does not hold yet is added to its end. */
export const replaceYears = db.transaction((userId, years, accounts = []) => {
	const named = [...accounts, ...years.flatMap(y => y.groups.flatMap(g => g.lines.map(l => l.account)))]
	const ids = ensureAccounts(userId, named.filter(Boolean))
	for (const year of years) {
		const seriesOf = seriesFinder(userId, year.year)
		deleteYearRow.run(userId, year.year)
		const yearId = newId('by')
		insertYear.run(yearId, userId, year.year)
		year.groups.forEach((group, i) => addGroupRows(userId, yearId, {
			...group, lines: group.lines.map(l => ({
				...l, accountId: l.account ? ids.get(accountKey(l.account)) : null, seriesId: seriesOf(group.kind, l.name)
			}))
		}, i))
	}
})

/* What a copied month becomes: kept as it is, turned into an expected amount, or left out. */
const COPY = {
	same: m => m,
	expected: m => ({ expected: m.real ?? m.expected, real: null }),
	none: () => ({ expected: null, real: null })
}

/** A new year, copied from another, or with no groups: each side already carries its own heading,
    so a starter group would only repeat it. Refuses a year that is already there. */
export const createYear = db.transaction((userId, year, { from, amounts = 'same' } = {}) => {
	if (selectYear.get(userId, year)) throw Object.assign(new Error(`There is already a budget for ${year}.`), { status: 409 })
	const source = from == null ? null : readYear(userId, from)
	if (from != null && !source) throw notFound('year to copy from')
	const yearId = newId('by')
	insertYear.run(yearId, userId, year)
	const groups = source
		? source.groups.map(g => ({ ...g, lines: g.lines.map(l => ({ ...l, months: l.months.map(COPY[amounts]) })) }))
		: []
	groups.forEach((group, i) => addGroupRows(userId, yearId, group, i))
})

export const deleteYear = (userId, year) => deleteYearRow.run(userId, year).changes > 0

/* Moves one item to `index` among its siblings and numbers them all again, 0 upwards. */
const place = (siblings, id, index, write) => {
	const order = siblings.sort(byPosition).map(s => s.id).filter(s => s !== id)
	order.splice(Math.max(0, Math.min(order.length, index ?? order.length)), 0, id)
	order.forEach((sibling, position) => write(sibling, position))
}

export const addGroup = db.transaction((userId, year, { kind, name }) => {
	const found = selectYear.get(userId, year)
	if (!found) throw notFound('year')
	const id = addGroupRows(userId, found.id, { kind, name }, Number.MAX_SAFE_INTEGER)
	place(selectSiblingGroups.all(userId, found.id, kind), id, null, (g, p) => setGroupPosition.run(p, g, userId))
	return year
})

export const updateGroup = db.transaction((userId, groupId, { name, index }) => {
	const group = selectGroup.get(groupId, userId)
	if (!group) throw notFound('group')
	if (name != null) renameGroup.run(name, groupId, userId)
	if (index != null) place(selectSiblingGroups.all(userId, group.year_id, group.kind), groupId, index,
		(g, p) => setGroupPosition.run(p, g, userId))
	return group.year
})

export function deleteGroup(userId, groupId) {
	const group = selectGroup.get(groupId, userId)
	if (!group) throw notFound('group')
	deleteGroupRow.run(groupId, userId)
	return group.year
}

export const addLine = db.transaction((userId, groupId, line) => {
	const group = selectGroup.get(groupId, userId)
	if (!group) throw notFound('group')
	if (line.accountId) checkAccount(userId, line.accountId)
	const id = addLineRow(userId, groupId, line, Number.MAX_SAFE_INTEGER)
	place(selectSiblingLines.all(userId, groupId), id, line.index, (l, p) => setLinePlace.run(groupId, p, l, userId))
	return group.year
})

/** Any of: the name and account, a new place (group and index), all twelve months, or one
    month's expected or real amount alone. */
export const updateLine = db.transaction((userId, lineId, patch) => {
	const line = selectLine.get(lineId, userId)
	if (!line) throw notFound('row')
	if (patch.accountId) checkAccount(userId, patch.accountId)
	if (patch.name != null || patch.accountId !== undefined)
		updateLineText.run(patch.name ?? line.name, patch.accountId !== undefined ? patch.accountId : line.account_id,
			lineId, userId)
	if (patch.name != null && patch.name !== line.name) renameLinkedLine.run(patch.name, userId, line.series_id)
	if (patch.months) patch.months.forEach((m, i) => writeMonth(lineId, i + 1, m))
	if (patch.month != null) {
		const was = selectAmount.get(lineId, patch.month) ?? { expected: null, real: null }
		writeMonth(lineId, patch.month, {
			expected: 'expected' in patch ? patch.expected : was.expected,
			real: 'real' in patch ? patch.real : was.real
		})
	}
	if (patch.groupId != null || patch.index != null) {
		const groupId = patch.groupId ?? line.group_id
		const target = selectGroup.get(groupId, userId)
		if (!target || target.year_id !== line.year_id) throw notFound('group in this year')
		place(selectSiblingLines.all(userId, groupId), lineId, patch.index,
			(l, p) => setLinePlace.run(groupId, p, l, userId))
	}
	return line.year
})

export function deleteLine(userId, lineId) {
	const line = selectLine.get(lineId, userId)
	if (!line) throw notFound('row')
	deleteLineRow.run(lineId, userId)
	return line.year
}

/* ---- accounts ---- */

const accountKey = name => name.trim().toLocaleLowerCase('da')
const refuse = message => Object.assign(new Error(message), { status: 400 })

function checkAccount(userId, id) {
	if (!selectAccount.get(id, userId)) throw notFound('account')
}

const refuseTwin = (userId, name, id) => {
	const twin = listAccounts(userId).find(a => a.id !== id && accountKey(a.name) === accountKey(name))
	if (twin) throw refuse(`You already have an account called ${twin.name}.`)
}

/** Finds each name in the list, adding the ones it does not hold to the end of it. */
function ensureAccounts(userId, names) {
	const ids = new Map(listAccounts(userId).map(a => [accountKey(a.name), a.id]))
	let position = ids.size
	for (const name of names) {
		if (ids.has(accountKey(name))) continue
		const id = newId('ba')
		insertAccount.run(id, userId, name.trim(), position++)
		ids.set(accountKey(name), id)
	}
	return ids
}

export const addAccount = db.transaction((userId, name, grey = false) => {
	refuseTwin(userId, name)
	const id = ensureAccounts(userId, [name]).get(accountKey(name))
	if (grey) setAccountGrey.run(1, id, userId)
})

export const updateAccount = db.transaction((userId, id, { name, grey, index }) => {
	checkAccount(userId, id)
	if (grey != null) setAccountGrey.run(grey ? 1 : 0, id, userId)
	if (name != null) {
		refuseTwin(userId, name, id)
		renameAccountRow.run(name, id, userId)
	}
	if (index != null) place(selectAccounts.all(userId), id, index, (a, p) => setAccountPosition.run(p, a, userId))
})

export function deleteAccount(userId, id) {
	checkAccount(userId, id)
	deleteAccountRow.run(id, userId)
}

/* ---- bank payments the reader has placed ---- */

/** What each remembered payment text is in the budget: a row's series and name, or null for none. */
export const listLinks = userId => selectLinks.all(userId)
	.map(({ pattern, kind, line_name: line, line_series_id: lineSeriesId }) => ({ pattern, kind, line, lineSeriesId }))

/** Places a payment text on the row `lineId`, which finds that row in every year; null leaves it out. */
export function saveLink(userId, { pattern, kind, lineId }) {
	const line = lineId == null ? null : selectLine.get(lineId, userId)
	if (lineId != null && !line) throw notFound('row')
	upsertLink.run(userId, pattern, kind, line?.name ?? null, line?.series_id ?? null)
}

export const forgetLink = (userId, { pattern, kind }) => deleteLinkRow.run(userId, pattern, kind)
