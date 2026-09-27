import { db } from '../db.js'
import { newId } from './ids.js'

export const MONTHS = 12

const emptyMonths = () => Array.from({ length: MONTHS }, () => ({ expected: null, real: null }))

const notFound = what => Object.assign(new Error(`No such ${what}.`), { status: 404 })

/* ---- statements ---- */

const selectYears = db.prepare('SELECT year FROM budget_years WHERE user_id = ? ORDER BY year')
const selectYear = db.prepare('SELECT id, year FROM budget_years WHERE user_id = ? AND year = ?')
const selectGroups = db.prepare('SELECT id, kind, name, position FROM budget_groups WHERE user_id = ? AND year_id = ?')
const selectLines = db.prepare(`SELECT l.id, l.group_id, l.name, l.account, l.position, a.month, a.expected, a.real
	FROM budget_lines l LEFT JOIN budget_amounts a ON a.line_id = l.id
	WHERE l.user_id = ? AND l.group_id IN (SELECT id FROM budget_groups WHERE user_id = ? AND year_id = ?)`)
// Every account any year names, so a row in a new year can pick one it used before.
const selectAccounts = db.prepare("SELECT account FROM budget_lines WHERE user_id = ? AND account <> ''")

const selectGroup = db.prepare(`SELECT g.id, g.kind, g.year_id, y.year FROM budget_groups g
	JOIN budget_years y ON y.id = g.year_id WHERE g.id = ? AND g.user_id = ?`)
const selectLine = db.prepare(`SELECT l.id, l.group_id, l.name, l.account, g.year_id, y.year FROM budget_lines l
	JOIN budget_groups g ON g.id = l.group_id JOIN budget_years y ON y.id = g.year_id
	WHERE l.id = ? AND l.user_id = ?`)
const selectSiblingGroups = db.prepare(
	'SELECT id, position FROM budget_groups WHERE user_id = ? AND year_id = ? AND kind = ?')
const selectSiblingLines = db.prepare('SELECT id, position FROM budget_lines WHERE user_id = ? AND group_id = ?')
const selectAmount = db.prepare('SELECT expected, real FROM budget_amounts WHERE line_id = ? AND month = ?')

const insertYear = db.prepare('INSERT INTO budget_years (id, user_id, year) VALUES (?, ?, ?)')
const insertGroup = db.prepare(`INSERT INTO budget_groups (id, user_id, year_id, kind, name, position)
	VALUES (?, ?, ?, ?, ?, ?)`)
const insertLine = db.prepare(`INSERT INTO budget_lines (id, user_id, group_id, name, account, position)
	VALUES (?, ?, ?, ?, ?, ?)`)
const upsertAmount = db.prepare(`INSERT INTO budget_amounts (line_id, month, expected, real) VALUES (?, ?, ?, ?)
	ON CONFLICT (line_id, month) DO UPDATE SET expected = excluded.expected, real = excluded.real`)
const deleteAmount = db.prepare('DELETE FROM budget_amounts WHERE line_id = ? AND month = ?')

const deleteYearRow = db.prepare('DELETE FROM budget_years WHERE user_id = ? AND year = ?')
const deleteGroupRow = db.prepare('DELETE FROM budget_groups WHERE id = ? AND user_id = ?')
const deleteLineRow = db.prepare('DELETE FROM budget_lines WHERE id = ? AND user_id = ?')
const renameGroup = db.prepare('UPDATE budget_groups SET name = ? WHERE id = ? AND user_id = ?')
const setGroupPosition = db.prepare('UPDATE budget_groups SET position = ? WHERE id = ? AND user_id = ?')
const updateLineText = db.prepare('UPDATE budget_lines SET name = ?, account = ? WHERE id = ? AND user_id = ?')
const setLinePlace = db.prepare('UPDATE budget_lines SET group_id = ?, position = ? WHERE id = ? AND user_id = ?')
const deleteAllYears = db.prepare('DELETE FROM budget_years WHERE user_id = ?')

/* ---- reading ---- */

const byPosition = (a, b) => a.position - b.position
const kindOrder = kind => (kind === 'income' ? 0 : 1)

export const listYears = userId => selectYears.all(userId).map(r => r.year)

