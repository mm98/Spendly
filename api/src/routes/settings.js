import { Router } from 'express'
import { db } from '../db.js'
import { CURRENCIES, LANGUAGES, LOCALES, MAX_PAGE_SIZE, NOTIFY_EARLY_DEFAULT, SPEND_KINDS } from '../lib/constants.js'
import { statusKeys } from '../lib/statuses.js'
import { looksOf, setLooks } from '../lib/looks.js'
import { mailAvailable } from '../lib/mail.js'
import { DEFAULT_SCHEME, SCHEME_IDS } from '../lib/schemes.js'
import { STATUS_EMAILS, chooseStatusEmail, sendTestStatusEmail } from '../lib/statusEmail.js'
import { words } from '../lib/phrases.js'

export const router = Router()

const selectSettings = db.prepare(`
	SELECT default_kind, default_status, page_size, sort, list_sort, currency, locale, language, density,
		notify_while_saving, notify_monthly_summary, notify_early, scan_overrides, sidebar, compare_month, recent_rows, colour_scheme, status_email_weekly, status_email_monthly
	FROM user_settings WHERE user_id = ?
`)
const upsertSettings = db.prepare(`
	INSERT INTO user_settings (user_id, default_kind, default_status, page_size, sort,
		list_sort, currency, locale, language, density, notify_while_saving, notify_monthly_summary,
		notify_early, scan_overrides, sidebar, compare_month, recent_rows, colour_scheme)
	VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @listSort, @currency, @locale, @language, @density,
		@notifyWhileSaving, @notifyMonthlySummary, @notifyEarly, @scanOverrides, @sidebar, @compareMonth, @recentRows, @colourScheme)
	ON CONFLICT (user_id) DO UPDATE SET
		default_kind = excluded.default_kind, default_status = excluded.default_status,
		page_size = excluded.page_size, sort = excluded.sort, list_sort = excluded.list_sort,
		currency = excluded.currency, locale = excluded.locale, language = excluded.language, density = excluded.density,
		notify_while_saving = excluded.notify_while_saving, notify_monthly_summary = excluded.notify_monthly_summary,
		notify_early = excluded.notify_early, scan_overrides = excluded.scan_overrides,
		sidebar = excluded.sidebar, compare_month = excluded.compare_month, recent_rows = excluded.recent_rows,
		colour_scheme = excluded.colour_scheme
`)

const toApi = row => ({
	defaultKind: row.default_kind, defaultStatus: row.default_status, pageSize: row.page_size,
	sort: row.sort, listSort: row.list_sort, currency: row.currency, locale: row.locale, language: row.language, density: row.density,
	notifyWhileSaving: Boolean(row.notify_while_saving), notifyMonthlySummary: Boolean(row.notify_monthly_summary),
	notifyEarly: row.notify_early, scanOverrides: Boolean(row.scan_overrides), sidebar: row.sidebar, compareMonth: row.compare_month,
	recentRows: row.recent_rows, colourScheme: SCHEME_IDS.includes(row.colour_scheme) ? row.colour_scheme : DEFAULT_SCHEME,
	statusEmailWeekly: Boolean(row.status_email_weekly), statusEmailMonthly: Boolean(row.status_email_monthly)
})

/* A setting is a value something else reads, so the values it can hold are the ones that
   something else understands. A page-size of 7 or a list sort of 'colour' would save, come
   back, and then be silently ignored by every control that reads it -- a stored preference
   nothing obeys is worse than no preference, because it says on the settings page that it is
   in force. Anything unrecognised falls back to what is already stored. */
export const ORDER_SORTS = [
	'date-desc', 'date-asc', 'amount-desc', 'amount-asc',
	'discount-desc', 'discount-asc', 'vendor-asc'
]
export const LIST_SORTS = ['name-asc', 'spend-desc', 'spend-asc', 'saved-desc', 'saved-asc']
const CURRENCY_CODES = CURRENCIES.map(c => c.code)
const DENSITIES = ['comfortable', 'compact']
const SIDEBARS = ['open', 'rail']
const COMPARES = ['last', 'year']
// the share of a limit a warning starts at; 100 is "only when over"
const EARLY = [75, 90, 100]
// how many orders Home's Recent orders card can show
const RECENT_ROWS = Array.from({ length: 15 }, (_, i) => i + 1)
const oneOf = (allowed, asked, fallback) => (allowed.includes(asked) ? asked : fallback)
// a switch takes only true or false; anything else keeps what is stored
const onOff = (asked, fallback) => (typeof asked === 'boolean' ? asked : fallback) ? 1 : 0

router.get('/', (req, res) => {
	const row = selectSettings.get(req.user.id)
	res.json(row ? { ...toApi(row), looks: looksOf(req.user.id) } : null)
})

/** The status email (20f): which of Weekly and Monthly are on, saved the moment one is switched.
    The browser's time zone and locale come with it, since the email is written and sent with no browser to ask. */
