/* Danish number grammar, kept in one place.

   The prototype writes 1.187,25 -- a dot groups thousands and a comma separates the
   decimals -- and it writes that string in two shapes: with the ore (24.418,57 kr.) where
   the figure is a total the user could reconcile against a receipt, and rounded to whole
   kroner (18.420 kr.) where it is a summary. Both are below, because a component that
   picks the wrong one is a wrong claim about precision, not a formatting nit. See
   README: Language and Formats. */

const groups = whole => whole.replace(/\B(?=(\d{3})+$)/g, '.')

/** 1187.25 -> "1.187,25", and (18420, 0) -> "18.420". */
export const amount = (n, decimals = 2) => {
	const [whole, rest] = Math.abs(n).toFixed(decimals).split('.')
	return (n < 0 ? '-' : '') + groups(whole) + (rest ? ',' + rest : '')
}

/** 18420 -> "18.420". Kept as its own name because "rounded" is what the call sites mean. */
export const amountRound = n => amount(n, 0)

/* The currencies an account can keep its ledger in, mirroring the server's CURRENCIES
   (api/src/lib/constants.js) the way spendKinds mirrors SPEND_KINDS. The code is what is
   stored; the symbol and the side it sits on are presentation, which is why they live here
   and not in the column. DKK, SEK and NOK all print "kr" and are three different amounts of
   money -- the code is what tells them apart.

   The symbol does not always follow the figure: "1.187,25 kr." but "$1.187,25". */
export const CURRENCIES = [
	{ code: 'DKK', symbol: 'kr.', before: false, label: 'Danish kroner' },
	{ code: 'SEK', symbol: 'kr', before: false, label: 'Swedish kronor' },
	{ code: 'NOK', symbol: 'kr', before: false, label: 'Norwegian kroner' },
	{ code: 'EUR', symbol: '€', before: true, label: 'Euro' },
	{ code: 'USD', symbol: '$', before: true, label: 'US dollars' },
	{ code: 'GBP', symbol: '£', before: true, label: 'Pounds sterling' }
]

/* The account's own currency, held here rather than passed through all hundred call sites.
   It is one value for the whole session -- every figure on every screen belongs to one
   ledger, so a component asking "which currency" is asking about the account, not about
   itself, and threading it through would be a parameter that is never once allowed to
   differ. setCurrency is called where the settings arrive (App.jsx) and where they are
   saved; until then it is the shipped default, which is also what every pre-existing
   account's figures already meant. */
let active = CURRENCIES[0]
export const setCurrency = code => { active = CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0] }
export const activeCurrency = () => active

/** Just the symbol, for the unit label sitting beside a money input. Eleven fields wrote
    "kr." into the markup by hand, so every amount a USD account typed was labelled in
    kroner by the form that took it -- while the figure it rendered underneath said
    dollars. */
export const currencySymbol = () => active.symbol

/** 1187.25 -> "1.187,25 kr.", and (18420, 0) -> "18.420 kr.", in the account's currency.

    `decimals` defaults to 2 rather than 0 deliberately. The two shapes are a claim about
    precision, not a formatting nit -- the ore where a figure is a total someone could
    reconcile against a receipt, whole units where it is a summary -- and of the two, the one
    that is safe to arrive at by forgetting the argument is the exact one. A default of 0
    would mean a call site that says nothing quietly restates 18.420,49 as 18.420, which is a
    wrong number rather than a noisy one. Summaries ask for the rounding; totals cannot lose
    it by omission. */
export const currency = (n, decimals = 2) => {
	const figure = amount(n, decimals)
	if (!active.before) return figure + ' ' + active.symbol
	/* The minus sits outside the symbol: "-$99,50", never "$-99,50". A prefix currency puts
	   two characters in front of the digits and they are not interchangeable -- the sign is a
	   fact about the amount, the symbol about the ledger. No field a user types is signed now,
	   but plenty of figures the app computes are (a delta, a saving against a cheaper retail,
	   a discount line in a summary), so this stays. */
	return figure.startsWith('-') ? '-' + active.symbol + figure.slice(1) : active.symbol + figure
}

/** The full stop that closes a sentence ending in an amount, which belongs to the currency
    rather than to the copy: "kr." carries one already and "$20" does not, so a hardcoded
    stop renders "99,00 kr.." in kroner and omitting one leaves "$99.00" hanging in dollars.
    Both halves of that shipped. Five call sites wrote the stop and printed the doubled one;
    a sixth had the doubling reported, deleted its own full stop, and left the other five
    -- which is why this is a function and not a note above each of them. */
export const fullStop = () => (active.symbol.endsWith('.') ? '' : '.')

/** 9.4 -> "9,4%" -- the separator is a comma here too. */
export const percent = (n, decimals = 1) =>
	n.toFixed(decimals).replace('.', ',') + '%'

