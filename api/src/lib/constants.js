export const SPEND_KINDS = ['Expense', 'Gift', 'Sold', 'Work', 'Other']
export const ORDER_STATUSES = ['Ordered', 'Delivered', 'Returned']

export const SORTS = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'date-asc', label: 'Date, oldest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'amount-asc', label: 'Amount, lowest' },
	{ id: 'vendor-asc', label: 'Vendor, A to Z' }
]

export const RANGES = [
	{ key: 'week', label: 'Week', short: 'WK' },
	{ key: 'month', label: 'Month', short: 'MO' },
	{ key: 'quarter', label: 'Quarter', short: 'QT' },
	{ key: 'year', label: 'Year', short: 'YR' },
	{ key: 'all', label: 'All', short: 'ALL' }
]

export const DASHBOARD_CARD_CATALOGUE = [
	{ key: 'rhythm',    name: 'Spending rhythm',      desc: 'Average order, and which weekday you spend on' },
	{ key: 'breakdown', name: 'Category breakdown',   desc: "Where this month's spend went, by category" },
	{ key: 'vendors',   name: 'Top vendors',          desc: 'The shops you spend the most at, all time' },
	{ key: 'favcats',   name: 'Favourite categories', desc: 'The categories you starred, with spend and savings' },
	{ key: 'saved',     name: 'Saved vs retail',      desc: 'What you paid against the retail price, this month' },
	{ key: 'pace',      name: 'Monthly pace',         desc: 'Where the month lands if the rest of it looks like the start' }
]
