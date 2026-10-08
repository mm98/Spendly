import { db } from '../db.js'
import { newId } from './ids.js'
import { keyOfType } from './statuses.js'
import { fromEpoch, nowEpoch, toEpoch } from './dates.js'
import { findVendorIdByAnyName, findVendorIdForReceipt, resolveVendor } from './findOrCreate.js'
import { describe } from './categorySuggest.js'
import { sep, fileSizeLabel } from './copy.js'

/* An order not created yet (migrations/236): the form as it was left, and its scan when it has one.
   The API shows a draft as an order with status Draft; Create makes the order. */

export const readings = new Map() // the readings in flight, by upload id

/* An upload nobody holds goes 24 hours after it arrived (3c, 17a); one a draft holds stays while it does. */
export const UPLOAD_TTL_SECONDS = 24 * 60 * 60

/* ---- what a reading starts the form with ---- */

const selectFormDefaults = db.prepare('SELECT default_status, default_kind, scan_overrides FROM settings WHERE user_id = ?')
const selectVendorName = db.prepare('SELECT name FROM vendors WHERE id = ? AND user_id = ?')
/* A possible duplicate: the same vendor within two weeks of the read date, nearest first. Wider would
   flag every order from a vendor the account buys from often. */
const selectPossibleDuplicate = db.prepare(`
	SELECT id, date, item_count, total FROM orders
	WHERE user_id = @userId AND vendor_id = @vendorId AND date BETWEEN @from AND @to
	ORDER BY ABS(date - @target) ASC LIMIT 1`)

// what each kind of document sets when the account lets a scan override its defaults (Settings, Defaults)
const FROM_DOCUMENT = {
	receipt: { status: 'delivered' }, order_confirmation: { status: 'ordered' },
	return: { status: 'returned' }, sale: { kind: 'Sold' }
}

/** The new order's status and kind: the account's defaults, or what the document shows when the
    account lets a scan override them. A status the account has deleted keeps the default. */
function startingValues(userId, settings, read) {
	const own = { status: settings?.default_status ?? keyOfType(userId, 'delivered'), kind: settings?.default_kind ?? 'Expense' }
	const found = FROM_DOCUMENT[read?.documentType]
	if (!found || (settings && !settings.scan_overrides)) return own
	return { status: (found.status && keyOfType(userId, found.status)) || own.status, kind: found.kind ?? own.kind }
}

/** A line read from a file keeps one key, so the form's marks find their line again later. */
export const lineKey = (uploadId, index) => `${uploadId}.${index}`

/** The review form's starting values from a reading, or the blank form when nothing was read (`failure`:
    'billing', 'failed', 'unread' or 'empty'). `look` leaves out what only the open review uses. */
