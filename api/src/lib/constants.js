/* What the server validates against; the client's spendKinds mirrors SPEND_KINDS. Option
   lists the server never reads (sort labels, range chips) live in the client alone -- copies
   of them sat here once, imported by nothing, which is how a dead copy starts to drift. */
export const SPEND_KINDS = ['Expense', 'Gift', 'Sold', 'Work', 'Other']
// the kinds whose total came to the account, counted as a returned order is; the vendor totals'
// triggers (migrations/269_vendor_order_totals.sql) hold a copy, so a change needs a new migration
export const MONEY_BACK_KINDS = ['Sold']
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

/* The locales an account can print its dates and times in (migrations/013_locale.sql), and
   'auto' -- keep asking the browser -- is one of them rather than the absence of one.

   Only the codes are here, because a code is all the server validates. What each one is
   called, and what it renders, is the client's business and lives in its own mirrored list
   (react/src/api/format.js) the way the currency symbols do.

   The span is the span of the currencies above: an account that can keep its ledger in
   kroner, euros, dollars or pounds can print its dates the way those places write them. That
   is a line drawn somewhere rather than everywhere -- ICU knows several hundred locales and
   offering the lot would be a picker nobody can read -- and it moves by adding a code here
   and its label there, in the same commit or one of the two lists is lying about the other.

   A locale decides the shape of a date, the order of its parts and whether the clock runs to
   12 or 24, which is a different question from what language the words around it are in. */
export const LOCALES = ['auto', 'da-DK', 'sv-SE', 'nb-NO', 'de-DE', 'en-GB', 'en-US']

/* The languages Spendly's words can be shown in, apart from LOCALES; 'auto' follows the browser.
   In step with LANGUAGES in react/src/language/phrases.js. */
export const LANGUAGES = ['auto', 'en', 'da']

/* The most rows one orders-list page may carry, enforced wherever a page size enters -- the
   list route's query param and the stored settings value. LIMIT is the one place a caller's
   number reaches SQL, and without a ceiling `?pageSize=100000000` (or no pageSize at all, on
   a large account) returned every matched row, decorated, in one response. 1000 is an
   order of magnitude above the UI's largest offered size (100) -- room for an export-ish
   reader, never the whole ledger. */
export const MAX_PAGE_SIZE = 1000

// The largest file one upload may carry; the client states the same number (OrderNew's MAX_MB).
export const MAX_UPLOAD_MB = 25

// the share of a limit a warning starts at for an account that never chose one; the column's default holds a copy
export const NOTIFY_EARLY_DEFAULT = 90

/* The periods a category's limit can be for; the first is the default. The column's check
   (migrations/290_categories_budget_period.sql) and react/src/api/client.js hold copies. */
export const CATEGORY_BUDGET_PERIODS = ['month', 'year']
