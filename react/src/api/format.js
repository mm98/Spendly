/* Danish number grammar, kept in one place.

   The prototype writes 1.187,25 -- a dot groups thousands and a comma separates the
   decimals -- and it writes that string in two shapes: with the ore (24.418,57 kr.) where
   the figure is a total the user could reconcile against a receipt, and rounded to whole
   kroner (18.420 kr.) where it is a summary. Both are below, because a component that
   picks the wrong one is a wrong claim about precision, not a formatting nit. See
   README: Language and Formats. */

const groups = whole => whole.replace(/\B(?=(\d{3})+$)/g, '.')

/** 1187.25 -> "1.187,25" */
export const amount = n => {
	const [whole, decimals] = Math.abs(n).toFixed(2).split('.')
	return (n < 0 ? '-' : '') + groups(whole) + ',' + decimals
}

/** 18420 -> "18.420" */
export const amountRound = n => (n < 0 ? '-' : '') + groups(String(Math.round(Math.abs(n))))

/** 1187.25 -> "1.187,25 kr." */
export const kr = n => amount(n) + ' kr.'

/** 18420 -> "18.420 kr." */
export const krRound = n => amountRound(n) + ' kr.'

/** 9.4 -> "9,4%" -- the separator is a comma here too. */
export const percent = (n, decimals = 1) =>
	n.toFixed(decimals).replace('.', ',') + '%'

/* The amount grammar as a parser and a validator, shared by every form that takes money.
   Nothing here is input[type=number] and nothing should be: type=number rejects the comma,
   so `value` comes back empty and min/max/step never run. inputmode gets the numeric
   keyboard; the parsing is ours. A dot groups thousands and never separates decimals,
   which makes 89.95 a typo to name rather than a number to guess at. README: Fields and Forms. */
export const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
/** The same grammar with a leading minus allowed. An item's price is the one signed money
    field -- a receipt line can be a discount (rabat), and it subtracts -- where retail and
    shipping never go below zero. parseAmount carries the sign through unchanged. */
export const SIGNED_AMOUNT_PATTERN = /^-?(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
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

/** "2026-07-18" -> "18 July" for a reader in Copenhagen, "July 18" for one in Chicago. */
export const dayMonth = iso => dayMonthFormat().format(dateOf(iso))

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