export function answerOf({ userId, today }, upload, read, failure, { look = false } = {}) {
	const settings = selectFormDefaults.get(userId)
	const vendorOf = look ? (id, name) => resolveVendor(id, name)?.id : findVendorIdByAnyName
	const file = {
		key: upload.id, name: upload.name, kind: upload.kind, hasThumbnail: Boolean(upload.has_thumbnail), pages: upload.pages ?? null,
		meta: `${upload.kind === 'pdf' ? 'PDF' : 'Image'}${sep}${fileSizeLabel(upload.size)}`
	}

	if (!read?.lines.length) {
		const partial = read ? findVendorIdForReceipt(userId, read, vendorOf) : null
		return {
			documentKey: upload.id, file,
			vendor: read ? (partial ? selectVendorName.get(partial, userId)?.name : read.vendor) : '',
			vendorMatched: Boolean(partial), date: read?.date ?? today,
			...startingValues(userId, settings, read),
			deliveredDate: today, returnedDate: today, reference: read?.reference ?? '',
			shipping: 0, discount: 0, linesRead: 0, lines: [], remainder: null, total: null,
			failure: read ? 'empty' : failure === 'billing' ? 'billing' : process.env.ANTHROPIC_API_KEY ? 'failed' : 'unread',
			found: read ? { vendor: read.vendor, date: read.date } : null,
			reconciled: failure === 'billing'
				? 'This document was not read: the reading service reports a billing problem, such as no credits left. Add the line items and totals below yourself, or upload it again once that is fixed.'
				: process.env.ANTHROPIC_API_KEY
					? 'This document could not be read automatically. Add the line items and totals below yourself.'
					: 'This document has not been read automatically. Add the line items and totals below yourself.',
			checks: [], unclear: [], duplicate: null, suggestions: []
		}
	}

	const vendorId = findVendorIdForReceipt(userId, read, vendorOf)
	const vendorMatched = Boolean(vendorId)
	const vendorName = vendorId ? selectVendorName.get(vendorId, userId)?.name : null

	let duplicate = null
	if (!look && vendorId && read.date) {
		const target = toEpoch(read.date)
		const row = selectPossibleDuplicate.get({ userId, vendorId, target, from: target - 14 * 86400, to: target + 14 * 86400 })
		if (row) duplicate = {
			orderId: row.id, title: fromEpoch(row.date),
			meta: `${row.item_count} item${row.item_count === 1 ? '' : 's'}`, total: row.total
		}
	}

	return {
		documentKey: upload.id, file, failure: null, found: null,
		// the scan's own category suggestions, as they stand against the account's categories now
		suggestions: look ? [] : describe(userId, read.suggestions ?? []),
		reference: read.reference ?? '', unclear: read.unclear ?? [],
		// A match means the vendor record is the answer; the scanned string only speaks where
		// there was no vendor to match it to.
		vendor: vendorMatched ? vendorName : read.vendor, vendorMatched,
		date: read.date ?? today,
		...startingValues(userId, settings, read),
		deliveredDate: read.date ?? today, returnedDate: today,
		shipping: read.shipping, discount: read.discount, linesRead: read.lines.length,
		lines: read.lines.map((l, i) => ({
			id: lineKey(upload.id, i), title: l.title, quantity: l.quantity, price: l.price, retail: l.retail ?? null,
			uncertain: l.uncertain, unclearPart: l.unclearPart ?? null,
			meta: l.uncertain ? 'Not clearly printed -- check this line.' : undefined
		})),
		// The printed total or null, never the lines' own sum: the review checks the lines against it.
		remainder: null, total: read.total,
		reconciled: read.total != null
			? 'Matched against the document’s own printed total.'
			: 'No printed total was found on the document to check the lines against.',
		checks: [
			{
				id: 'vendor', warning: !vendorMatched,
				title: vendorMatched ? `Matched to ${vendorName}` : 'New vendor — will be created',
				// all three things a receipt is matched by (5h), as it printed them
				meta: [read.vendor, read.vatNumber ? `CVR ${read.vatNumber}` : null, read.website].filter(Boolean).join(sep)
			},
			{
				id: 'total', warning: read.total == null,
				title: read.total != null ? 'Printed total found' : 'No printed total found',
				meta: read.total != null ? undefined : 'The lines below are all that was read.'
			},
			// pricesAsPrintedIncludeVat is a fact about the source document; null means it could not
			// tell either way, which is worth a warning: nothing converted a figure that may have needed it.
			read.pricesAsPrintedIncludeVat === null
				? { id: 'vat', warning: true, title: 'Could not tell if VAT was included', meta: 'Check the line prices against the document.' }
				: {
					id: 'vat', warning: false,
					title: read.pricesAsPrintedIncludeVat
						? 'Prices already included VAT'
						: `Converted from ex-VAT prices${read.vatRate != null ? ` at ${read.vatRate}%` : ''}`
				},
			...(read.converted
				? [read.converted.rate
					? { id: 'currency', warning: false, from: read.converted.from, to: read.converted.to, title: `Changed from ${read.converted.from} to ${read.converted.to}`,
						meta: `1 ${read.converted.from} = ${read.converted.rate} ${read.converted.to}, the rate on the date of the document. Check the amounts.` }
					: { id: 'currency', warning: true, from: read.converted.from, to: read.converted.to, title: `The document is in ${read.converted.from}`,
						meta: `The amounts below are not changed. Change them to ${read.converted.to} yourself.` }]
				: []),
			...(read.linesFromTotals
				? [{ id: 'lineTotals', warning: false, title: 'Price per item worked out from the line amount',
					meta: `${read.linesFromTotals === 1 ? 'One line' : `${read.linesFromTotals} lines`} showed the amount for all items. It is divided by the quantity.` }]
				: [])
		],
		duplicate
	}
}

