/* Danish number grammar: a dot groups thousands and a comma separates decimals. Ore where a
   figure can be checked against a receipt (24.418,57 kr.), whole kroner in a summary (18.420 kr.). */

const groups = whole => whole.replace(/\B(?=(\d{3})+$)/g, '.')

/** The locale whose grammar this is, for a library control that formats or reads numbers itself. */
export const NUMBER_LOCALE = 'da-DK'

/** 1187.25 -> "1.187,25", and (18420, 0) -> "18.420". */
export const amount = (n, decimals = 2) => {
	const [whole, rest] = Math.abs(n).toFixed(decimals).split('.')
	return (n < 0 ? '-' : '') + groups(whole) + (rest ? ',' + rest : '')
}

/** 18420 -> "18.420". */
export const amountRound = n => amount(n, 0)

/** 2 -> "2", 1.5 -> "1,5": a count is not money, so trailing zeros go. */
export const quantity = n => amount(n, 2).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '')

/** 60000 -> "60k", 2500 -> "2,5k", 500 -> "500": a chart axis's own shorthand. */
export const compactAmount = n => {
	if (Math.abs(n) < 1000) return amount(n, 0)
	const k = n / 1000
	return (Number.isInteger(k) ? amount(k, 0) : amount(k, 1)) + 'k'
}

/** Whether a figure printed at `decimals` shows a saving: it is green only when it reads above zero. */
export const isSaving = (n, decimals = 2) => Math.round((Number(n) || 0) * 10 ** decimals) > 0

/* The currencies an account can keep, in step with the server's CURRENCIES
   (api/src/lib/constants.js). The symbol does not always follow the figure: "$1.187,25". */
export const CURRENCIES = [
	{ code: 'DKK', symbol: 'kr.', before: false, label: 'Danish krone' },
	{ code: 'SEK', symbol: 'kr', before: false, label: 'Swedish krona' },
	{ code: 'NOK', symbol: 'kr', before: false, label: 'Norwegian krone' },
	{ code: 'EUR', symbol: '€', before: true, label: 'Euro' },
	{ code: 'USD', symbol: '$', before: true, label: 'US dollar' },
	{ code: 'GBP', symbol: '£', before: true, label: 'Pound sterling' }
]

// one value for the whole session, set where the settings arrive (routes.jsx) and where they are saved
let active = CURRENCIES[0]
export const setCurrency = code => { active = CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0] }

/** The symbol for the unit label beside a money input. */
export const currencySymbol = () => active.symbol

/** 1187.25 -> "1.187,25 kr.", and (18420, 0) -> "18.420 kr.". Two decimals unless asked: a
    summary asks for the rounding, so a total can never lose its ore by omission. */
export const currency = (n, decimals = 2) => {
	const figure = amount(n, decimals)
	if (!active.before) return figure + ' ' + active.symbol
	// the minus sits outside the symbol: "-$99,50", never "$-99,50"
	return figure.startsWith('-') ? '-' + active.symbol + figure.slice(1) : active.symbol + figure
}

/** The full stop after a sentence that ends in an amount: "kr." carries one already, "$20" does not. */
export const fullStop = () => (active.symbol.endsWith('.') ? '' : '.')

/** 9.4 -> "9,4%", and 4567.8 -> "4.567,8%": grouped as every figure is. */
export const percent = (n, decimals = 1) => amount(n, decimals) + '%'

/* The amount grammar every money field parses and checks. No field is type=number, which
   refuses the comma; a dot only groups thousands, so 89.95 is a typo to name, never a number. */
export const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
export const parseAmount = v => Number(String(v).replace(/\./g, '').replace(',', '.'))

/* Dates are written in the reader's chosen locale, a setting rather than navigator.language; an
   ISO date is built from its local parts, since new Date("2026-07-18") is UTC and a day early in the west. */

/* The locales an account can choose, in step with the server's LOCALES (api/src/lib/constants.js).
   'auto' keeps asking the browser; a label names the region whose way of writing dates it is. */
export const LOCALES = [
	{ code: 'auto', label: 'Match my browser' },
	{ code: 'da-DK', label: 'Danish' },
	{ code: 'sv-SE', label: 'Swedish' },
	{ code: 'nb-NO', label: 'Norwegian' },
	{ code: 'de-DE', label: 'German' },
	{ code: 'en-GB', label: 'English (UK)' },
	{ code: 'en-US', label: 'English (US)' }
]

// undefined is what Intl reads as the browser's own; set where the settings arrive and are saved
let activeLocale
export const setLocale = code => {
	activeLocale = LOCALES.some(l => l.code === code) && code !== 'auto' ? code : undefined
}
/** What the formatters are actually using: a code, or undefined for the browser's own. */
export const activeLocaleCode = () => activeLocale

/* A new account's first guess, from the machine's timezone: only zones that land on a locale
   LOCALES offers are listed, everything else stays 'auto'. */
