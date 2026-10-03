// A spreadsheet of orders (CSV or Excel) read in the browser and turned into the orders the import
// route takes. The file itself never leaves the page; only the orders built from it are sent.

import { readWorkbook } from './xlsx.js'
import { DATE_FORMATS, dateFormatsFor, guessDecimal, parseCsv, readAmount, readDate, readText } from './bankStatement.js'

/** The rows of the file's first sheet, as plain text cells; the first row is the column names. */
export async function readSheet(file) {
	if (/\.xlsx$/i.test(file.name)) {
		const sheets = await readWorkbook(file)
		const sheet = sheets.find(s => s.rows.some(r => r?.some(c => c?.value != null))) ?? sheets[0]
		if (!sheet) return []
		return sheet.rows.filter(Boolean).map(r => Array.from(r, c => (c?.value == null ? '' : c.value)))
			.filter(r => r.some(v => v !== ''))
	}
	return parseCsv(await readText(file))
}

/* What a column can be. `line` fields belong to "one item line" rows, `order` to "a whole order". */
export const FIELDS = [
	{ id: 'vendor', label: 'Vendor', line: true, order: true, words: /butik|vendor|shop|store|leverand|forhandler|seller|merchant/ },
	{ id: 'date', label: 'Order date', line: true, order: true, words: /dato|date|købt|ordered|bestilt/ },
	{ id: 'title', label: 'Item name', line: true, words: /vare|item|produkt|product|navn|name|beskriv|descr|title|titel/ },
	{ id: 'quantity', label: 'Quantity', line: true, words: /antal|qty|quantity|stk|amount of|mængde/ },
	{ id: 'price', label: 'Unit price', line: true, words: /pris|price|stykpris|unit/ },
	{ id: 'total', label: 'Order total', order: true, words: /beløb|total|sum|i alt|amount|pris|price/ },
	{ id: 'description', label: 'Description', order: true, optional: true, words: /vare|item|beskriv|descr|text|tekst|note/ },
	{ id: 'category', label: 'Category', line: true, order: true, words: /kategori|category|gruppe|group|type/ },
	{ id: 'reference', label: 'Order ref', line: true, order: true, words: /ordre|order|ref|nummer|number|no\.?$|nr\.?$|id$/ },
	{ id: 'shipping', label: 'Shipping', line: true, order: true, words: /fragt|levering|shipping|delivery|porto/ }
]
export const NONE = 'none'
export const REQUIRED = { line: ['vendor', 'date', 'title'], order: ['vendor', 'date', 'total'] }
export const fieldsFor = shape => FIELDS.filter(f => f[shape])

/** A first guess at the mapping: each column named like a field gets it, each field once. */
export function guessMapping(rows, shape = 'line') {
	const names = (rows[0] ?? []).map(n => String(n).toLocaleLowerCase('da').trim())
	const columns = names.map(() => NONE)
	for (const field of fieldsFor(shape)) {
		const at = names.findIndex((n, i) => columns[i] === NONE && field.words.test(n))
		if (at >= 0) columns[at] = field.id
	}
	return columns
}

/** The mapping fitted to another file: by column name, so a reused mapping survives reordered
    columns; a column it has no name for gets the usual guess, if that field is still free. */
export function reuseMapping(saved, rows) {
	const names = (rows[0] ?? []).map(n => String(n).trim().toLowerCase())
	const byName = new Map((saved.names ?? []).map((n, i) => [String(n).trim().toLowerCase(), saved.columns?.[i] ?? NONE]))
	const columns = names.map(n => byName.get(n) ?? null)
	const guessed = guessMapping(rows, saved.shape ?? 'line')
	const filled = columns.map((c, i) => (c ?? (columns.includes(guessed[i]) ? NONE : guessed[i])))
	return { ...saved, columns: filled }
}

/* ---- reading cells ---- */

// a number from Excel in a date column is a day count from 30 December 1899
const isSerial = v => typeof v === 'number' && v > 20000 && v < 80000
const fromSerial = v => new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10)

