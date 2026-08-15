import { Router } from 'express'
import { db } from '../db.js'

export const router = Router()

const selectSettings = db.prepare(`
	SELECT default_kind, default_status, page_size, sort, show_scan_card, confirm_delete,
		card_rows, list_sort
	FROM settings WHERE user_id = ?
`)
const upsertSettings = db.prepare(`
	INSERT INTO settings (user_id, default_kind, default_status, page_size, sort, show_scan_card,
		confirm_delete, card_rows, list_sort)
	VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard, @confirmDelete,
		@cardRows, @listSort)
	ON CONFLICT (user_id) DO UPDATE SET
		default_kind = excluded.default_kind, default_status = excluded.default_status,
		page_size = excluded.page_size, sort = excluded.sort,
		show_scan_card = excluded.show_scan_card, confirm_delete = excluded.confirm_delete,
		card_rows = excluded.card_rows, list_sort = excluded.list_sort
`)

const toApi = row => ({
	defaultKind: row.default_kind, defaultStatus: row.default_status, pageSize: row.page_size,
	sort: row.sort, showScanCard: Boolean(row.show_scan_card), confirmDelete: Boolean(row.confirm_delete),
	cardRows: row.card_rows, listSort: row.list_sort
})

/* A setting is a value something else reads, so the values it can hold are the ones that
   something else understands. A page-size of 7 or a list sort of 'colour' would save, come
   back, and then be silently ignored by every control that reads it -- a stored preference
   nothing obeys is worse than no preference, because it says on the settings page that it is
   in force. Anything unrecognised falls back to what is already stored. */
export const CARD_ROWS = [1, 2, 4, 6, 8, 10]
export const LIST_SORTS = ['name', 'spend', 'saved']
const oneOf = (allowed, asked, fallback) => (allowed.includes(asked) ? asked : fallback)

router.get('/', (req, res) => {
	const row = selectSettings.get(req.user.id)
	res.json(row ? toApi(row) : null)
})

router.patch('/', (req, res) => {
	const current = selectSettings.get(req.user.id)
	const currentApi = current ? toApi(current) : {
		defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10, sort: 'date-desc',
		showScanCard: true, confirmDelete: true, cardRows: 10, listSort: 'name'
	}
	const next = { ...currentApi, ...req.body }
	upsertSettings.run({
		userId: req.user.id, defaultKind: next.defaultKind, defaultStatus: next.defaultStatus,
		pageSize: Number(next.pageSize) || 10, sort: next.sort,
		showScanCard: next.showScanCard ? 1 : 0, confirmDelete: next.confirmDelete ? 1 : 0,
		cardRows: oneOf(CARD_ROWS, Number(next.cardRows), currentApi.cardRows),
		listSort: oneOf(LIST_SORTS, next.listSort, currentApi.listSort)
	})
	res.json(toApi(selectSettings.get(req.user.id)))
})