/* ---- the drafts ---- */

const insertDraft = db.prepare('INSERT INTO order_drafts (id, user_id, upload_id) VALUES (?, ?, ?) ON CONFLICT (upload_id) DO NOTHING')
const selectDraftOfUpload = db.prepare('SELECT id FROM order_drafts WHERE upload_id = ? AND user_id = ?')
const DRAFT_COLUMNS = `d.id, d.rowid AS seq, d.form, d.created_at, d.upload_id, u.name, u.size, u.kind, u.pages, u.sha256,
	(u.thumbnail IS NOT NULL) AS has_thumbnail, u.ai_read_json`
const selectDrafts = db.prepare(`SELECT ${DRAFT_COLUMNS} FROM order_drafts d LEFT JOIN scan_uploads u ON u.id = d.upload_id
	WHERE d.user_id = ?`)
const selectDraft = db.prepare(`SELECT ${DRAFT_COLUMNS} FROM order_drafts d LEFT JOIN scan_uploads u ON u.id = d.upload_id
	WHERE d.id = ? AND d.user_id = ?`)
const countDrafts = db.prepare('SELECT COUNT(*) c FROM order_drafts WHERE user_id = ?')

/** The draft of an upload, made now if it has none. */
export function draftOfUpload(userId, uploadId) {
	insertDraft.run(newId('od'), userId, uploadId)
	return selectDraftOfUpload.get(uploadId, userId)?.id ?? null
}
/** The draft holding an upload, or null; nothing is made. */
export const heldBy = (userId, uploadId) => selectDraftOfUpload.get(uploadId, userId)?.id ?? null
export const draftRow = (userId, id) => selectDraft.get(id, userId) ?? null
export const draftCount = userId => countDrafts.get(userId).c

const parse = text => { try { return text ? JSON.parse(text) : null } catch { return null } }
const uploadOf = row => ({ id: row.upload_id, name: row.name, size: row.size, kind: row.kind, pages: row.pages, has_thumbnail: row.has_thumbnail })

/** The form as it was left, or as the reading starts it when it was never changed. */
function formOf(row, answer) {
	const kept = parse(row.form)
	if (kept) return { values: kept.values ?? {}, lines: Array.isArray(kept.lines) ? kept.lines : [], files: Array.isArray(kept.files) ? kept.files : [] }
	return {
		values: answer
			? { vendor: answer.vendor ?? '', date: answer.date, kind: answer.kind, categories: [], shipping: answer.shipping || 0, discount: answer.discount || 0, reference: answer.reference ?? '', note: '' }
			: {},
		lines: (answer?.lines ?? []).map(l => ({
			key: l.id, title: l.title, quantity: l.quantity, price: l.price, retail: l.retail, uncertain: l.uncertain, unclearPart: l.unclearPart, include: true
		})),
		files: []
	}
}

const amountOf = v => Number(v) || 0
const sameValue = (a, b) => (typeof a === 'number' || typeof b === 'number' ? amountOf(a) === amountOf(b) : String(a ?? '') === String(b ?? ''))
const EDITABLE = ['vendor', 'date', 'shipping', 'discount']

/** How many of a reading's values still need a look (3a): the same count the review's notice gives. */
export function stillToLook(answer, form) {
	const unsure = form.lines.filter(l => l.uncertain && l.unclearPart !== 'title').length
	const fields = (answer.unclear ?? []).filter(f => !EDITABLE.includes(f) || sameValue(form.values[f], answer[f])).length
	const looks = (answer.vendorMatched ? 0 : 1) + (answer.total == null ? 1 : 0)
		+ (answer.checks?.some(c => c.id === 'vat' && c.warning) ? 1 : 0) + (answer.checks ?? []).filter(c => c.id === 'currency').length
	return looks + unsure + fields
}