export function listAccounts(userId) {
	const names = new Set(selectAccounts.all(userId).map(r => r.account))
	return [...names].sort((a, b) => a.localeCompare(b, 'da'))
}

/** One year's sheet: income groups first, then costs, each in its own order. */
export function readYear(userId, year) {
	const found = selectYear.get(userId, year)
	if (!found) return null
	const lines = new Map()
	for (const r of selectLines.all(userId, userId, found.id)) {
		let line = lines.get(r.id)
		if (!line) {
			line = { id: r.id, groupId: r.group_id, name: r.name, account: r.account, position: r.position,
				months: emptyMonths() }
			lines.set(r.id, line)
		}
		if (r.month) line.months[r.month - 1] = { expected: r.expected, real: r.real }
	}
	const groups = selectGroups.all(userId, found.id)
		.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || byPosition(a, b))
		.map(g => ({
			id: g.id, kind: g.kind, name: g.name,
			lines: [...lines.values()].filter(l => l.groupId === g.id).sort(byPosition)
				.map(({ id, name, account, months }) => ({ id, name, account, months }))
		}))
	return { year: found.year, groups, accounts: listAccounts(userId) }
}

/* ---- writing ---- */

const writeMonth = (lineId, month, { expected, real }) => {
	if (expected == null && real == null) deleteAmount.run(lineId, month)
	else upsertAmount.run(lineId, month, expected ?? null, real ?? null)
}

const addLineRow = (userId, groupId, line, position) => {
	const id = newId('bl')
	insertLine.run(id, userId, groupId, line.name, line.account ?? '', position)
	line.months?.forEach((m, i) => { if (m.expected != null || m.real != null) writeMonth(id, i + 1, m) })
	return id
}

const addGroupRows = (userId, yearId, group, position) => {
	const id = newId('bg')
	insertGroup.run(id, userId, yearId, group.kind, group.name, position)
	group.lines?.forEach((line, i) => addLineRow(userId, id, line, i))
	return id
}

/** Writes whole years, replacing any the account already holds under the same number. */
export const replaceYears = db.transaction((userId, years) => {
	for (const year of years) {
		deleteYearRow.run(userId, year.year)
		const yearId = newId('by')
		insertYear.run(yearId, userId, year.year)
		year.groups.forEach((group, i) => addGroupRows(userId, yearId, group, i))
	}
})

/* What a copied month becomes: kept as it is, turned into an expected amount, or left out. */
const COPY = {
	same: m => m,
	expected: m => ({ expected: m.real ?? m.expected, real: null }),
	none: () => ({ expected: null, real: null })
}

/** A new year, empty or copied from another. Refuses a year that is already there. */
export const createYear = db.transaction((userId, year, { from, amounts = 'same' } = {}) => {
	if (selectYear.get(userId, year)) throw Object.assign(new Error(`${year} is already there.`), { status: 409 })
	const source = from == null ? null : readYear(userId, from)
	if (from != null && !source) throw notFound('year to copy from')
	const yearId = newId('by')
	insertYear.run(yearId, userId, year)
	const groups = source
		? source.groups.map(g => ({ ...g, lines: g.lines.map(l => ({ ...l, months: l.months.map(COPY[amounts]) })) }))
		: [{ kind: 'income', name: 'Income', lines: [] }, { kind: 'expense', name: 'Costs', lines: [] }]
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
	const id = addLineRow(userId, groupId, line, Number.MAX_SAFE_INTEGER)
	place(selectSiblingLines.all(userId, groupId), id, line.index, (l, p) => setLinePlace.run(groupId, p, l, userId))
	return group.year
})

/** Any of: the name and account, a new place (group and index), all twelve months, or one
    month's expected or real amount alone. */
export const updateLine = db.transaction((userId, lineId, patch) => {
	const line = selectLine.get(lineId, userId)
	if (!line) throw notFound('row')
	if (patch.name != null || patch.account != null)
		updateLineText.run(patch.name ?? line.name, patch.account ?? line.account, lineId, userId)
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

/** Forgets every year the account holds -- the reset that returns it to a fresh account. */
export const wipeBudget = userId => deleteAllYears.run(userId)
