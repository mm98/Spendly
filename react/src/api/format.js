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
export const WHOLE_NUMBER_PATTERN = /^\d+$/
export const parseAmount = v => Number(String(v).replace(/\./g, '').replace(',', '.'))

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-07-18" -> "18 July" */
export const dayMonth = iso => {
	const [, m, d] = iso.split('-')
	return Number(d) + ' ' + MONTHS[Number(m) - 1]
}

/** "2026-07-18" -> "18 July 2026" */
export const longDate = iso => dayMonth(iso) + ' ' + iso.slice(0, 4)

/** "2026-07-18" -> "18.07.2026", the form the summary rows use */
export const shortDate = iso => {
	const [y, m, d] = iso.split('-')
	return d + '.' + m + '.' + y
}

/** Today in the input's own YYYY-MM-DD, built from the local clock rather than
    toISOString() on its own -- that is UTC, and it dates an evening purchase in
    Copenhagen to tomorrow for two hours every night. */
export const today = () => {
	const now = new Date()
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
