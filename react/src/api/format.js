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

/** 2 -> "2", 1.5 -> "1,5" -- two decimals like the money fields, trailing zeros trimmed,
    because a count is not money and "2,00 pcs" is a precision nobody typed. */
export const quantity = n => amount(n, 2).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '')

/** 60000 -> "60k", 2500 -> "2,5k", 500 -> "500" -- a chart axis's own shorthand: a label
    repeated down a chart's edge cannot carry a total's full grammar without crowding it out. */
export const compactAmount = n => {
	if (Math.abs(n) < 1000) return amount(n, 0)
	const k = n / 1000
	return (Number.isInteger(k) ? amount(k, 0) : amount(k, 1)) + 'k'
}

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

   One pattern, because no money field a user types is signed: a discount is its own field,
   entered as the amount taken off, not a negative price -- which also means it can be typed on
   a phone, whose decimal keypad has no minus key. README: Fields and Forms. */
export const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
export const parseAmount = v => Number(String(v).replace(/\./g, '').replace(',', '.'))

/* Drops what AMOUNT_PATTERN would reject: a sign, a letter, a second comma, a third decimal, a
   separator before the first digit. A misplaced grouping dot is left to the save -- guessing
   whether a dot is grouping or a typo would change a figure nobody asked to change. */
export const sanitizeAmount = v => {
	const kept = v.replace(/[^0-9.,]/g, '').replace(/^[.,]+/, '')
	const [whole, ...decimals] = kept.split(',')
	return decimals.length ? whole + ',' + decimals.join('').slice(0, 2) : whole
}

/* Dates read in the reader's own locale, not in one this file picks.

   A date's *shape* is the reader's: 18 July, July 18 and 18.07 are the same day written the
   way three people expect to see it. Money is the other way round and stays Danish above --
   an amount's grammar is shared with the field that takes it back, so display and parsing
   move together or not at all. README: Language and Formats.

   `Intl.DateTimeFormat(undefined, ...)` resolves to navigator.language, which is the browser's
   *UI language*, not the reader's regional format -- a separate preference no web API exposes.
   Passing `undefined` therefore answers a question nobody asked, so the locale is a setting,
   passed explicitly, defaulting to the browser only as its initial guess.

   Three traps this file has to keep clear of, all of which render a plausible wrong answer
   rather than failing:

   A formatter is expensive to build and these run per row, so they are built once -- but the
   locale can now change without a reload, so "once" is once per locale rather than once. A
   cache that never invalidates would leave every date in the product on the previous choice
   until the tab was reloaded, which reads as a setting that did not save.

   An unknown locale throws. `new Intl.DateTimeFormat('nonsense')` raises a RangeError rather
   than falling back, so a stored code that is not a real tag is every date in the product
   replaced by an error boundary. Only codes from LOCALES are ever passed.

   And an ISO date is not an instant. `new Date("2026-07-18")` parses as midnight *UTC*, so
   formatting it anywhere west of UTC renders the 17th -- every date in the product off by
   one, for every reader in the Americas, with no error anywhere. `dateOf` builds from local
   components instead, which is the same calendar day in every zone. Instants (localStamp)
   are the opposite case: they carry a zone and are meant to be converted. */

/* The locales an account can print its dates in, mirroring the server's LOCALES
   (api/src/lib/constants.js) the way CURRENCIES mirrors its own. The code is what is stored
   and validated; the label is presentation, which is why it lives here.

   'auto' is a real choice rather than the absence of one: it means keep asking the browser,
   which is right for every reader whose browser language and region already agree. It is first
   because it is the default, and it is named for what it does rather than for what it resolves
   to -- a reader who moves or changes their browser keeps getting the right answer without
   coming back here.

   The labels name the region, not the language, because the region is what the reader is
   choosing: 'Danish' here means dates written the Danish way, in a product whose copy stays
   English either way. */
export const LOCALES = [
	{ code: 'auto', label: 'Match my browser' },
	{ code: 'da-DK', label: 'Danish' },
	{ code: 'sv-SE', label: 'Swedish' },
	{ code: 'nb-NO', label: 'Norwegian' },
	{ code: 'de-DE', label: 'German' },
	{ code: 'en-GB', label: 'English (UK)' },
	{ code: 'en-US', label: 'English (US)' }
]

