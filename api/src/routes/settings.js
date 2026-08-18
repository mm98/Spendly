import { Router } from 'express'
import { db } from '../db.js'
import { CURRENCIES, MAX_PAGE_SIZE, SPEND_KINDS, ORDER_STATUSES } from '../lib/constants.js'

export const router = Router()

const selectSettings = db.prepare(`
	SELECT default_kind, default_status, page_size, sort, show_scan_card, confirm_delete,
		card_rows, list_sort, currency
	FROM settings WHERE user_id = ?
`)
const upsertSettings = db.prepare(`
	INSERT INTO settings (user_id, default_kind, default_status, page_size, sort, show_scan_card,
		confirm_delete, card_rows, list_sort, currency)
	VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard, @confirmDelete,
		@cardRows, @listSort, @currency)
	ON CONFLICT (user_id) DO UPDATE SET
		default_kind = excluded.default_kind, default_status = excluded.default_status,
		page_size = excluded.page_size, sort = excluded.sort,
		show_scan_card = excluded.show_scan_card, confirm_delete = excluded.confirm_delete,
		card_rows = excluded.card_rows, list_sort = excluded.list_sort,
		currency = excluded.currency
`)

const toApi = row => ({
	defaultKind: row.default_kind, defaultStatus: row.default_status, pageSize: row.page_size,
	sort: row.sort, showScanCard: Boolean(row.show_scan_card), confirmDelete: Boolean(row.confirm_delete),
	cardRows: row.card_rows, listSort: row.list_sort, currency: row.currency
})

/* A setting is a value something else reads, so the values it can hold are the ones that
   something else understands. A page-size of 7 or a list sort of 'colour' would save, come
   back, and then be silently ignored by every control that reads it -- a stored preference
   nothing obeys is worse than no preference, because it says on the settings page that it is
   in force. Anything unrecognised falls back to what is already stored. */
export const CARD_ROWS = [1, 2, 4, 6, 8, 10]
export const ORDER_SORTS = [
	'date-desc', 'date-asc', 'amount-desc', 'amount-asc',
	'discount-desc', 'discount-asc', 'vendor-asc'
]
export const LIST_SORTS = ['name-asc', 'spend-desc', 'spend-asc', 'saved-desc', 'saved-asc']
const CURRENCY_CODES = CURRENCIES.map(c => c.code)
const oneOf = (allowed, asked, fallback) => (allowed.includes(asked) ? asked : fallback)

router.get('/', (req, res) => {
	const row = selectSettings.get(req.user.id)
	res.json(row ? toApi(row) : null)
})

router.patch('/', (req, res) => {
	const current = selectSettings.get(req.user.id)
	const currentApi = current ? toApi(current) : {
		defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10, sort: 'date-desc',
		showScanCard: true, confirmDelete: true, cardRows: 6, listSort: 'name-asc', currency: 'DKK'
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
		defaultStatus: oneOf(ORDER_STATUSES, String(next.defaultStatus ?? ''), currentApi.defaultStatus),
		// Same bounds the list route enforces on its own param -- a stored preference outside
		// them would save, come back, and be clamped by every read anyway; storing what will
		// actually be obeyed keeps the settings page honest about what is in force.
		pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(next.pageSize) || 10))),
		sort: oneOf(ORDER_SORTS, next.sort, currentApi.sort),
		showScanCard: next.showScanCard ? 1 : 0, confirmDelete: next.confirmDelete ? 1 : 0,
		cardRows: oneOf(CARD_ROWS, Number(next.cardRows), currentApi.cardRows),
		listSort: oneOf(LIST_SORTS, next.listSort, currentApi.listSort),
		/* The code only, upper-cased so 'dkk' from a script is the same preference 'DKK' is.
		   Nothing here converts a figure: the currency names what the amounts already were. */
		currency: oneOf(CURRENCY_CODES, String(next.currency ?? '').toUpperCase(), currentApi.currency)
	})
	res.json(toApi(selectSettings.get(req.user.id)))
})