/* The amount grammar as a parser and a validator, shared by every form that takes money.
   Nothing here is input[type=number] and nothing should be: type=number rejects the comma,
   so `value` comes back empty and min/max/step never run. inputmode gets the numeric
   keyboard; the parsing is ours. A dot groups thousands and never separates decimals,
   which makes 89.95 a typo to name rather than a number to guess at.

   One pattern, because no money field a user types is signed. A rabat used to be a line item
   with a negative price, which needed a second signed grammar beside this one -- and could not
   be typed at all on a phone, whose decimal keypad has no minus key. It is the order's own
   discount field now, entered as the amount taken off. README: Fields and Forms. */
export const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
export const WHOLE_NUMBER_PATTERN = /^\d+$/
export const parseAmount = v => Number(String(v).replace(/\./g, '').replace(',', '.'))

/* Dates read in the reader's own locale, not in one this file picks.

   A date's *shape* is the reader's: 18 July, July 18 and 18.07 are the same day written the
   way three people expect to see it, and the browser already knows which one is standing in
   front of it. Money is the other way round and stays Danish below -- an amount's grammar is
   shared with the field that takes it back, so display and parsing move together or not at
   all. README: Language and Formats.

   Two traps this file has to keep clear of, both of which render a plausible wrong answer
   rather than failing:

   A formatter is expensive to build and these run per row, so they are built once. The
   locale cannot change without a reload, so there is nothing to invalidate.

   And an ISO date is not an instant. `new Date("2026-07-18")` parses as midnight *UTC*, so
   formatting it anywhere west of UTC renders the 17th -- every date in the product off by
   one, for every reader in the Americas, with no error anywhere. `dateOf` builds from local
   components instead, which is the same calendar day in every zone. Instants (localStamp)
   are the opposite case: they carry a zone and are meant to be converted. */
const formatter = options => {
	let built
	return () => (built ??= new Intl.DateTimeFormat(undefined, options))
}
const dayMonthFormat = formatter({ day: 'numeric', month: 'long' })
const dayMonthYearFormat = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
const longDateFormat = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
const shortDateFormat = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' })
const stampFormat = formatter({
	day: 'numeric', month: 'long', year: 'numeric',
	hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
})

const dateOf = iso => {
	const [y, m, d] = String(iso).split('-').map(Number)
	return new Date(y, m - 1, d)
}

/** "2026-07-18" -> "18 July" for a reader in Copenhagen, "July 18" for one in Chicago -- but
    "17 January 2022" once the year isn't the reader's current one. A bare day and month reads
    as this year to anyone who doesn't stop to check, which is exactly the wrong default for an
    order that is several years old rather than several months. */
export const dayMonth = iso => {
	const date = dateOf(iso)
	const sameYear = date.getFullYear() === new Date().getFullYear()
	return (sameYear ? dayMonthFormat() : dayMonthYearFormat()).format(date)
}

/** "2026-07-18" -> "18 July 2026", in the reader's own order. */
export const longDate = iso => longDateFormat().format(dateOf(iso))

/** "2026-07-18" -> "18.07.2026", the form the summary rows use, in the reader's own order. */
export const shortDate = iso => shortDateFormat().format(dateOf(iso))

/** An instant -- a stamp that carries its own zone, like "2026-08-12T09:30:00Z" -- read in
    the clock the reader is standing in: "12 August 2026 at 11:30 CEST" in Copenhagen,
    "August 12, 2026 at 02:30 AM PDT" in Los Angeles.

    Unlike the dates above, converting is the whole point: a machine records an instant in
    UTC and a person reads it where they are. The zone is named in the text because a
    converted time with nothing marking its zone is indistinguishable from the raw one.
    Spelled in components rather than dateStyle/timeStyle -- those refuse to share an options
    bag with timeZoneName, and toLocaleString throws rather than ignoring it. */
export const localStamp = iso => {
	const at = new Date(iso)
	return Number.isNaN(at.getTime()) ? null : stampFormat().format(at)
}

/** Today in the input's own YYYY-MM-DD, built from the local clock rather than
    toISOString() on its own -- that is UTC, and it dates an evening purchase in
    Copenhagen to tomorrow for two hours every night. */
export const today = () => {
	const now = new Date()
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/* The copy separator, written once (README: Language and Formats). Every meta line, card
   title and toast joins its facts with this -- through the <Sep /> component in JSX text,
   or this constant inside a template string -- so changing the character is one edit here
   (and a migration for stored attachment metas, which bake it in at write time: see
   api/src/migrations/006 and 007). The API builds its metas from its own copy of this
   constant in api/src/lib/copy.js; the two state the same character or one of them is wrong. */
export const sep = ' • '

/** "1 item", "3 items" -- singular below 2 wherever a count is followed by its noun. */
export const plural = (n, noun, pluralNoun = `${noun}s`) => `${n} ${n === 1 ? noun : pluralNoun}`
