import { phrase } from '../language/phrases.js'
import { readWorkbook } from './xlsx.js'
// A bank's export (CSV or Excel), read in the browser and checked against the budget or the orders; the file is never stored.

/** The file types a bank check takes. */
export const BANK_FILES = '.csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// a whole number from Excel in this range is a day counted from 30 December 1899
const isSerial = v => typeof v === 'number' && Number.isInteger(v) && v > 20000 && v < 80000
const fromSerial = v => new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10)

/** The file's rows of text cells, as a CSV reads: an Excel file's first sheet with content, its
    dates written as 2026-09-30 in a column where most numbers are Excel's day counts. */
export async function readBankFile(file) {
	if (!/\.xlsx$/i.test(file.name)) return parseCsv(await readText(file))
	const sheets = await readWorkbook(file)
	const sheet = sheets.find(s => s.rows.some(r => r?.some(c => c?.value != null)))
	if (!sheet) return []
	const rows = sheet.rows.filter(Boolean).map(r => Array.from(r, c => (c?.value == null ? '' : c.value)))
		.filter(r => r.some(v => v !== ''))
	const width = Math.max(0, ...rows.map(r => r.length))
	const dates = Array.from({ length: width }, (_, i) => {
		const numbers = rows.map(r => r[i]).filter(v => typeof v === 'number')
		return numbers.length > 0 && numbers.filter(isSerial).length * 2 > numbers.length
	})
	return rows.map(r => Array.from({ length: r.length }, (_, i) => {
		const v = r[i]
		return typeof v !== 'number' ? String(v ?? '') : dates[i] && isSerial(v) ? fromSerial(v) : String(v)
	}))
}

// A byte that is not valid UTF-8 means the older Windows encoding many banks still export in.
export async function readText(file) {
	const bytes = new Uint8Array(await file.arrayBuffer())
	let text
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
	} catch {
		text = new TextDecoder('windows-1252').decode(bytes)
	}
	return text.replace(/^﻿/, '')
}

// The separator is whichever of the usual ones splits the first line most, outside quotes.
function separatorOf(text) {
	const line = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '')
	const counts = [';', ',', '\t', '|'].map(s => [s, line.split(s).length - 1])
	counts.sort((a, b) => b[1] - a[1])
	return counts[0][1] ? counts[0][0] : ';'
}

/** Rows of cells. Quoted cells may hold the separator, a doubled quote, or a line break. */
export function parseCsv(text) {
	const sep = separatorOf(text)
	const rows = []
	let row = [], cell = '', quoted = false
	for (let i = 0; i < text.length; i++) {
		const c = text[i]
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
			else if (c === '"') quoted = false
			else cell += c
		} else if (c === '"' && !cell) quoted = true
		else if (c === sep) { row.push(cell.trim()); cell = '' }
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++
			row.push(cell.trim()); cell = ''
			if (row.some(Boolean)) rows.push(row)
			row = []
		} else cell += c
	}
	row.push(cell.trim())
	if (row.some(Boolean)) rows.push(row)
	return rows
}

/* ---- dates ---- */

export const DATE_FORMATS = [
	{ id: 'ymd', label: 'dateOrder.ymd', re: /^(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})$/, order: [1, 2, 3] },
	{ id: 'dmy', label: 'dateOrder.dmy', re: /^(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})$/, order: [3, 2, 1] },
	{ id: 'mdy', label: 'dateOrder.mdy', re: /^(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})$/, order: [3, 1, 2] }
]

/** "2026-09-30" from the cell, or null when the cell is not a real date in that format. */
export function readDate(value, formatId) {
	const format = DATE_FORMATS.find(f => f.id === formatId)
	const found = format?.re.exec(String(value).trim().split(/\s/)[0])
	if (!found) return null
	let [y, m, d] = format.order.map(i => Number(found[i]))
	if (y < 100) y += 2000
	const date = new Date(Date.UTC(y, m - 1, d))
	if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
	return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** The formats that read the most of the column's dates, when that is more than half of them (a closing
    balance line is then one that could not be read). Two only when every date reads day or month first. */
export const dateFormatsFor = values => {
	const filled = values.filter(Boolean)
	const read = DATE_FORMATS.map(f => filled.filter(v => readDate(v, f.id)).length)
	const most = Math.max(...read)
	return most * 2 > filled.length ? DATE_FORMATS.filter((_, i) => read[i] === most).map(f => f.id) : []
}

