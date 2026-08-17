/* What the server validates against; the client's spendKinds mirrors SPEND_KINDS. Option
   lists the server never reads (sort labels, range chips) live in the client alone -- copies
   of them sat here once, imported by nothing, which is how a dead copy starts to drift. */
export const SPEND_KINDS = ['Expense', 'Gift', 'Sold', 'Work', 'Other']
export const ORDER_STATUSES = ['Ordered', 'Delivered', 'Returned']

/* The currencies an account can keep its ledger in (migrations/003_currency.sql). The code
   is what is stored and validated; the symbol and which side it sits on are presentation,
   mirrored in the client's own list (react/src/api/format.js) the way spendKinds mirrors
   SPEND_KINDS. Note that DKK, SEK and NOK all print "kr" -- which is exactly why the column
   holds the code and not the symbol.

   Nothing here converts. A currency is the unit the figures were always in, not a rate
   applied to them: changing it restates what the numbers are called, never what they are
   worth, and an account that switches has not had its ledger revalued. */
export const CURRENCIES = [
	{ code: 'DKK', symbol: 'kr.', before: false },
	{ code: 'SEK', symbol: 'kr', before: false },
	{ code: 'NOK', symbol: 'kr', before: false },
	{ code: 'EUR', symbol: '€', before: true },
	{ code: 'USD', symbol: '$', before: true },
	{ code: 'GBP', symbol: '£', before: true }
]

/* The most rows one orders-list page may carry, enforced wherever a page size enters -- the
   list route's query param and the stored settings value. LIMIT is the one place a caller's
   number reaches SQL, and without a ceiling `?pageSize=100000000` (or no pageSize at all, on
   a large account) returned every matched row, decorated, in one response. 1000 is an
   order of magnitude above the UI's largest offered size (100) -- room for an export-ish
   reader, never the whole ledger. */
export const MAX_PAGE_SIZE = 1000

/* The cards Home can hold: what the tray offers, what the PUT validates against, and what the
   client switches on to draw one. Ordered as the tray offers them, so a new card is placed
   here rather than wherever it happens to be added.

   The key is the card's name in full, lower_snake_case. It was abbreviated while the catalogue
   was six cards that were each about a different thing; the moment a second card is about
   vendors, `vendors` names one of them and reads like it names both, and `saved` has four
   other cards printing a saving beside it. A short key is unambiguous only against the list
   that existed when it was chosen, and this list exists to be added to. Renaming what accounts
   already store is migrations/004. */
export const DASHBOARD_CARD_CATALOGUE = [
	{ key: 'spending_rhythm',      name: 'Spending rhythm',      desc: 'Average order, and which weekday you spend on' },
	{ key: 'category_breakdown',   name: 'Category breakdown',   desc: "Where this month's spend went, by category" },
	{ key: 'top_vendors',          name: 'Top vendors',          desc: 'The shops you spend the most at, all time' },
	{ key: 'top_categories',       name: 'Top categories',       desc: 'The kinds of thing you spend the most on, all time' },
	{ key: 'favourite_categories', name: 'Favourite categories', desc: 'The categories you starred, with spend and savings' },
	{ key: 'favourite_vendors',    name: 'Favourite vendors',    desc: 'The vendors you starred, with orders, spend and savings' },
	{ key: 'saved_vs_retail',      name: 'Saved vs retail',      desc: 'What you paid against the retail price, this month' },
	{ key: 'monthly_pace',         name: 'Monthly pace',         desc: 'Where the month lands if the rest of it looks like the start' }
]
