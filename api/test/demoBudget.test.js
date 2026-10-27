import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// a database of its own, set before anything opens the real one
const scratch = mkdtempSync(path.join(tmpdir(), 'spendly-demo-budget-'))
process.env.SPENDLY_DB = path.join(scratch, 'spendly.sqlite3')

const { db } = await import('../src/db.js')
const { replaceWithDemo } = await import('../src/lib/demoFill.js')
const { listYears, readYear, listAccounts } = await import('../src/lib/budget.js')

const USER = 'u-demo-budget'
const TODAY = '2026-10-27'

before(() => {
	db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'x', 'Test')").run(USER, 'demo-budget@example.com')
})

const shape = sheet => sheet.groups.map(g => `${g.kind}:${g.name}:${g.lines.map(l => l.name).join(',')}`).join('|')
const amounts = sheet => sheet.groups.flatMap(g => g.lines.flatMap(l => l.months.map(m => m.expected)))

test('the fill writes at least five budget years, alike in rows and different in amounts', () => {
	replaceWithDemo(USER, { seed: 1, orders: 50, months: 12, today: TODAY })
	assert.deepEqual(listYears(USER), [2022, 2023, 2024, 2025, 2026])
	const sheets = listYears(USER).map(year => readYear(USER, year))
	for (const sheet of sheets) assert.equal(shape(sheet), shape(sheets[0]))
	for (let i = 1; i < sheets.length; i++) assert.notDeepEqual(amounts(sheets[i]), amounts(sheets[i - 1]))
})

test('only months before today hold what was really paid', () => {
	const rent = readYear(USER, 2026).groups.find(g => g.name === 'Home').lines.find(l => l.name === 'Rent')
	assert.ok(rent.months.slice(0, 9).every(m => m.real != null))
	assert.ok(rent.months.slice(9).every(m => m.real == null && m.expected != null))
	assert.ok(readYear(USER, 2025).groups.every(g => g.lines.every(l => l.months.every(m => m.expected == null || m.real != null))))
})

test('a second fill replaces the budget with the same amounts, whatever the seed', () => {
	const before = listYears(USER).map(year => amounts(readYear(USER, year)))
	replaceWithDemo(USER, { seed: 99, orders: 50, months: 96, today: TODAY })
	assert.deepEqual(listYears(USER), [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])
	assert.deepEqual([2022, 2023, 2024, 2025, 2026].map(year => amounts(readYear(USER, year))), before)
	assert.equal(listAccounts(USER).length, 3)
})