const words = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** What is left to check on a draft (Home 10a): "2 values need a look", "4 lines", "Still reading", "Nothing read". */
function leftOf(answer, form, reading) {
	if (reading) return 'Still reading'
	const kept = form.lines.filter(l => l.include !== false).length
	if (!answer?.linesRead) return kept ? words(kept, 'line', 'lines') : 'Nothing read'
	const looks = stillToLook(answer, form)
	return looks ? `${looks} ${looks === 1 ? 'value needs' : 'values need'} a look` : words(kept, 'line', 'lines')
}

/** The order's sums from the form, as the orders table keeps them (migrations/001). */
function sumsOf(form) {
	const kept = form.lines.filter(l => l.include !== false && l.price != null)
	const paid = kept.reduce((s, l) => s + amountOf(l.price) * amountOf(l.quantity), 0)
	const retail = kept.reduce((s, l) => s + Math.max(amountOf(l.retail ?? l.price), amountOf(l.price)) * amountOf(l.quantity), 0)
	const discount = amountOf(form.values.discount)
	return { any: kept.length > 0, total: paid + amountOf(form.values.shipping) - discount, saved: retail - paid + discount, discount }
}

const selectCategories = db.prepare('SELECT id, name FROM categories WHERE user_id = ?')

/** Every draft of an account as an order, or the one `only` names: what the order list, its filters and Home read. */
export function draftsAsOrders(userId, only = null) {
	const rows = only ? [selectDraft.get(only, userId)].filter(Boolean) : selectDrafts.all(userId)
	if (!rows.length) return []
	const status = keyOfType(userId, 'draft')
	const categories = new Map(selectCategories.all(userId).map(c => [c.name.toLowerCase(), c]))
	return rows.map(row => {
		const read = parse(row.ai_read_json)
		const scanned = fromEpoch(row.created_at)
		const answer = row.upload_id ? answerOf({ userId, today: scanned }, uploadOf(row), read, null, { look: true }) : null
		const form = formOf(row, answer)
		const reading = Boolean(row.upload_id && readings.has(row.upload_id))
		const v = form.values
		const sums = sumsOf(form)
		const vendor = String(v.vendor ?? '').trim()
		const own = (v.categories ?? []).map(name => categories.get(String(name).toLowerCase())).filter(Boolean)
		const lines = form.lines.filter(l => l.include !== false)
		return {
			id: row.id,
			date: /^\d{4}-\d{2}-\d{2}$/.test(v.date ?? '') ? v.date : scanned,
			status, kind: v.kind ?? null, reference: v.reference ?? '', note: v.note ?? '',
			photo: null, photoCount: 0,
			vendor: vendor ? { name: vendor } : null, vendorImage: null,
			categories: own.map(c => ({ id: c.id, name: c.name })),
			itemCount: lines.length,
			total: sums.any ? sums.total : null,
			saved: sums.any ? sums.saved : 0,
			itemTitles: lines.map(l => l.title).filter(Boolean),
			photos: [], fileCount: (row.upload_id ? 1 : 0) + form.files.length, receipt: null,
			// what the order list and Home draw only for a draft
			draft: {
				scanned,
				file: row.upload_id ? { key: row.upload_id, name: row.name, kind: row.kind, hasThumbnail: Boolean(row.has_thumbnail) } : null,
				reading, left: row.upload_id ? leftOf(answer, form, reading) : null
			},
			// what the order list's filters and sorts read, never sent
			sort: {
				date: toEpoch(/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? '') ? v.date : scanned), created: row.created_at, seq: row.seq,
				total: sums.any ? sums.total : 0, discount: sums.discount, saved: sums.any ? sums.saved : 0,
				vendor: vendor || row.name || '', vendorId: vendor ? resolveVendor(userId, vendor)?.id ?? null : null,
				categoryIds: own.map(c => c.id), text: [vendor, v.reference, v.note, ...lines.map(l => l.title), ...own.map(c => c.name)].join('\n').toLowerCase()
			}
		}
	})
}

