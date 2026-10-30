/* Numbers follow the reader's chosen locale, as dates do: "24.418,57 kr." in Danish, "24,418.57 kr."
   in English. Ore where a figure can be checked against a receipt, whole kroner in a summary. */

import { phrase } from '../language/phrases.js'

const browserLocale = () => new Intl.NumberFormat().resolvedOptions().locale

/** The locale every figure is written in, for a library control that formats or reads numbers itself. */
export let NUMBER_LOCALE = browserLocale()

// built once per locale and precision, never once for good: the locale can change without a reload
const numberFormats = new Map()
const numberFormat = (fewest, most) => {
	const key = `${NUMBER_LOCALE} ${fewest} ${most}`
	if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(NUMBER_LOCALE, { minimumFractionDigits: fewest, maximumFractionDigits: most }))
	return numberFormats.get(key)
}
// the sign is written here, so a locale's own minus sign never splits one figure from the next
const signedFigure = (n, fewest, most) => {
	const figure = numberFormat(fewest, most).format(Math.abs(n))
	return (n < 0 && /[1-9]/.test(figure) ? '-' : '') + figure
}

/** 1187.25 -> "1.187,25", and (18420, 0) -> "18.420", in Danish. */
export const amount = (n, decimals = 2) => signedFigure(n, decimals, decimals)

/** 18420 -> "18.420". */
export const amountRound = n => amount(n, 0)

/** A count in a badge (Layout rules 15a): 248 -> "248", past four digits "9.999+", which is all a reader acts on. */
export const countBadge = n => (n > 9999 ? `${amount(9999, 0)}+` : amount(n, 0))

/** The photos past those shown, over a thumbnail's corner (17c): 7 -> "+7", and "+99" at most. */
export const morePhotos = n => `+${Math.min(n, 99)}`

/** 2 -> "2", 1.5 -> "1,5": a count is not money, so trailing zeros go. */
export const quantity = n => signedFigure(n, 0, 2)

/** 60000 -> "60k", 2500 -> "2,5k", 500 -> "500": a chart axis's own shorthand. */
export const compactAmount = n => {
	if (Math.abs(n) < 1000) return amount(n, 0)
	const k = n / 1000
	return (Number.isInteger(k) ? amount(k, 0) : amount(k, 1)) + 'k'
}

/** Whether a figure printed at `decimals` shows a saving: it is in the positive colour only when it reads above zero. */
export const isSaving = (n, decimals = 2) => Math.round((Number(n) || 0) * 10 ** decimals) > 0

/* The currencies an account can keep, in step with the server's CURRENCIES
   (api/src/lib/constants.js). The symbol does not always follow the figure: "$1.187,25". */
