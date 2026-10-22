import { isNumber, paragraphsOf, tablesOf } from './document.js'

// a cell a spreadsheet would read as a formula is kept as text
const csvCell = value => {
	if (value === null || value === undefined) return ''
	if (isNumber(value)) return String(value)
	const text = /^[=+\-@\t\r]/.test(String(value)) ? `'${value}` : String(value)
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function build(doc) {
	const table = tablesOf(doc)[0]?.table ?? { columns: [{ name: doc.title, kind: 'text' }], rows: doc.sections.flatMap(s => paragraphsOf(s.text).map(p => [p])) }
	const lines = [table.columns.map(c => csvCell(c.name)), ...table.rows.map(r => table.columns.map((_, i) => csvCell(r[i])))]
	// the mark at the start tells a spreadsheet the letters are UTF-8, so æ, ø and å survive
	return Buffer.from('﻿' + lines.map(l => l.join(',')).join('\r\n') + '\r\n', 'utf8')
}

// the first table only, comma between cells, a dot in numbers
export const csv = { type: 'csv', name: 'CSV', word: 'CSV', mime: 'text/csv; charset=utf-8', note: 'In a CSV only the first table is kept.', build }
