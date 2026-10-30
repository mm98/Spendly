// Reads an anonymised export in the bank format the check is built for, and checks it against a small budget.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// phrases.js finds its language files through Vite, which does not run here; the words are not checked, so it gets none
register('data:text/javascript,' + encodeURIComponent(`export async function load(url, context, next) {
	const found = await next(url, context)
	return url.endsWith('/language/phrases.js') ? { ...found, source: String(found.source).replace("import.meta.glob('./*.json', { import: 'default' })", '{}') } : found
}`))
const {
	checkPayments, dateFormatsFor, guessColumns, guessDateFormat, hasHeader, onceKey, paymentKey, parseCsv, readPayments, readText,
	realAmounts
} = await import('../src/api/bankStatement.js')

const load = async name => {
	const bytes = readFileSync(new URL(`./fixtures/${name}`, import.meta.url))
	return parseCsv(await readText({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }))
}
const rows = await load('bank-statement.csv')
const header = hasHeader(rows)
const columns = guessColumns(rows, header)
const dateFormat = guessDateFormat(rows.map(r => r[columns.date]))
assert.equal(header, false)
assert.deepEqual(columns, { date: 0, text: 1, amount: 2, out: null })
assert.equal(dateFormat, 'dmy')
assert.deepEqual(dateFormatsFor(rows.map(r => r[columns.date])), ['dmy'])
assert.deepEqual(dateFormatsFor(['01-02-2026', '03-04-2026']), ['dmy', 'mdy'])
assert.deepEqual(dateFormatsFor(['2026-02-01']), ['ymd'])
assert.equal(rows[5][1], 'MobilePay køb MobilePay Forsikringen "danmark')

const { payments, unread } = readPayments(rows, { header, ...columns, dateFormat })
assert.equal(unread.length, 0)
assert.deepEqual(payments.map(p => p.amount), [-169, -4449.48, -229, -245, 15000, -99, -700, -50, -372, -1899])

const months = amount => Array.from({ length: 12 }, () => ({ expected: amount, real: null }))
const sheet = { year: 2026, groups: [
	{ kind: 'income', name: 'Income', lines: [{ id: 'i', name: 'Fast overførsel', months: months(15000) }] },
	{ kind: 'expense', name: 'Home', lines: [
		{ id: 'a', name: 'Telefon', months: months(159) },
		{ id: 'b', name: 'Bil', months: months(4449.48) },
		{ id: 'c', seriesId: 'c', name: 'Vand', months: months(229) },
		{ id: 'd', name: 'El', months: months(350) }] }] }
const links = [
	{ pattern: paymentKey('Betalingsservice VANDVÆRK Aftalenr. 987654321'), kind: 'expense', line: 'Vand', lineSeriesId: 'c' },
	{ pattern: 'udligning erhvervskonto', kind: 'expense', line: null },
	{ pattern: onceKey(payments[9]), kind: 'expense', line: null }
]
const status = checkPayments(payments, new Map([[2026, sheet]]), links).map(p => [p.status, p.line])
assert.deepEqual(status, [
	['amount', 'Telefon'], // the name is in the text, the amount is another
	['match', 'Bil'], // the amount alone
	['match', 'Vand'], // placed by hand, same amount
	['amount', 'Vand'], // placed by hand; the month's amount is already used
	['match', 'Fast overførsel'],
	['missing', null],
	['skip', null],
	['year', null],
	['near', 'El'], // no name, no saved choice, 6 % from the row's amount
	['once', null]
])
// Money in and money out in two columns: named in English or Danish, either first, or not named at all.
for (const [name, names, unreadLines] of [
	['bank-money-in-out.csv', ['Date', 'Description', 'Money in', 'Money out'], [7]], // the closing balance has no date
	['bank-ud-ind.csv', ['Dato', 'Tekst', 'Ind', 'Ud'], []],
	['bank-no-names.csv', null, []]
]) {
	const file = await load(name)
	const named = hasHeader(file)
	const found = guessColumns(file, named)
	assert.equal(named, !!names, name)
	if (names) assert.deepEqual([found.date, found.text, found.amount, found.out].map(i => file[0][i]), names, name)
	else assert.deepEqual(found, { date: 0, text: 1, amount: 3, out: 2 }, name)
	const read = readPayments(file, { header: named, ...found, dateFormat: guessDateFormat((named ? file.slice(1) : file).map(r => r[found.date])) })
	assert.deepEqual(read.unread, unreadLines, name)
	assert.deepEqual(read.payments.map(p => p.amount), name === 'bank-money-in-out.csv'
		? [-4449.48, -874.5, -376.49, 34000, -1212.4] : [-4449.48, -874.5, 34000, -212.4], name)
}
const pair = head => { const g = guessColumns(parseCsv(`${head}\n01-10-2026;x;1,00;;5,00\n02-10-2026;y;;2,00;7,00`), true); return [g.amount, g.out] }
assert.deepEqual(pair('Dato;Tekst;Indsat;Hævet;Saldo'), [2, 3])
assert.deepEqual(pair('Date;Text;Debit;Credit;Balance'), [3, 2])
assert.deepEqual(pair('Date;Text;Paid out;Paid in;Balance'), [3, 2])
// A column named as the amount stays the amount.
assert.deepEqual(pair('Dato;Tekst;Beløb;Gebyr;Saldo'), [2, null])
// An amount on every line and a fee on some are not a pair: the two are filled on the same line.
const fee = guessColumns(parseCsv('01-10-2026;x;-1,00;\n02-10-2026;y;2,00;-0,50\n03-10-2026;z;-3,00;'), false)
assert.deepEqual([fee.amount, fee.out], [2, null])
// A date that cannot be read leaves that line out; the format comes from the others.
assert.deepEqual(dateFormatsFor(['2026-10-02', '2026-10-01', 'Closing balance']), ['ymd'])
assert.deepEqual(dateFormatsFor(['igår', 'idag']), [])

