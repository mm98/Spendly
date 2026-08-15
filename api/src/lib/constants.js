/* What the server validates against; the client's spendKinds mirrors SPEND_KINDS. Option
   lists the server never reads (sort labels, range chips) live in the client alone -- copies
   of them sat here once, imported by nothing, which is how a dead copy starts to drift. */
export const SPEND_KINDS = ['Expense', 'Gift', 'Sold', 'Work', 'Other']
export const ORDER_STATUSES = ['Ordered', 'Delivered', 'Returned']

export const DASHBOARD_CARD_CATALOGUE = [
	{ key: 'rhythm',    name: 'Spending rhythm',      desc: 'Average order, and which weekday you spend on' },
	{ key: 'breakdown', name: 'Category breakdown',   desc: "Where this month's spend went, by category" },
	{ key: 'vendors',   name: 'Top vendors',          desc: 'The shops you spend the most at, all time' },
	{ key: 'favcats',   name: 'Favourite categories', desc: 'The categories you starred, with spend and savings' },
	{ key: 'saved',     name: 'Saved vs retail',      desc: 'What you paid against the retail price, this month' },
	{ key: 'pace',      name: 'Monthly pace',         desc: 'Where the month lands if the rest of it looks like the start' }
]
