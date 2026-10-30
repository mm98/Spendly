/* A category's limit is for a calendar month or a calendar year (CATEGORY_BUDGET_PERIODS). These
   are the windows each is measured on, as the epoch seconds orders are stored in. */

/** The calendar month and the calendar year of `day` ("2026-10-30" or "2026-10"). With `upToMonth`
    the year ends with that month: a past month read back measures a yearly limit up to it. */
export function budgetWindows(day, { upToMonth = false } = {}) {
	const [y, m] = day.split('-').map(Number)
	const month = { from: Date.UTC(y, m - 1, 1) / 1000, to: Date.UTC(y, m, 1) / 1000 }
	return { month, year: { from: Date.UTC(y, 0, 1) / 1000, to: upToMonth ? month.to : Date.UTC(y + 1, 0, 1) / 1000 } }
}

/** A row's spend in its own period, from its month and year spend. */
export const spendInPeriod = (period, monthSpend, yearSpend) => (period === 'year' ? yearSpend : monthSpend)
