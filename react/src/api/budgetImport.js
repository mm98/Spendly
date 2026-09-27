import { readWorkbook } from './xlsx.js'

/* The budget workbook's own layout: one sheet per year, named by the year, the month names
   across one row, and to the left of January the account, the row's name and the group heading. */

const SECTIONS = { income: /^(indtægter|income)$/i, expense: /^(udgifter|expenses|costs)$/i }
const FALLBACK_GROUP = { income: 'Income', expense: 'Costs' }

const round2 = n => Math.round(Number((n * 100).toPrecision(15))) / 100
const text = cell => (typeof cell?.value === 'string' ? cell.value.trim() : '')

function findMonthRow(rows) {
	for (let r = 0; r < Math.min(rows.length, 30); r++) {
		const column = (rows[r] ?? []).findIndex(cell => /^jan/i.test(text(cell)))
		if (column >= 2) return { row: r, column }
	}
	return null
}

/** One sheet's groups, or null when the sheet has no row naming the months. */
function readYear(rows) {
	const head = findMonthRow(rows)
	if (!head) return null
	const [groupColumn, nameColumn, accountColumn] = [head.column - 3, head.column - 2, head.column - 1]
	const groups = []
	let kind = 'expense', group = null, skipped = 0

	for (const row of rows.slice(head.row + 1)) {
		const name = text(row?.[nameColumn])
		const label = text(row?.[groupColumn])
		if (!name) {
			const section = Object.keys(SECTIONS).find(key => SECTIONS[key].test(label))
			if (section) { kind = section; group = null } else if (label) groups.push(group = { kind, name: label, lines: [] })
			continue
		}
		if (!group) groups.push(group = { kind, name: FALLBACK_GROUP[kind], lines: [] })
		const months = Array.from({ length: 12 }, (_, m) => {
			const cell = row[head.column + m]
			if (!cell) return { expected: null, real: null }
			if (typeof cell.value !== 'number' || cell.value < 0) { skipped++; return { expected: null, real: null } }
			return cell.light ? { expected: round2(cell.value), real: null } : { expected: null, real: round2(cell.value) }
		})
		group.lines.push({ name, account: text(row[accountColumn]), months })
	}
	// Headings after the last row are the sheet's own totals, and they carry no rows.
	return { groups: groups.filter(g => g.lines.length), skipped }
}

/** The years in the file, newest first, plus the sheets that are not a year and the cells
    that held something other than an amount. */
export async function budgetFromFile(file) {
	const years = [], left = []
	let skipped = 0
	for (const sheet of await readWorkbook(file)) {
		const name = sheet.name.trim()
		const year = /^\d{4}$/.test(name) ? Number(name) : null
		const read = year >= 1900 && year <= 2200 ? readYear(sheet.rows) : null
		if (read?.groups.length) {
			years.push({ year, groups: read.groups })
			skipped += read.skipped
		} else left.push(name)
	}
	return { years: years.sort((a, b) => b.year - a.year), left, skipped }
}