router.put('/status-email', (req, res) => {
	const chosen = Object.fromEntries(STATUS_EMAILS.map(f => [f, req.body?.[f]]))
	if (!Object.values(chosen).every(v => typeof v === 'boolean')) return res.status(400).json({ error: words('settings.statusEmailChoice') })
	chooseStatusEmail(req.user.id, { ...chosen, zone: String(req.body?.zone ?? ''), locale: String(req.body?.locale ?? '') })
	res.json({ ...toApi(selectSettings.get(req.user.id)), looks: looksOf(req.user.id) })
})

// one test a minute per account (11a)
const TEST_EVERY_MS = 60 * 1000
const lastTest = new Map()

/** Send a test email (11a): answers the address it went to. */
router.post('/status-email/test', async (req, res) => {
	if (!mailAvailable()) return res.status(503).json({ error: words('mail.unavailable') })
	const wait = (lastTest.get(req.user.id) ?? 0) + TEST_EVERY_MS - Date.now()
	if (wait > 0) return res.status(429).json({ error: words('settings.testFailed'), retryAfter: Math.ceil(wait / 1000) })
	lastTest.set(req.user.id, Date.now())
	try {
		res.json({ email: await sendTestStatusEmail(req.user.id, { zone: String(req.body?.zone ?? ''), locale: String(req.body?.locale ?? '') }) })
	} catch (e) {
		console.error(`[mail] test status email: ${e.message}`)
		res.status(502).json({ error: words('settings.testFailed') })
	}
})

router.patch('/', (req, res) => {
	const current = selectSettings.get(req.user.id)
	const currentApi = current ? toApi(current) : {
		defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10, sort: 'date-desc',
		listSort: 'name-asc', currency: 'DKK', locale: 'auto', language: 'auto', density: 'comfortable',
		notifyWhileSaving: true, notifyMonthlySummary: true, notifyEarly: NOTIFY_EARLY_DEFAULT, scanOverrides: true, sidebar: 'open', compareMonth: 'last',
		recentRows: 5, colourScheme: DEFAULT_SCHEME
	}
	const next = { ...currentApi, ...req.body }
	upsertSettings.run({
		userId: req.user.id,
		/* The same fall-back-to-stored rule every neighbour below already follows, which the
		   comment above this route has promised all along -- these two were written verbatim, so
		   'garbage-kind' stored and came back as the in-force default (refused later by every
		   draft it prefilled), and a non-string JSON value (true, {}) threw at bind time and
		   answered 500. String() folds those into strings that miss the allowlist. */
		defaultKind: oneOf(SPEND_KINDS, String(next.defaultKind ?? ''), currentApi.defaultKind),
		defaultStatus: oneOf(statusKeys(req.user.id), String(next.defaultStatus ?? ''), currentApi.defaultStatus),
		// Same bounds the list route enforces on its own param -- a stored preference outside
		// them would save, come back, and be clamped by every read anyway; storing what will
		// actually be obeyed keeps the settings page honest about what is in force.
		pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(next.pageSize) || 10))),
		sort: oneOf(ORDER_SORTS, next.sort, currentApi.sort),
		listSort: oneOf(LIST_SORTS, next.listSort, currentApi.listSort),
		/* The code only, upper-cased so 'dkk' from a script is the same preference 'DKK' is.
		   Nothing here converts a figure: the currency names what the amounts already were. */
		currency: oneOf(CURRENCY_CODES, String(next.currency ?? '').toUpperCase(), currentApi.currency),
		/* The code exactly as offered, case included: unlike a currency there is nothing to
		   normalise towards, since 'da-DK' and 'da-dk' are the same locale to ICU but only one
		   of them is in the list, and folding case here would mean deciding which half of a
		   language tag is which. A code that is not on the list keeps what is stored -- the
		   same rule as every neighbour, and the one that matters most here: an unrecognised
		   locale reaching Intl.DateTimeFormat throws a RangeError rather than falling back,
		   so a stored value nothing validates is every date in the product replaced by an
		   error boundary. */
		locale: oneOf(LOCALES, String(next.locale ?? ''), currentApi.locale),
		language: oneOf(LANGUAGES, String(next.language ?? ''), currentApi.language),
		density: oneOf(DENSITIES, String(next.density ?? ''), currentApi.density),
		notifyWhileSaving: onOff(next.notifyWhileSaving, currentApi.notifyWhileSaving),
		notifyMonthlySummary: onOff(next.notifyMonthlySummary, currentApi.notifyMonthlySummary),
		notifyEarly: oneOf(EARLY, Number(next.notifyEarly), currentApi.notifyEarly),
		scanOverrides: onOff(next.scanOverrides, currentApi.scanOverrides),
		sidebar: oneOf(SIDEBARS, String(next.sidebar ?? ''), currentApi.sidebar),
		compareMonth: oneOf(COMPARES, String(next.compareMonth ?? ''), currentApi.compareMonth),
		recentRows: oneOf(RECENT_ROWS, next.recentRows, currentApi.recentRows),
		colourScheme: oneOf(SCHEME_IDS, String(next.colourScheme ?? ''), currentApi.colourScheme)
	})
	setLooks(req.user.id, req.body?.looks)
	res.json({ ...toApi(selectSettings.get(req.user.id)), looks: looksOf(req.user.id) })
})
