import { Router } from 'express'
import { db } from '../db.js'
import { CURRENCIES, LOCALES, MAX_PAGE_SIZE, SPEND_KINDS } from '../lib/constants.js'
import { statusKeys } from '../lib/statuses.js'

export const router = Router()

const selectSettings = db.prepare(`
	SELECT default_kind, default_status, page_size, sort, list_sort, currency, locale, density,
		notify_while_saving, notify_monthly_summary, notify_email, notify_early, scan_overrides
	FROM settings WHERE user_id = ?
`)
// show_scan_card and confirm_delete are NOT NULL without a default, so a first write fills them
const upsertSettings = db.prepare(`
	INSERT INTO settings (user_id, default_kind, default_status, page_size, sort, show_scan_card,
		confirm_delete, list_sort, currency, locale, density, notify_while_saving, notify_monthly_summary,
		notify_email, notify_early, scan_overrides)
	VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, 1, 1, @listSort, @currency, @locale, @density,
		@notifyWhileSaving, @notifyMonthlySummary, @notifyEmail, @notifyEarly, @scanOverrides)
	ON CONFLICT (user_id) DO UPDATE SET
		default_kind = excluded.default_kind, default_status = excluded.default_status,
		page_size = excluded.page_size, sort = excluded.sort, list_sort = excluded.list_sort,
		currency = excluded.currency, locale = excluded.locale, density = excluded.density,
		notify_while_saving = excluded.notify_while_saving, notify_monthly_summary = excluded.notify_monthly_summary,
		notify_email = excluded.notify_email, notify_early = excluded.notify_early,
		scan_overrides = excluded.scan_overrides
`)

const toApi = row => ({
	defaultKind: row.default_kind, defaultStatus: row.default_status, pageSize: row.page_size,
	sort: row.sort, listSort: row.list_sort, currency: row.currency, locale: row.locale, density: row.density,
	notifyWhileSaving: Boolean(row.notify_while_saving), notifyMonthlySummary: Boolean(row.notify_monthly_summary),
	notifyEmail: Boolean(row.notify_email), notifyEarly: row.notify_early, scanOverrides: Boolean(row.scan_overrides)
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
// the share of a limit a warning starts at; 100 is "only when over"
const EARLY = [75, 90, 100]
const oneOf = (allowed, asked, fallback) => (allowed.includes(asked) ? asked : fallback)
// a switch takes only true or false; anything else keeps what is stored
const onOff = (asked, fallback) => (typeof asked === 'boolean' ? asked : fallback) ? 1 : 0

router.get('/', (req, res) => {
	const row = selectSettings.get(req.user.id)
	res.json(row ? toApi(row) : null)
})

router.patch('/', (req, res) => {
	const current = selectSettings.get(req.user.id)
	const currentApi = current ? toApi(current) : {
		defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10, sort: 'date-desc',
		listSort: 'name-asc', currency: 'DKK', locale: 'auto', density: 'comfortable',
		notifyWhileSaving: true, notifyMonthlySummary: true, notifyEmail: true, notifyEarly: 90, scanOverrides: true
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
		density: oneOf(DENSITIES, String(next.density ?? ''), currentApi.density),
		notifyWhileSaving: onOff(next.notifyWhileSaving, currentApi.notifyWhileSaving),
		notifyMonthlySummary: onOff(next.notifyMonthlySummary, currentApi.notifyMonthlySummary),
		notifyEmail: onOff(next.notifyEmail, currentApi.notifyEmail),
		notifyEarly: oneOf(EARLY, Number(next.notifyEarly), currentApi.notifyEarly),
		scanOverrides: onOff(next.scanOverrides, currentApi.scanOverrides)
	})
	res.json(toApi(selectSettings.get(req.user.id)))
})