// Day first before month first when both fit, as Danish banks write it.
export const guessDateFormat = values => dateFormatsFor(values)[0] ?? 'dmy'

/* ---- amounts ---- */

// One decimal mark for the whole column: comma if any value ends in a comma and one or two digits.
export const guessDecimal = samples => (samples.some(s => /,\d{1,2}[+-]?$/.test(clean(s))) ? ',' : '.')

// a word such as "kr." goes whole, so its full stop is not read as a decimal mark
const clean = value => String(value ?? '').replace(/\p{L}+\.?/gu, '').replace(/[\s ]/g, '').replace(/[^\d,.+-]/g, '')

/** A signed number, or null for a cell that holds none. "1.234,56-" is read as negative too. */
export function readAmount(value, decimal) {
	let text = clean(value)
	if (!/\d/.test(text)) return null
	const negative = /^-|-$/.test(text) || /^\(.*\)$/.test(String(value).trim())
	text = text.replace(/[+-]/g, '')
	const thousands = decimal === ',' ? '.' : ','
	text = text.split(thousands).join('').replace(decimal, '.')
	const n = Number(text)
	if (!Number.isFinite(n)) return null
	return Math.round((negative ? -n : n) * 100) / 100
}

/* ---- the columns ---- */

/** A first guess at which column is which, from the column names and what the cells hold. */
export function guessColumns(rows, header) {
	const names = header ? rows[0].map(n => n.toLocaleLowerCase('da')) : []
	const body = header ? rows.slice(1) : rows
	const width = Math.max(...rows.map(r => r.length))
	const columns = Array.from({ length: width }, (_, i) => i)
	const sample = i => body.slice(0, 20).map(r => r[i] ?? '').filter(Boolean)
	const named = re => columns.find(i => re.test(names[i] ?? ''))
	const dates = columns.filter(i => sample(i).length && sample(i).every(s => DATE_FORMATS.some(f => readDate(s, f.id))))
	const numbers = columns.filter(i => !dates.includes(i) && sample(i).length && sample(i).every(amountLike))

	const date = named(/dato|date|bogf|booking/) ?? dates[0] ?? null
	const money = numbers.filter(i => !/saldo|balance/.test(names[i] ?? '') && !sample(i).some(accountLike))
	const best = money.reduce((b, i) => (moneyScore(sample(i)) > (b == null ? 0 : moneyScore(sample(b))) ? i : b), null)
	const single = named(/beløb|belob|amount|beløp/)
	const pair = inAndOut(body, columns, names, dates, single)
	const amount = pair?.amount ?? single ?? best ?? money[0] ?? null
	const out = pair?.out ?? null
	const texts = columns.filter(i => !dates.includes(i) && !numbers.includes(i) && i !== amount && i !== out)
	// a receiver column often holds an account number, so a text or description column comes first;
	// unnamed, the text is the column with the most words in it, never one of only numbers
	const words = i => avgLength(sample(i)) * sample(i).length
	const text = named(/tekst|text|beskriv|descr|narrative/) ?? named(/modtager/)
		?? texts.filter(i => !sample(i).every(numberOnly)).sort((a, b) => words(b) - words(a))[0] ?? null
	return { date, text, amount, out }
}

const amountLike = value => /^[\s\d.,+()-]*\d[\s\d.,+()-]*[a-z.]*$/i.test(value)
const IN = /^(ind|indsat|indbetal\p{L}*|indgående|in|credit|kredit|deposits?)$/u
const OUT = /^(ud|udbetal\p{L}*|udgående|hævet|hævning\p{L}*|out|debit|debet|withdrawals?)$/u

/* Money in and out in columns of their own: a pair named so, or (no column named as the amount) two never
   filled on one line, where money out is the one holding minus amounts, or else the one filled more often. */
function inAndOut(body, columns, names, dates, single) {
	const cells = i => body.map(r => (r[i] ?? '').trim())
	const amounts = i => !dates.includes(i) && !/saldo|balance/.test(names[i] ?? '')
		&& cells(i).every(v => !v || (amountLike(v) && !accountLike(v)))
	const namedBy = re => columns.find(i => amounts(i) && words(names[i] ?? '').some(w => re.test(w)))
	const into = namedBy(IN), from = namedBy(OUT)
	if (into != null && from != null && into !== from) return { amount: into, out: from }
	if (single != null) return null
	const filled = i => cells(i).filter(Boolean)
	const minus = i => filled(i).some(v => readAmount(v, '.') < 0)
	const found = columns.filter(i => amounts(i) && filled(i).length)
	for (const a of found) for (const b of found.filter(b => b > a)) {
		const both = body.filter(r => r[a]?.trim() && r[b]?.trim()).length
		const either = body.filter(r => r[a]?.trim() || r[b]?.trim()).length
		if (both || either * 2 <= body.length) continue
		const outFirst = minus(a) !== minus(b) ? minus(a) : filled(a).length > filled(b).length
		return outFirst ? { amount: b, out: a } : { amount: a, out: b }
	}
	return null
}