/** The date formats the column could be in; 'excel' when it holds Excel's own dates. */
export function dateFormatsOf(values) {
	const filled = values.filter(v => v !== '' && v != null)
	if (filled.length && filled.filter(isSerial).length * 2 > filled.length) return ['excel']
	return dateFormatsFor(filled.map(String))
}
export const DATE_LABELS = { excel: 'Dates from Excel', ...Object.fromEntries(DATE_FORMATS.map(f => [f.id, f.label])) }
export const DATE_SHAPES = { ymd: 'YYYY-MM-DD', dmy: 'DD-MM-YYYY', mdy: 'MM-DD-YYYY', excel: 'Excel dates' }

const dateOf = (value, format) => (isSerial(value) ? fromSerial(value) : format === 'excel' ? null : readDate(String(value), format))
const amountOf = (value, decimal) => (typeof value === 'number' ? Math.round(value * 100) / 100 : readAmount(value, decimal))

/** The decimal mark a set of amount columns is written with. */
export const decimalOf = (rows, columns) => guessDecimal(rows.flatMap(r => columns.map(i => r[i])).filter(v => typeof v === 'string' && v))

const text = v => String(v ?? '').trim()

/** The values in the category column that name no category in the account yet, with their row counts. */
export function unknownCategories(rows, columnIndex, categories) {
	if (columnIndex < 0) return []
	const known = new Set(categories.map(c => c.name.trim().toLowerCase()))
	const counts = new Map()
	for (const row of rows) {
		const value = text(row[columnIndex])
		if (!value || known.has(value.toLowerCase())) continue
		counts.set(value, (counts.get(value) ?? 0) + 1)
	}
	return [...counts].map(([value, rows]) => ({ value, rows }))
}

/** The file's orders under a mapping ({ shape, columns, group, dateFormat, decimal, categories }); each
    keeps its row numbers in the file, so a skipped one can be named and written back out. */
export function buildOrders(body, mapping, { status, kind } = {}) {
	const at = id => mapping.columns.indexOf(id)
	const col = Object.fromEntries(FIELDS.map(f => [f.id, at(f.id)]))
	const cell = (row, id) => (col[id] >= 0 ? row[col[id]] : '')
	const categoryOf = row => {
		const value = text(cell(row, 'category'))
		if (!value) return []
		const chosen = mapping.categories?.[value]
		return chosen === '' ? [] : [chosen ?? value]
	}
	const orders = [], skipped = []
	const groups = new Map()

	body.forEach((row, i) => {
		const line = i + 2
		const vendor = text(cell(row, 'vendor'))
		const rawDate = cell(row, 'date')
		const date = rawDate === '' ? null : dateOf(rawDate, mapping.dateFormat)
		const problem = !vendor ? 'no vendor' : rawDate === '' ? 'no date' : !date ? 'a date that cannot be read' : null
		if (problem) return skipped.push({ rows: [line], reason: problem })

		if (mapping.shape === 'order') {
			const total = amountOf(cell(row, 'total'), mapping.decimal)
			if (total == null) return skipped.push({ rows: [line], reason: 'no total' })
			if (total < 0) return skipped.push({ rows: [line], reason: 'a total below zero' })
			const shipping = amountOf(cell(row, 'shipping'), mapping.decimal) ?? 0
			orders.push({
				rows: [line],
				draft: {
					vendor, date, kind, status, reference: text(cell(row, 'reference')), shipping: Math.max(0, shipping),
					categories: categoryOf(row),
					items: [{ title: text(cell(row, 'description')).slice(0, 120) || 'Imported order', quantity: 1, price: Math.max(0, total - Math.max(0, shipping)) }]
				}
			})
			return
		}

		const title = text(cell(row, 'title'))
		if (!title) return skipped.push({ rows: [line], reason: 'no item name' })
		const price = amountOf(cell(row, 'price'), mapping.decimal)
		if (price == null) return skipped.push({ rows: [line], reason: 'no price' })
		if (price < 0) return skipped.push({ rows: [line], reason: 'a price below zero' })
		const quantityRaw = amountOf(cell(row, 'quantity'), mapping.decimal)
		const quantity = quantityRaw == null ? 1 : quantityRaw
		if (!(quantity > 0)) return skipped.push({ rows: [line], reason: 'a quantity that is not above zero' })
		const reference = text(cell(row, 'reference'))
		const key = mapping.group === 'reference' && reference ? `ref ${vendor.toLowerCase()} ${reference}` : `day ${vendor.toLowerCase()} ${date}`
		let order = groups.get(key)
		if (!order) {
			order = { rows: [], draft: { vendor, date, kind, status, reference, shipping: 0, categories: [], items: [] } }
			groups.set(key, order)
			orders.push(order)
		}
		order.rows.push(line)
		order.draft.items.push({ title: title.slice(0, 120), quantity, price })
		const shipping = amountOf(cell(row, 'shipping'), mapping.decimal)
		if (shipping > 0) order.draft.shipping = Math.max(order.draft.shipping, shipping)
		for (const name of categoryOf(row)) if (!order.draft.categories.includes(name)) order.draft.categories.push(name)
	})
	return { orders, skipped }
}

