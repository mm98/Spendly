import { Router } from 'express'
import { db } from '../db.js'

export const router = Router()

const selectSettings = db.prepare(`
	SELECT default_kind, default_status, page_size, sort, show_scan_card, confirm_delete
	FROM settings WHERE user_id = ?
`)
const upsertSettings = db.prepare(`
	INSERT INTO settings (user_id, default_kind, default_status, page_size, sort, show_scan_card, confirm_delete)
	VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard, @confirmDelete)
	ON CONFLICT (user_id) DO UPDATE SET
		default_kind = excluded.default_kind, default_status = excluded.default_status,
		page_size = excluded.page_size, sort = excluded.sort,
		show_scan_card = excluded.show_scan_card, confirm_delete = excluded.confirm_delete
`)

const toApi = row => ({
	defaultKind: row.default_kind, defaultStatus: row.default_status, pageSize: row.page_size,
	sort: row.sort, showScanCard: Boolean(row.show_scan_card), confirmDelete: Boolean(row.confirm_delete)
})

router.get('/', (req, res) => {
	const row = selectSettings.get(req.user.id)
	res.json(row ? toApi(row) : null)
})

router.patch('/', (req, res) => {
	const current = selectSettings.get(req.user.id)
	const currentApi = current ? toApi(current) : {
		defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10, sort: 'date-desc',
		showScanCard: true, confirmDelete: true
	}
	const next = { ...currentApi, ...req.body }
	upsertSettings.run({
		userId: req.user.id, defaultKind: next.defaultKind, defaultStatus: next.defaultStatus,
		pageSize: Number(next.pageSize) || 10, sort: next.sort,
		showScanCard: next.showScanCard ? 1 : 0, confirmDelete: next.confirmDelete ? 1 : 0
	})
	res.json(toApi(selectSettings.get(req.user.id)))
})