const avgLength = values => values.reduce((n, v) => n + v.length, 0) / (values.length || 1)

// An account or registration number: digits joined by a minus, or a long run of digits alone.
const accountLike = value => /\d-\d/.test(value) || /^\d{8,}$/.test(value.trim())
const numberOnly = value => /^[\d\s.,+-]+$/.test(value)
const signed = value => /^[+-]|-$/.test(clean(value)) || /^\(.*\)$/.test(value.trim())
// How much a column reads like money: the share of its cells with øre, more when any is signed.
// On a tie the column further left wins, since banks put the amount before the balance.
const moneyScore = values => values.filter(v => /\d[.,]\d{2}(?!\d)/.test(v)).length / values.length
	+ (values.some(signed) ? 0.5 : 0)

/* What a column that names an account, a person or a payment holds, said in words instead of its
   values (21h): by its name in the header first, else by the shape of every filled cell. */
const DESCRIBED = [
	{ said: 'column.account', name: /konto|account|iban|reg\.?nr|regnr/, value: v => /^[A-Z]{2}\d{2}[\dA-Z ]{10,}$/.test(v) || /^\d{4}[- ]\d{6,10}$/.test(v) },
	{ said: 'column.mobilePay', name: /mobilepay/ },
	{ said: 'column.name', name: /navn|name|modtager|afsender|payee|payer/ },
	{ said: 'column.reference', name: /reference|^ref|kvittering|transaktions?id|^id$/, value: v => /^\d{8,}$/.test(v) || /\d-\d/.test(v) }
]

/** How the column table shows a column it does not read: a description instead of values that identify
    an account, a person or a payment, or null to show the values. */
export function describeColumn(cells, name = '') {
	const filled = cells.map(c => String(c ?? '').trim()).filter(Boolean)
	if (!filled.length || filled.every(v => DATE_FORMATS.some(f => readDate(v, f.id)))) return null
	const named = String(name).toLocaleLowerCase('da')
	const found = DESCRIBED.find(d => (named && d.name.test(named)) || (d.value && filled.every(d.value)))
	if (!found) return null
	return phrase(filled.length < cells.length ? 'column.orEmpty' : 'column.full', { said: phrase(found.said) })
}

// A first row is names, not a payment, when none of its cells reads as a date.
export const hasHeader = rows => rows.length > 1
	&& !rows[0].some(cell => DATE_FORMATS.some(f => readDate(cell, f.id)))

/** The payments in the file, and the rows that could not be read as one. */
export function readPayments(rows, { header, date, text, amount, out, dateFormat }) {
	const body = header ? rows.slice(1) : rows
	const decimal = guessDecimal(body.flatMap(r => [r[amount], out == null ? '' : r[out]]).filter(Boolean))
	const payments = [], unread = []
	body.forEach((row, i) => {
		const day = readDate(row[date] ?? '', dateFormat)
		const into = readAmount(row[amount], decimal)
		const from = out == null ? null : readAmount(row[out], decimal)
		const value = out == null ? into : (into ?? 0) - Math.abs(from ?? 0)
		if (!day || value == null || (out != null && into == null && from == null)) unread.push(i + (header ? 2 : 1))
		else if (value !== 0) payments.push({ row: i + (header ? 2 : 1), date: day, text: row[text] ?? '', amount: value })
	})
	return { payments, unread }
}

/* ---- checking against the budget ---- */

const words = text => String(text).toLocaleLowerCase('da').match(/[\p{L}\p{N}]+/gu) ?? []

/** What a payment is remembered by: its words, less any that hold a digit, since an invoice or
    receipt number changes every month while the rest of the text stays. */
export const paymentKey = text => words(text).filter(w => !/\d/.test(w)).join(' ').slice(0, 200)