/* ---- files the page hands back ---- */

const csvCell = v => (/[";\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
/** The file's own rows that were skipped, with the reason in a last column, as a CSV to fix and import again. */
export function skippedCsv(header, body, skipped) {
	const why = new Map()
	for (const s of skipped) for (const line of s.rows) why.set(line, s.reason)
	const lines = [[...header, 'Why it was skipped']]
	body.forEach((row, i) => { if (why.has(i + 2)) lines.push([...row, why.get(i + 2)]) })
	return '﻿' + lines.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n'
}

export function download(name, data, type) {
	const url = URL.createObjectURL(new Blob([data], { type }))
	const a = document.createElement('a')
	a.href = url
	a.download = name
	document.body.append(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---- the template: a small .xlsx written by hand, stored without compression ---- */

const CRC = Array.from({ length: 256 }, (_, n) => {
	let c = n
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
	return c >>> 0
})
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

function zipStored(files) {
	const enc = new TextEncoder()
	const parts = [], central = []
	let offset = 0
	for (const [name, content] of files) {
		const nameBytes = enc.encode(name), data = enc.encode(content), crc = crc32(data)
		const local = new DataView(new ArrayBuffer(30))
		;[[0, 0x04034b50, 4], [4, 20, 2], [8, 0, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, nameBytes.length, 2]]
			.forEach(([at, v, n]) => (n === 4 ? local.setUint32(at, v, true) : local.setUint16(at, v, true)))
		const head = new DataView(new ArrayBuffer(46))
		;[[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, nameBytes.length, 2], [42, offset, 4]]
			.forEach(([at, v, n]) => (n === 4 ? head.setUint32(at, v, true) : head.setUint16(at, v, true)))
		parts.push(new Uint8Array(local.buffer), nameBytes, data)
		central.push(new Uint8Array(head.buffer), nameBytes)
		offset += 30 + nameBytes.length + data.length
	}
	const size = central.reduce((n, b) => n + b.length, 0)
	const end = new DataView(new ArrayBuffer(22))
	;[[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, offset, 4]]
		.forEach(([at, v, n]) => (n === 4 ? end.setUint32(at, v, true) : end.setUint16(at, v, true)))
	return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

const escapeXml = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const TEMPLATE_ROWS = [
	['Order ref', 'Vendor', 'Order date', 'Item name', 'Quantity', 'Unit price', 'Category', 'Shipping'],
	['1001', 'Example shop', '2026-08-12', 'Vase, large', 1, 349.5, 'Decor', 39],
	['1001', 'Example shop', '2026-08-12', 'Candle', 2, 59, 'Decor', '']
]

/** Spendly_import_template.xlsx: the columns named as the mapping guesses them, and one example order. */
export function templateWorkbook() {
	const letter = i => String.fromCharCode(65 + i)
	const rows = TEMPLATE_ROWS.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => (v === '' ? ''
		: typeof v === 'number' ? `<c r="${letter(c)}${r + 1}"><v>${v}</v></c>`
		: `<c r="${letter(c)}${r + 1}" t="inlineStr"><is><t>${escapeXml(v)}</t></is></c>`)).join('')}</row>`).join('')
	const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
	const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
	return zipStored([
		['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
		['_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
		['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${main}" xmlns:r="${rel}"><sheets><sheet name="Orders" sheetId="1" r:id="rId1"/></sheets></workbook>`],
		['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
		['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${main}"><sheetData>${rows}</sheetData></worksheet>`]
	])
}