const ZONE_LOCALES = new Map(Object.entries({
	'Europe/Copenhagen': 'da-DK',
	'Europe/Stockholm': 'sv-SE',
	'Europe/Oslo': 'nb-NO',
	'Europe/Berlin': 'de-DE', 'Europe/Busingen': 'de-DE',
	'Europe/London': 'en-GB',
	'America/New_York': 'en-US', 'America/Detroit': 'en-US', 'America/Chicago': 'en-US',
	'America/Denver': 'en-US', 'America/Phoenix': 'en-US', 'America/Los_Angeles': 'en-US',
	'America/Anchorage': 'en-US', 'America/Adak': 'en-US', 'America/Boise': 'en-US',
	'America/Juneau': 'en-US', 'America/Nome': 'en-US', 'America/Sitka': 'en-US',
	'America/Yakutat': 'en-US', 'America/Menominee': 'en-US', 'America/Indiana/Indianapolis': 'en-US',
	'America/Kentucky/Louisville': 'en-US', 'America/North_Dakota/Center': 'en-US',
	'Pacific/Honolulu': 'en-US'
}))

/** The locale to register a new account with. Never throws: a guess must not fail a registration. */
export const detectLocale = () => {
	try {
		return ZONE_LOCALES.get(new Intl.DateTimeFormat().resolvedOptions().timeZone) ?? 'auto'
	} catch {
		return 'auto'
	}
}

// built once per locale, never once for good: the locale can change without a reload
const formatter = options => {
	let built, builtFor
	return () => {
		if (built && builtFor === activeLocale) return built
		builtFor = activeLocale
		return (built = new Intl.DateTimeFormat(activeLocale, options))
	}
}
const dayShortMonthFormat = formatter({ day: 'numeric', month: 'short' })
const dayShortMonthYearFormat = formatter({ day: 'numeric', month: 'short', year: 'numeric' })
const longDateFormat = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
const shortDateFormat = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' })
const dayMonthFormat = formatter({ day: '2-digit', month: '2-digit' })
// the shortest date and time a locale has, so a reader sees what a locale looks like before choosing it
const sampleFormat = formatter({ dateStyle: 'short', timeStyle: 'short' })

const shortMonthFormat = formatter({ month: 'short' })
const longMonthFormat = formatter({ month: 'long' })

/** The twelve month names in the reader's own locale: short ones head a column, long ones are
    what a screen reader says. A locale's closing full stop ("okt.") is left off a heading. */
export const monthNames = (style = 'short') => Array.from({ length: 12 }, (_, m) => {
	const name = (style === 'long' ? longMonthFormat : shortMonthFormat)().format(new Date(2026, m, 1))
	return style === 'long' ? name : name.replace(/\.$/, '')
})

const dateOf = iso => {
	const [y, m, d] = String(iso).split('-').map(Number)
	return new Date(y, m - 1, d)
}
const thisYear = date => date.getFullYear() === new Date().getFullYear()

/** "2026-08-03" -> "3 Aug", with the year once it is not this one (3b). */
export const dayShortMonth = iso => {
	const date = dateOf(iso)
	return (thisYear(date) ? dayShortMonthFormat() : dayShortMonthYearFormat()).format(date)
}

/** "2026-07-18" -> "18 July 2026", in the reader's own order. */
export const longDate = iso => longDateFormat().format(dateOf(iso))

/** "2026-07-18" -> "18.07.2026", the form the summary rows use, in the reader's own order. */
export const shortDate = iso => shortDateFormat().format(dateOf(iso))

/** "2026-08-08" -> "08.08", with the year once it is not this one: a date in a line that has little room (5k). */
export const dayMonth = iso => {
	const date = dateOf(iso)
	return (thisYear(date) ? dayMonthFormat() : shortDateFormat()).format(date)
}

/** What a locale renders, for the picker that offers it, from a fixed instant. */
const SAMPLE_AT = new Date('2026-08-18T12:26:00Z')
export const localeSample = code => {
	const was = activeLocale
	setLocale(code)
	const shown = sampleFormat().format(SAMPLE_AT)
	activeLocale = was
	return shown
}

/** Today as YYYY-MM-DD on the local clock: toISOString() alone is UTC, and dates a late evening tomorrow. */
export const today = () => {
	const now = new Date()
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/* The separator stored attachment metas were written with, the same character as the API's
   api/src/lib/copy.js. Changing it needs a migration of the stored metas. */
export const sep = ' • '

/** The separator between facts on one line of the interface: "3 items · 1.240,00 kr.". */
export const dot = ' · '

/** "1 item", "3 items", "1.500 orders": singular below 2, thousands grouped as every figure is. */
export const plural = (n, noun, pluralNoun = `${noun}s`) => `${amount(n, 0)} ${n === 1 ? noun : pluralNoun}`