export const CURRENCIES = [
	{ code: 'DKK', symbol: 'kr.', before: false, label: 'currency.dkk' },
	{ code: 'SEK', symbol: 'kr', before: false, label: 'currency.sek' },
	{ code: 'NOK', symbol: 'kr', before: false, label: 'currency.nok' },
	{ code: 'EUR', symbol: '€', before: true, label: 'currency.eur' },
	{ code: 'USD', symbol: '$', before: true, label: 'currency.usd' },
	{ code: 'GBP', symbol: '£', before: true, label: 'currency.gbp' }
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

/* The amount grammar every money field parses and checks, in the reader's locale. No field is
   type=number, which refuses a comma; the grouping mark only groups, so in Danish 89.95 is a typo to name. */
const SPACES = ' \u00a0\u202f'
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const markOf = text => (SPACES.includes(text) ? `[${SPACES}]` : escaped(text))
const marks = () => {
	const parts = new Intl.NumberFormat(NUMBER_LOCALE).formatToParts(12345.6)
	return { group: markOf(parts.find(p => p.type === 'group')?.value ?? ','), decimal: escaped(parts.find(p => p.type === 'decimal')?.value ?? '.') }
}
const patternOf = ({ group, decimal }) => new RegExp(`^(\\d{1,3}(${group}\\d{3})+|\\d+)(${decimal}\\d{1,2})?$`)
export let AMOUNT_PATTERN = patternOf(marks())
export const parseAmount = v => {
	if (typeof v === 'number') return v
	const { group, decimal } = marks()
	return Number(String(v).replace(new RegExp(group, 'g'), '').replace(new RegExp(decimal), '.'))
}

/* Dates are written in the reader's chosen locale, a setting rather than navigator.language; an
   ISO date is built from its local parts, since new Date("2026-07-18") is UTC and a day early in the west. */

/* The locales an account can choose, in step with the server's LOCALES (api/src/lib/constants.js).
   'auto' keeps asking the browser; a label names the region whose way of writing dates it is. */
export const LOCALES = [
	{ code: 'auto', label: 'dateFormat.auto' },
	{ code: 'da-DK', label: 'dateFormat.danish' },
	{ code: 'sv-SE', label: 'dateFormat.swedish' },
	{ code: 'nb-NO', label: 'dateFormat.norwegian' },
	{ code: 'de-DE', label: 'dateFormat.german' },
	{ code: 'en-GB', label: 'dateFormat.englishUk' },
	{ code: 'en-US', label: 'dateFormat.englishUs' }
]

// undefined is what Intl reads as the browser's own; set where the settings arrive and are saved
let activeLocale
export const setLocale = code => {
	activeLocale = LOCALES.some(l => l.code === code) && code !== 'auto' ? code : undefined
	NUMBER_LOCALE = activeLocale ?? browserLocale()
	AMOUNT_PATTERN = patternOf(marks())
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

/** A date in `format` with an English short month cut to three letters ("Sept" -> "Sep"), as drawn (21a). */
export const withShortMonth = (format, date) => (format.resolvedOptions().locale.startsWith('en')
	? format.formatToParts(date).map(part => (part.type === 'month' ? part.value.slice(0, 3) : part.value)).join('')
	: format.format(date))
const longMonthFormat = formatter({ month: 'long' })

/** The twelve month names in the reader's own locale; a short one drops its closing full stop ("okt.").
    `head` is a month that stands alone or starts a label: capitalised in every locale, unlike running text. */
export const monthNames = (style = 'short', head = false) => Array.from({ length: 12 }, (_, m) => {
	const name = style === 'long' ? longMonthFormat().format(new Date(2026, m, 1)) : withShortMonth(shortMonthFormat(), new Date(2026, m, 1))
	const shown = style === 'long' ? name : name.replace(/\.$/, '')
	return head ? capitalised(shown) : shown
})

/** "august" -> "August": the first letter in the reader's own locale's capital. */
export const capitalised = text => text.charAt(0).toLocaleUpperCase(activeLocale) + text.slice(1)

const dateOf = iso => {
	const [y, m, d] = String(iso).split('-').map(Number)
	return new Date(y, m - 1, d)
}
const thisYear = date => date.getFullYear() === new Date().getFullYear()

/** "2026-08-03" -> "3 Aug", with the year once it is not this one (3b). */
export const dayShortMonth = iso => {
	const date = dateOf(iso)
	return withShortMonth(thisYear(date) ? dayShortMonthFormat() : dayShortMonthYearFormat(), date)
}

/** A moment in epoch seconds -> "2 Sep 2026", year always, in the reader's own order (Settings > Passkeys). */
export const dayShortMonthYear = seconds => withShortMonth(dayShortMonthYearFormat(), new Date(seconds * 1000))

const clockFormat = formatter({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const localDayOf = seconds => {
	const at = new Date(seconds * 1000)
	return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

/** Whether a moment in epoch seconds falls on the reader's today. */
export const isToday = seconds => localDayOf(seconds) === today()

/** The calendar day a moment in epoch seconds falls on, as words: Today, Yesterday, or "12 Oct", with the year
    once it is not this one (Ask 24a). */
export const dayWords = seconds => {
	const day = localDayOf(seconds)
	if (day === today()) return phrase('calendar.today')
	const before = new Date()
	before.setDate(before.getDate() - 1)
	if (day === localDayOf(before.getTime() / 1000)) return phrase('calendar.yesterday')
	return dayShortMonth(day)
}

/** When a message was sent: "14:32" today, and its day in front before today ("Yesterday 20:40", "12 Oct 20:40"). */
export const messageTime = seconds => {
	const clock = clockFormat().format(new Date(seconds * 1000))
	return isToday(seconds) ? clock : `${dayWords(seconds)} ${clock}`
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

/** "1 item", "3 items", "1.500 orders" in the language in use, thousands grouped as every figure is.
    `noun` names its phrase under count.*: 'order', 'item line'. */
export const plural = (n, noun) => phrase(`count.${noun.replace(/ (\w)/g, (_, c) => c.toUpperCase())}`, { count: n, shown: amount(n, 0) })
