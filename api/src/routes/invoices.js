import { Router } from 'express'
import { db } from '../db.js'
import { fromEpoch } from '../lib/dates.js'
import { cleanRecipient, drawInvoice, invoiceFor, senderOf } from '../lib/invoice.js'

/* Make invoice (Invoice 24c, 24d): who the invoice is for, who sends it, and the PDF itself, or its
   first page as the dialog's preview. */

export const router = Router()

// the preview is the page at 40%, drawn at twice that for a sharp screen
const PREVIEW_WIDTH = 636

const selectRecipient = db.prepare('SELECT name, country, cvr, vat_number, address, att FROM user_invoice_recipients WHERE user_id = ?')
const upsertRecipient = db.prepare(`INSERT INTO user_invoice_recipients (user_id, name, country, cvr, vat_number, address, att)
	VALUES (@userId, @name, @country, @cvr, @vatNumber, @address, @att)
	ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, country = excluded.country, cvr = excluded.cvr,
		vat_number = excluded.vat_number, address = excluded.address, att = excluded.att`)
const selectOrderVendor = db.prepare(`SELECT o.date, v.id, v.name, v.country, v.cvr, v.vat_number, v.address
	FROM orders o JOIN vendors v ON v.id = o.vendor_id WHERE o.id = ? AND o.user_id = ?`)

// the recipient of the last downloaded invoice, so the dialog opens with it; null before the first
router.get('/recipient', (req, res) => {
	const row = selectRecipient.get(req.user.id)
	res.json(row ? {
		name: row.name ?? '', country: row.country, cvr: row.cvr ?? '', vatNumber: row.vat_number ?? '',
		address: row.address ? row.address.split('\n') : [], att: row.att ?? ''
	} : null)
})

// who sends the invoice, and what its From box lacks (24d)
router.get('/orders/:id/sender', (req, res) => {
	const row = selectOrderVendor.get(req.params.id, req.user.id)
	if (!row) return res.status(404).json({ error: 'No order ' + req.params.id })
	const sender = senderOf(row, fromEpoch(row.date))
	res.json({
		vendorId: row.id, name: row.name, country: row.country, cvr: row.cvr ?? '',
		missing: sender.missing, unknownNumber: sender.unknownNumber
	})
})

// the invoice's first page as a PNG, for the dialog's preview; a read, so it does not empty the account's read cache
router.get('/orders/:id/preview', async (req, res, next) => {
	try {
		const json = text => { try { return JSON.parse(String(text ?? 'null')) } catch { return null } }
		const made = await invoiceFor(req.user.id, req.params.id, cleanRecipient(json(req.query.recipient)),
			String(req.query.locale ?? 'da-DK'), json(req.query.vendor))
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
		const made = await invoiceFor(req.user.id, req.params.id, recipient, String(req.body?.locale ?? 'da-DK'))
		if (!made) return res.status(404).json({ error: 'No order ' + req.params.id })
		const pdf = await drawInvoice(made)
		if (!pdf) return res.status(500).json({ error: 'The invoice could not be made. Try again.' })
		upsertRecipient.run({
			userId: req.user.id, name: recipient.name, country: recipient.country, cvr: recipient.cvr, vatNumber: recipient.vatNumber,
			address: recipient.address.join('\n') || null, att: recipient.att
		})
		res.set('Content-Type', 'application/pdf')
		res.set('Content-Disposition', `attachment; filename="${made.fileName.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(made.fileName)}`)
		res.set('Cache-Control', 'no-store')
		res.send(pdf)
	} catch (e) { next(e) }
})