/** A draft as a list row: what the order list and Home draw, without what only the filters read. */
export const draftListRow = (d, { itemTitles = false, listRows = false } = {}) => {
	const { sort, itemTitles: titles, photos, fileCount, receipt, ...row } = d
	return { ...row, ...(itemTitles ? { itemTitles: titles.slice(0, 3) } : {}), ...(listRows ? { photos, fileCount, receipt } : {}) }
}

/* ---- keeping and dropping ---- */

const updateForm = db.prepare('UPDATE order_drafts SET form = ? WHERE id = ? AND user_id = ?')
const deleteDraftFiles = db.prepare('DELETE FROM order_draft_files WHERE draft_id = ?')
const insertDraftFile = db.prepare(`INSERT OR IGNORE INTO order_draft_files (draft_id, upload_id)
	SELECT @draftId, id FROM scan_uploads WHERE id = @uploadId AND user_id = @userId`)
const MAX_FORM = 512 * 1024

/** Keeps the form as it is on screen; the uploads it names stay with the draft. False when there is no such draft. */
export const keepForm = db.transaction((userId, id, form) => {
	const row = selectDraft.get(id, userId)
	if (!row) return false
	const text = JSON.stringify({ values: form?.values ?? {}, lines: form?.lines ?? [], files: form?.files ?? [] })
	if (text.length > MAX_FORM) throw Object.assign(new Error('The draft is too large to keep.'), { status: 413 })
	updateForm.run(text, id, userId)
	deleteDraftFiles.run(id)
	const held = [...(form?.files ?? []).map(f => f?.key), ...(form?.lines ?? []).map(l => l?.photo?.key)]
	for (const uploadId of new Set(held.filter(k => typeof k === 'string' && k !== row.upload_id)))
		insertDraftFile.run({ draftId: id, uploadId, userId })
	return true
})

const selectDraftUploads = db.prepare(`SELECT upload_id FROM order_drafts WHERE id = @id AND upload_id IS NOT NULL
	UNION SELECT upload_id FROM order_draft_files WHERE draft_id = @id`)
const deleteDraft = db.prepare('DELETE FROM order_drafts WHERE id = ? AND user_id = ?')
const heldElsewhere = db.prepare(`SELECT 1 FROM order_drafts WHERE upload_id = @uploadId
	UNION ALL SELECT 1 FROM order_drafts d JOIN order_draft_files f ON f.draft_id = d.id WHERE d.user_id = @userId AND f.upload_id = @uploadId LIMIT 1`)
const deleteUpload = db.prepare('DELETE FROM scan_uploads WHERE id = ? AND user_id = ?')
const renewUpload = db.prepare('UPDATE scan_uploads SET expires_at = ? WHERE id = ? AND user_id = ?')
const fileOnAnOrder = db.prepare('SELECT 1 FROM attachments a JOIN orders o ON o.id = a.order_id WHERE o.user_id = ? AND a.sha256 = ? LIMIT 1')
const forgetReading = db.prepare('DELETE FROM scan_readings WHERE user_id = ? AND sha256 = ?')

/** Discard (6d): the draft goes, and with it its file, the files it holds and the reading -- unless
    another draft holds an upload, or an order holds the same file. */
export const discardDraft = db.transaction((userId, id) => {
	const row = selectDraft.get(id, userId)
	if (!row) return false
	const uploads = selectDraftUploads.all({ id }).map(u => u.upload_id)
	deleteDraft.run(id, userId)
	for (const uploadId of uploads) if (!heldElsewhere.get({ uploadId, userId })) deleteUpload.run(uploadId, userId)
	if (row.sha256 && !fileOnAnOrder.get(userId, row.sha256)) forgetReading.run(userId, row.sha256)
	return true
})

/** Create: the draft becomes the order, so it goes; its uploads stay a day for the order's save to file them. */
export function takeDraft(userId, id) {
	const row = selectDraft.get(id, userId)
	if (!row) return
	const uploads = selectDraftUploads.all({ id }).map(u => u.upload_id)
	deleteDraft.run(id, userId)
	for (const uploadId of uploads) renewUpload.run(nowEpoch() + UPLOAD_TTL_SECONDS, uploadId, userId)
}
