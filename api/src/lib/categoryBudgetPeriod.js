/** The calendar month and year a limit of each CATEGORY_BUDGET_PERIODS is measured on, as epoch seconds.
    With `upToMonth` the year ends with that month: a past month read back measures a yearly limit up to it. */
export function budgetWindows(day, { upToMonth = false } = {}) {
	const [y, m] = day.split('-').map(Number)
	const month = { from: Date.UTC(y, m - 1, 1) / 1000, to: Date.UTC(y, m, 1) / 1000 }
	return { month, year: { from: Date.UTC(y, 0, 1) / 1000, to: upToMonth ? month.to : Date.UTC(y + 1, 0, 1) / 1000 } }
}

/** A row's spend in its own period, from its month and year spend. */
export const spendInPeriod = (period, monthSpend, yearSpend) => (period === 'year' ? yearSpend : monthSpend)
