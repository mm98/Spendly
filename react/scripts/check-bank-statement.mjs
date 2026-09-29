// Reads an anonymised export in the bank format the check is built for, and checks it against a small budget.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import {
	checkPayments, guessColumns, guessDateFormat, hasHeader, paymentKey, parseCsv, readPayments, readText
} from '../src/api/bankStatement.js'

const bytes = readFileSync(new URL('./fixtures/bank-statement.csv', import.meta.url))
const rows = parseCsv(await readText({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }))
const header = hasHeader(rows)
const columns = guessColumns(rows, header)
const dateFormat = guessDateFormat(rows.map(r => r[columns.date]))
assert.equal(header, false)
assert.deepEqual(columns, { date: 0, text: 1, amount: 2, out: null })
assert.equal(dateFormat, 'dmy')
assert.equal(rows[5][1], 'MobilePay køb MobilePay Forsikringen "danmark')

const { payments, unread } = readPayments(rows, { header, ...columns, dateFormat })
assert.equal(unread.length, 0)
assert.deepEqual(payments.map(p => p.amount), [-169, -4449.48, -229, -245, 15000, -99, -700, -50])

const months = amount => Array.from({ length: 12 }, () => ({ expected: amount, real: null }))
const sheet = { year: 2026, groups: [
	{ kind: 'income', name: 'Income', lines: [{ id: 'i', name: 'Fast overførsel', months: months(15000) }] },
	{ kind: 'expense', name: 'Home', lines: [
		{ id: 'a', name: 'Telefon', months: months(159) },
		{ id: 'b', name: 'Bil', months: months(4449.48) },
		{ id: 'c', name: 'Vand', months: months(229) }] }] }
const links = [
	{ pattern: paymentKey('Betalingsservice VANDVÆRK Aftalenr. 987654321'), kind: 'expense', line: 'Vand' },
	{ pattern: 'udligning erhvervskonto', kind: 'expense', line: null }
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
	['year', null]
])
console.log('Bank statement check: all cases pass.')