/** Marks one payment alone, by its day and amount as well as its text, so nothing later is placed by it. */
export const onceKey = payment => `once ${payment.date} ${payment.amount} ${paymentKey(payment.text)}`.slice(0, 200)

export const kindOf = payment => (payment.amount < 0 ? 'expense' : 'income')

/* A row's name is in the payment's text when every word of it three letters or longer starts a word there.
   A row named with shorter words only, like "El", is found by its amount alone. */
function nameIn(name, text) {
	const needles = words(name).filter(w => w.length >= 3 && !/^\d+$/.test(w))
	if (!needles.length) return false
	const hay = words(text)
	return needles.every(w => hay.some(h => h.startsWith(w)))
}

const sameName = (a, b) => a.trim().toLocaleLowerCase('da') === b.trim().toLocaleLowerCase('da')
const same = (a, b) => a != null && Math.abs(a - b) < 0.005

/** How far a payment may be from a row's amount and still be suggested as that row: a share of the row's amount. */
export const NEAR = 0.1
const gap = (budget, want) => (budget ? Math.abs(budget - want) / budget : Infinity)

/** Each payment with a status: 'match' (same amount), 'amount' (row found, other amount), 'near' (no row
    found, one is close in amount), 'missing', 'skip' (placed outside the budget), 'once' (a one-time payment) or 'year' (no sheet). */
export function checkPayments(payments, sheets, links = []) {
	const used = new Set()
	const placed = new Map(links.map(l => [`${l.kind}:${l.pattern}`, l]))
	const results = payments.map(p => ({ ...p, key: paymentKey(p.text), status: 'missing', line: null, budget: null }))

	const candidates = p => {
		const sheet = sheets.get(Number(p.date.slice(0, 4)))
		if (!sheet) return null
		return sheet.groups.filter(g => g.kind === kindOf(p)).flatMap(g => g.lines.map(line => ({ line, group: g.name })))
	}
	const monthOf = p => Number(p.date.slice(5, 7)) - 1
	const fits = (p, { line }) => {
		const m = line.months[monthOf(p)]
		const want = Math.abs(p.amount)
		return !used.has(`${line.id}:${monthOf(p)}`) && (same(m.real, want) || same(m.expected, want))
	}
	const take = (r, found) => {
		used.add(`${found.line.id}:${monthOf(r)}`)
		Object.assign(r, { status: 'match', line: found.line.name, lineId: found.line.id, group: found.group })
	}

	const differs = (r, found) => {
		const m = found.line.months[monthOf(r)]
		Object.assign(r, { status: 'amount', line: found.line.name, lineId: found.line.id, group: found.group,
			budget: m.real ?? m.expected })
	}

	// The reader's own answers first, then the amount and the name together, so a row is not used
	// up by a payment that only shares its amount.
	for (const r of results) {
		const lines = candidates(r)
		if (placed.has(`${kindOf(r)}:${onceKey(r)}`)) { Object.assign(r, { status: 'once', placed: 'once' }); continue }
		const link = placed.get(`${kindOf(r)}:${r.key}`)
		r.placed = link !== undefined
		if (link && link.line == null) { r.status = 'skip'; continue }
		if (!lines) { r.status = 'year'; continue }
		if (r.placed) {
			// the row's series finds it in every year and after a rename; its name finds a row in a year built by hand
			const found = lines.find(c => link.lineSeriesId && c.line.seriesId === link.lineSeriesId)
				?? lines.find(c => sameName(c.line.name, link.line))
			if (found) {
				if (fits(r, found)) take(r, found)
				else differs(r, found)
				continue
			}
			r.placed = false
		}
		const found = lines.find(c => fits(r, c) && nameIn(c.line.name, r.text))
		if (found) take(r, found)
	}
	for (const r of results.filter(r => r.status === 'missing')) {
		const found = candidates(r).find(c => fits(r, c))
		if (found) take(r, found)
	}
	for (const r of results.filter(r => r.status === 'missing')) {
		const found = candidates(r).find(c => nameIn(c.line.name, r.text))
		if (found) differs(r, found)
	}
	// Last, a suggestion from the amount alone: the closest row this month, when it is close enough.
	for (const r of results.filter(r => r.status === 'missing')) {
		const want = Math.abs(r.amount)
		const off = c => { const m = c.line.months[monthOf(r)]; return Math.min(gap(m.real, want), gap(m.expected, want)) }
		const found = candidates(r).filter(c => off(c) <= NEAR).sort((a, b) => off(a) - off(b))[0]
		if (found) { differs(r, found); r.status = 'near' }
	}
	// Several payments on one row in a month match together when they add up to the row's amount.
	const lines = new Map([...sheets.values()].flatMap(s => s.groups.flatMap(g => g.lines.map(l => [l.id, l]))))
	for (const list of onRows(results).values()) {
		if (list.length < 2 || list.every(r => r.status === 'match')) continue
		const m = lines.get(list[0].lineId).months[monthOf(list[0])]
		const sum = total(list)
		if (same(m.real, sum) || same(m.expected, sum)) for (const r of list) Object.assign(r, { status: 'match', budget: null })
	}
	return results
}