/* The account's chosen locale, held here rather than passed through every call site, for the
   same reason the currency is: it is one value for the whole session. `undefined` is what
   Intl takes to mean "the browser's own", so 'auto' resolves to it rather than to a code.

   setLocale is called where the settings arrive (routes.jsx) and where they are saved. */
let activeLocale
export const setLocale = code => {
	activeLocale = LOCALES.some(l => l.code === code) && code !== 'auto' ? code : undefined
}
/** What the formatters are actually using: a code, or undefined for the browser's own. */
export const activeLocaleCode = () => activeLocale

/* Where the reader is, guessed once at registration from the one thing the browser will
   answer honestly -- its IANA timezone. That is a fact about the machine, not about the
   browser's UI language, so it is the only signal here that can tell a Dane running an
   English browser from an American running one.

   It is a guess and it is treated as one: only zones that land on a locale this list already
   offers are mapped, everything else stays 'auto', and the reader is shown the setting with
   the answer already selected rather than having it applied behind them. A traveller or a
   VPN gets one wrong preselection and one click, which is the whole cost of being wrong.

   The table is small because the offer is small -- six regions, so six regions' zones, and it
   can never need to grow past LOCALES. The United States is the ragged one: its zones name
   cities rather than the country, so the ones a browser actually reports are listed. */
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

/** The locale to register a new account with: a code from LOCALES, or 'auto' where the
    browser's zone says nothing this list can offer. Never throws -- resolvedOptions is
    available everywhere the app runs, but a value read for a guess should not be able to
    fail a registration. */
export const detectLocale = () => {
	try {
		return ZONE_LOCALES.get(new Intl.DateTimeFormat().resolvedOptions().timeZone) ?? 'auto'
	} catch {
		return 'auto'
	}
}

const formatter = options => {
	let built, builtFor
	return () => {
		if (built && builtFor === activeLocale) return built
		builtFor = activeLocale
		return (built = new Intl.DateTimeFormat(activeLocale, options))
	}
}
const dayMonthFormat = formatter({ day: 'numeric', month: 'long' })
const dayMonthYearFormat = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
const longDateFormat = formatter({ day: 'numeric', month: 'long', year: 'numeric' })
const shortDateFormat = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' })
const stampFormat = formatter({ dateStyle: 'long', timeStyle: 'short' })
/* A date and a time in the shortest shape each locale has, for showing a reader what a
   locale looks like before they choose it. A picker offering 'Danish' and 'English (UK)' is
   asking about a rendering nobody can see from the label. */
const sampleFormat = formatter({ dateStyle: 'short', timeStyle: 'short' })

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
    the clock the reader is standing in: "12. august 2026 kl. 11.30" for a reader in
    Copenhagen, "August 12, 2026 at 2:30 AM" for one in Los Angeles.

    Unlike the dates above, converting is the whole point: a machine records an instant in
    UTC and a person reads it where they are.

    The zone is left unnamed: naming it matters for a stamp that might be read by someone in
    another zone, but the only stamp this product prints is shown to one signed-in reader on
    their own machine, in their own clock, beside the words "Image built" -- naming the zone
    there would only tell a reader in Copenhagen GMT+2 about their own afternoon.

    dateStyle/timeStyle rather than spelled-out components because the two refuse to share an
    options bag with timeZoneName, and with the zone gone the pair is available: it is the
    join each locale actually uses ("kl.", "at", "um") and it drops en-US's misleading
    zero-padded 12-hour "02:26 PM" for "2:26 PM". */
export const localStamp = iso => {
	const at = new Date(iso)
	return Number.isNaN(at.getTime()) ? null : stampFormat().format(at)
}

/** What a locale renders, for the picker that offers it: "18.08.2026, 14.26" against
    "8/18/26, 2:26 PM". Built from a fixed instant so the sample is about the locale rather
    than about the minute the settings page was opened, and formatted through the same cache
    every other date in the product goes through, so a sample cannot claim a shape the app
    does not produce. */
const SAMPLE_AT = new Date('2026-08-18T12:26:00Z')
export const localeSample = code => {
	const was = activeLocale
	setLocale(code)
	const shown = sampleFormat().format(SAMPLE_AT)
	activeLocale = was
	return shown
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
