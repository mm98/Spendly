import { replaceYears } from './budget.js'

/* The same accounts, groups and rows every year. Amounts depend on the year alone, never on the
   fill's seed or the day it runs, so a year reads the same after every fill. */

const ACCOUNTS = ['Budget account', 'Everyday account', 'Savings account']

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const QUARTERS = [1, 4, 7, 10]

// the year whose amounts the rows below give; every other year is worked out from it
const BASE_YEAR = 2026

// `amount` is the amount for one month in BASE_YEAR; `steady` rows are paid exactly as expected
const GROUPS = [
	{ kind: 'income', name: 'Salary', lines: [
		{ name: 'Salary', account: 'Everyday account', amount: 28500, steady: true },
		{ name: 'Partner salary', account: 'Everyday account', amount: 24000, steady: true }
	] },
	{ kind: 'income', name: 'Other income', lines: [
		{ name: 'Child benefit', account: 'Everyday account', amount: 4800, months: QUARTERS, steady: true },
		{ name: 'Holiday pay', account: 'Everyday account', amount: 6500, months: [5] }
	] },
	{ kind: 'expense', name: 'Home', lines: [
		{ name: 'Rent', account: 'Budget account', amount: 11200, steady: true },
		{ name: 'Electricity', account: 'Budget account', amount: 2100, months: QUARTERS },
		{ name: 'Heating', account: 'Budget account', amount: 950 },
		{ name: 'Water', account: 'Budget account', amount: 1400, months: [3, 9] },
		{ name: 'Home insurance', account: 'Budget account', amount: 3600, months: [1], steady: true }
	] },
	{ kind: 'expense', name: 'Transport', lines: [
		{ name: 'Car loan', account: 'Budget account', amount: 2450, steady: true },
		{ name: 'Fuel', account: 'Everyday account', amount: 1300 },
		{ name: 'Car insurance', account: 'Budget account', amount: 5400, months: [2], steady: true },
		{ name: 'Train pass', account: 'Everyday account', amount: 480, steady: true }
	] },
	{ kind: 'expense', name: 'Everyday', lines: [
		{ name: 'Groceries', account: 'Everyday account', amount: 6200 },
		{ name: 'Phone', account: 'Budget account', amount: 398, steady: true },
		{ name: 'Internet', account: 'Budget account', amount: 299, steady: true },
		{ name: 'Streaming', account: 'Budget account', amount: 219, steady: true },
		{ name: 'Childcare', account: 'Budget account', amount: 3450, months: ALL.filter(m => m !== 7), steady: true }
	] },
	{ kind: 'expense', name: 'Saving', lines: [
		{ name: 'Holiday', account: 'Savings account', amount: 1500, steady: true },
		{ name: 'Rainy day', account: 'Savings account', amount: 1000, steady: true }
	] }
]

/** A number from 0 to 1 that depends only on its two keys. */
const noise = (a, b) => {
	let s = (a * 7919 + b * 104729) & 0x7fffffff
	for (let i = 0; i < 3; i++) s = (s * 1103515245 + 12345) & 0x7fffffff
	return s / 0x7fffffff
}

const roundTo = (n, step) => Math.round(n / step) * step

/** One year's sheet. Months before `paidUntil` (1-12, or 13 for a whole year) carry what was really paid. */
function demoYear(year, paidUntil) {
	return {
		year,
		groups: GROUPS.map(group => ({
			kind: group.kind, name: group.name,
			lines: group.lines.map((line, n) => {
				const key = group.name.length * 100 + n
				// about 3 % a year, give or take
				let level = line.amount
				for (let y = BASE_YEAR; y > year; y--) level /= 1.015 + noise(y, key) * 0.035
				for (let y = BASE_YEAR + 1; y <= year; y++) level *= 1.015 + noise(y, key) * 0.035
				const expected = roundTo(level, level >= 1000 ? 50 : 10)
				const months = ALL.map(m => {
					if (!(line.months ?? ALL).includes(m)) return { expected: null, real: null }
					const real = m >= paidUntil ? null
						: line.steady ? expected : Math.round(expected * (0.88 + noise(year * 12 + m, key) * 0.24))
					return { expected, real }
				})
				return { name: line.name, account: line.account, months }
			})
		}))
	}
}

/** Writes the demo budget for every year from `firstYear` to the year of `today`, at least five. */
export function populateDemoBudget(userId, { today, firstYear }) {
	const newest = today.getUTCFullYear()
	const oldest = Math.min(firstYear, newest - 4)
	const years = []
	for (let year = oldest; year <= newest; year++)
		years.push(demoYear(year, year < newest ? 13 : today.getUTCMonth() + 1))
	replaceYears(userId, years, ACCOUNTS)
	return years.length
}