const total = list => Math.round(list.reduce((n, r) => n + Math.abs(r.amount), 0) * 100) / 100

// The payments found on a row, by row and month, each with the row's amounts for that month.
function onRows(results) {
	const byRow = new Map()
	for (const r of results.filter(r => r.lineId && (r.status === 'match' || r.status === 'amount'))) {
		const id = `${r.lineId}:${r.date.slice(0, 7)}`
		byRow.set(id, [...(byRow.get(id) ?? []), r])
	}
	return byRow
}

/** What the file would write into the budget: for each row and month the payments were found on, their
    sum as the real amount, where the budget holds another. */
export function realAmounts(checked, sheets) {
	const rows = new Map()
	for (const sheet of sheets.values()) for (const g of sheet.groups) for (const l of g.lines) rows.set(l.id, { line: l, group: g.name })
	return [...onRows(checked)].map(([id, list]) => {
		const { line, group } = rows.get(list[0].lineId)
		const month = Number(list[0].date.slice(5, 7))
		return { id, lineId: line.id, name: line.name, group, kind: kindOf(list[0]), year: Number(list[0].date.slice(0, 4)), month,
			now: line.months[month - 1].real, amount: total(list), count: list.length }
	}).filter(w => !same(w.now, w.amount)).sort((a, b) => a.year - b.year || a.month - b.month)
}

/* ---- checking against the orders ---- */

// the matching's two settings and their ends (2j); the server sends orders this many days around the file (api/src/routes/ordersBankCheck.js)
export const ORDER_MATCH = { days: 3, percent: 3, most: 10 }
const dayNumber = iso => Date.parse(iso + 'T00:00:00Z') / 86400000
const cents = n => Math.round(n * 100)

/** Each payment out with its status: 'once' or 'skip' when left out, 'registered' with its `order`, or
    'missing'. An order matches dated up to `days` apart, with the same total or one up to `percent` of the
    payment away; the exact total first, then the closest total, then the closest day. One order per payment.
    A close match carries `difference`, what the order holds more (or, below 0, less) than was paid. */
export function checkOrderPayments(payments, orders, leftOut = [], { days = ORDER_MATCH.days, percent = ORDER_MATCH.percent } = {}) {
	const out = new Set(leftOut)
	const statusOf = p => (out.has(onceKey(p)) ? 'once' : out.has(paymentKey(p.text)) ? 'skip' : null)
	const marked = payments.map(p => ({ ...p, total: Math.round(-p.amount * 100) / 100, status: statusOf(p) }))
	const pairs = []
	for (const p of marked) {
		if (p.status) continue
		const day = dayNumber(p.date)
		const allowed = Math.round(cents(p.total) * percent / 100)
		for (const o of orders) {
			const apart = Math.abs(dayNumber(o.date) - day)
			const off = Math.abs(cents(o.total) - cents(p.total))
			if (apart <= days && off <= allowed) pairs.push({ p, o, apart, off })
		}
	}
	pairs.sort((a, b) => a.off - b.off || a.apart - b.apart || b.p.date.localeCompare(a.p.date) || a.p.row - b.p.row)
	const taken = new Set(), matched = new Map()
	for (const { p, o, off } of pairs) {
		if (matched.has(p.row) || taken.has(o.id)) continue
		matched.set(p.row, off ? { ...o, difference: (cents(o.total) - cents(p.total)) / 100 } : o)
		taken.add(o.id)
	}
	return {
		payments: marked.map(p => (p.status ? p : matched.has(p.row) ? { ...p, status: 'registered', order: matched.get(p.row) } : { ...p, status: 'missing' }))
			.sort((a, b) => b.date.localeCompare(a.date) || a.row - b.row),
		matchedOrders: taken
	}
}
