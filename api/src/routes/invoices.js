import { Router } from 'express'
import { db } from '../db.js'
import { fromEpoch } from '../lib/dates.js'
import { findCompany } from '../lib/cvrRegister.js'
import { cleanRecipient, drawInvoice, invoiceFor, senderOf } from '../lib/invoice.js'

/* Make invoice (Invoice 24c, 24d): who the invoice is for, the company a CVR number or a name finds,
   and the PDF itself, or its first page as the dialog's preview. */

export const router = Router()

// the preview is the page at 40%, drawn at twice that for a sharp screen
const PREVIEW_WIDTH = 636

const selectRecipient = db.prepare('SELECT typed, lookup, cvr, name, address, country, att FROM user_invoice_recipients WHERE user_id = ?')
const upsertRecipient = db.prepare(`INSERT INTO user_invoice_recipients (user_id, typed, lookup, cvr, name, address, country, att)
	VALUES (@userId, @typed, @lookup, @cvr, @name, @address, @country, @att)
	ON CONFLICT (user_id) DO UPDATE SET typed = excluded.typed, lookup = excluded.lookup, cvr = excluded.cvr, name = excluded.name,
		address = excluded.address, country = excluded.country, att = excluded.att`)
const selectOrderVendor = db.prepare(`SELECT o.date, v.id, v.name, v.country, v.cvr, v.vat_number, v.address
	FROM orders o JOIN vendors v ON v.id = o.vendor_id WHERE o.id = ? AND o.user_id = ?`)

// the last recipient an invoice was made for, so the dialog opens with it
router.get('/recipient', (req, res) => {
	const row = selectRecipient.get(req.user.id)
	res.json(row ? {
		typed: Boolean(row.typed), lookup: row.lookup ?? '', cvr: row.cvr, name: row.name,
		address: row.address ? row.address.split('\n') : [], country: row.country, att: row.att ?? ''
	} : null)
})

// a company by CVR number or name, from the register: { status, company }
router.get('/company', async (req, res, next) => {
	try {
		const query = String(req.query.q ?? '').trim().slice(0, 200)
		if (!query) return res.status(400).json({ error: 'Type a CVR number or a company name.' })
		const answer = await findCompany(query)
		// a spent day or a failed lookup can change without a write, so Try again asks again
		if (answer.status === 'limit' || answer.status === 'failed') res.set('Cache-Control', 'no-store')
		res.json(answer)
	} catch (e) { next(e) }
})

// who sends the invoice, and what its From box lacks (24d)
router.get('/orders/:id/sender', (req, res) => {
	const row = selectOrderVendor.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'No order ' + req.params.id })
	const sender = senderOf(row, fromEpoch(row.date))
	res.json({ vendorId: row.id, name: row.name, country: row.country, missing: sender.missing, unknownNumber: sender.unknownNumber })
})

// the invoice's first page as a PNG, for the dialog's preview; a read, so it does not empty the account's read cache
router.get('/orders/:id/preview', async (req, res, next) => {
	try {
		let raw = null
		try { raw = JSON.parse(String(req.query.recipient ?? 'null')) } catch {}
		const made = await invoiceFor(req.user.id, req.params.id, cleanRecipient(raw), String(req.query.locale ?? 'da-DK'))
		if (!made) return res.status(404).json({ error: 'No order ' + req.params.id })
		const png = await drawInvoice(made, { preview: PREVIEW_WIDTH })
		if (!png) return res.status(500).json({ error: 'The preview could not be drawn.' })
		res.set('Content-Type', 'image/png')
		res.set('Cache-Control', 'no-store')
		res.send(png)
	} catch (e) { next(e) }
})

// the invoice for an order as a PDF to download; it remembers its recipient for the next invoice
router.post('/orders/:id', async (req, res, next) => {
	try {
		const recipient = cleanRecipient(req.body?.recipient)
		if (!recipient) return res.status(400).json({ error: 'Name the company the invoice is for.' })
		const made = await invoiceFor(req.user.id, req.params.id, recipient, String(req.body?.locale ?? 'da-DK'))
		if (!made) return res.status(404).json({ error: 'No order ' + req.params.id })
		const pdf = await drawInvoice(made)
		if (!pdf) return res.status(500).json({ error: 'The invoice could not be made. Try again.' })
		const typed = Boolean(req.body?.typed)
		upsertRecipient.run({
			userId: req.user.id, typed: typed ? 1 : 0, lookup: typed ? null : String(req.body?.lookup ?? '').trim().slice(0, 200) || null,
			cvr: recipient.cvr, name: recipient.name, address: recipient.address.join('\n') || null, country: recipient.country, att: recipient.att
		})
		res.set('Content-Type', 'application/pdf')
		res.set('Content-Disposition', `attachment; filename="${made.fileName.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(made.fileName)}`)
		res.set('Cache-Control', 'no-store')
		res.send(pdf)
	} catch (e) { next(e) }
})