// A placed payment finds its row by the row's series: after a rename, in another year, and among two rows of one name.
const water = payments[2]
const placedOn = (lines, link = links[0]) => {
	const year = { year: 2026, groups: [{ kind: 'expense', name: 'Home', lines }] }
	const [p] = checkPayments([water], new Map([[2026, year]]), [link])
	return [p.status, p.lineId]
}
const sameAmount = { id: 't', seriesId: 't', name: 'Avis', months: months(229) }
assert.deepEqual(placedOn([sameAmount, { id: 'c', seriesId: 'c', name: 'Vandværket', months: months(229) }]), ['match', 'c'])
assert.deepEqual(placedOn([sameAmount, { id: 'c27', seriesId: 'c', name: 'Vand og afløb', months: months(229) }]), ['match', 'c27'])
assert.deepEqual(placedOn([
	{ id: 'x', seriesId: 'x', name: 'Vand', months: months(229) },
	{ id: 'c', seriesId: 'c', name: 'Vand', months: months(229) }]), ['match', 'c'])
// A row with no series of the link's, as in a year built by hand, is found by the name.
assert.deepEqual(placedOn([{ id: 'h', seriesId: 'h', name: 'vand', months: months(229) }]), ['match', 'h'])
assert.deepEqual(placedOn([{ id: 'h', seriesId: 'h', name: 'Vand', months: months(229) }],
	{ ...links[0], lineSeriesId: null }), ['match', 'h'])

// A one-time mark holds for that payment alone, not for a later one with the same text.
const later = { ...payments[9], date: '2026-10-12' }
assert.equal(checkPayments([later], new Map([[2026, sheet]]), links)[0].status, 'missing')

// What saving writes: each row and month's payments summed, where the real amount is another.
const groceries = { year: 2026, groups: [{ kind: 'expense', name: 'Food', lines: [
	{ id: 'n', name: 'Netto', months: months(1500) }] }] }
const shop = [
	{ row: 1, date: '2026-01-08', text: 'Dankort NETTO 1234', amount: -642.15 },
	{ row: 2, date: '2026-01-12', text: 'Dankort NETTO 1234', amount: -818.4 }]
const shopSheets = new Map([[2026, groceries]])
const found = checkPayments(shop, shopSheets)
assert.deepEqual(found.map(p => p.status), ['amount', 'amount'])
const writes = realAmounts(found, shopSheets)
assert.deepEqual(writes.map(w => [w.lineId, w.month, w.amount, w.count, w.now]), [['n', 1, 1460.55, 2, null]])
// Once saved, the two payments add up to the month's real amount and are found together.
groceries.groups[0].lines[0].months[0].real = 1460.55
const saved = checkPayments(shop, shopSheets)
assert.deepEqual(saved.map(p => p.status), ['match', 'match'])
assert.deepEqual(realAmounts(saved, shopSheets), [])
console.log('Bank statement check: all cases pass.')
