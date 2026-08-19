import Anthropic from '@anthropic-ai/sdk'
import { decompressBlob } from './blobCompression.js'

/* The one place a scanned document's bytes are actually read. Everything in routes/scan.js
   around this stayed an honest blank draft until now -- see that route's own comment, and the
   one on Scan.jsx -- because nothing behind GET /scan/draft/:key looked at the file at all. This
   does, via Claude's vision: the same bytes lib/images.js already stores for the review screen's
   own preview (a PDF's original bytes, or an image's resized display copy) go to the model as a
   document or image content block, and a forced tool call is what gets a receipt's loose,
   inconsistent layout back as the fixed shape the review form already knows how to edit.

   No API key configured is a real, supported state -- not every install runs one -- so this
   never throws into its caller. It returns null for that, for a request failure, for a timeout,
   and for a response the model declined to fill in; routes/scan.js's fallback is exactly the
   draft this app shipped with before any of this existed. */

const MODEL = 'claude-sonnet-4-5-20250929'
const REQUEST_TIMEOUT_MS = 45_000

let client
function getClient() {
	if (!process.env.ANTHROPIC_API_KEY) return null
	if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS })
	return client
}

/* This app stores every money figure VAT-inclusive -- the amount that was actually paid --
   never the ex-VAT figure a B2B invoice often prints its lines in. A receipt is not consistent
   about which one it shows: a Danish paper receipt already prints inc-moms line prices, while
   an emailed invoice routinely prints ex-VAT unit prices with the VAT itself as one separate
   line near the total. So the model is asked to do the conversion itself -- it can already see
   which shape the document is in and what rate it states, which is exactly the read a fixed
   "assume 25% and move on" cannot do -- and to report what it did, so the review screen can
   show it rather than silently trust it. */
const READ_RECEIPT_TOOL = {
	name: 'read_receipt',
	description: 'Report the structured contents of a receipt, invoice or order confirmation, with every amount converted to include VAT.',
	input_schema: {
		type: 'object',
		properties: {
			vendor: { type: 'string', description: 'The store or company that issued the document, as printed.' },
			date: { type: 'string', description: 'The order or purchase date printed on the document, as YYYY-MM-DD.' },
			currency: { type: 'string', description: 'The ISO 4217 code of the currency the amounts are printed in, if it can be told (e.g. DKK, EUR, USD).' },
			pricesAsPrintedIncludeVat: { type: 'boolean', description: 'Whether the unit prices and total AS PRINTED on the document already include VAT (true for most Danish paper receipts) or are shown net of it with VAT added separately (common on emailed/PDF invoices). This describes the source document, not the numbers you report below -- those are always converted to include VAT regardless of this value.' },
			vatRate: { type: 'number', description: 'The VAT rate as a percentage (e.g. 25), if it is stated on the document or can be computed from a stated VAT amount. Omit if genuinely not determinable -- do not guess one.' },
			shipping: { type: 'number', description: 'A shipping or delivery fee, VAT-inclusive. 0 if none is printed.' },
			discount: { type: 'number', description: 'A whole-order discount/rabat (as a positive amount taken off), VAT-inclusive. 0 if none is printed.' },
			total: { type: 'number', description: 'The final total actually payable, VAT-inclusive, after any shipping and discount.' },
			lines: {
				type: 'array',
				description: 'Every line item printed on the document, each converted to include VAT.',
				items: {
					type: 'object',
					properties: {
						title: { type: 'string', description: 'The item as described on the document.' },
						quantity: { type: 'number', description: 'How many of this item, as printed (1 if not stated).' },
						price: { type: 'number', description: 'The per-unit price INCLUDING VAT -- convert it first if the document prints it net of VAT. quantity times this price must equal the line\'s own VAT-inclusive total.' },
						uncertain: { type: 'boolean', description: 'true only if this specific line is a genuine guess -- smudged, cropped or otherwise hard to read. Omit or false for anything clearly printed.' }
					},
					required: ['title', 'quantity', 'price']
				}
			}
		},
		required: ['vendor', 'lines']
	}
}

const isFiniteNumber = n => typeof n === 'number' && Number.isFinite(n)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The tool call's raw input, narrowed to values the review form can actually hold -- a
    string where a string belongs, a non-negative finite number where an amount belongs, an
    invented or malformed date dropped rather than passed through to a form field that would
    reject it silently. Never throws: a model that returns nonsense for one field should not
    cost the fields it got right. */
function normalise(input) {
	if (!input || typeof input !== 'object') return null
	const vendor = String(input.vendor ?? '').trim()
	if (!vendor) return null

	const date = ISO_DATE.test(input.date) && input.date <= new Date().toISOString().slice(0, 10)
		? input.date : null
	const currency = typeof input.currency === 'string' && /^[A-Z]{3}$/.test(input.currency) ? input.currency : null
	const shipping = isFiniteNumber(input.shipping) && input.shipping >= 0 ? input.shipping : 0
	const discount = isFiniteNumber(input.discount) && input.discount >= 0 ? input.discount : 0
	const total = isFiniteNumber(input.total) && input.total >= 0 ? input.total : null
	// Whether the model had to convert -- a fact about the source document, reported for the
	// review screen's own "what was checked" card, never used to decide whether to convert:
	// the price/shipping/discount/total fields above are asked to be VAT-inclusive regardless.
	const pricesAsPrintedIncludeVat = input.pricesAsPrintedIncludeVat === true ? true
		: input.pricesAsPrintedIncludeVat === false ? false : null
	const vatRate = isFiniteNumber(input.vatRate) && input.vatRate >= 0 && input.vatRate < 100 ? input.vatRate : null

	const lines = Array.isArray(input.lines) ? input.lines
		.map(l => ({
			title: String(l?.title ?? '').trim().slice(0, 120),
			quantity: isFiniteNumber(l?.quantity) && l.quantity > 0 ? Math.round(l.quantity) : 1,
			price: isFiniteNumber(l?.price) && l.price >= 0 ? l.price : null,
			uncertain: l?.uncertain === true
		}))
		.filter(l => l.title && l.price !== null)
		: []
	if (!lines.length) return null

	return { vendor, date, currency, pricesAsPrintedIncludeVat, vatRate, shipping, discount, total, lines }
}

function contentBlockFor(bytes, contentType, kind) {
	const base64 = bytes.toString('base64')
	if (kind === 'pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
	return { type: 'image', source: { type: 'base64', media_type: contentType || 'image/jpeg', data: base64 } }
}

/** Reads a stored upload's own bytes (the same `data` column routes/scan.js's own /file route
    serves) via Claude, and returns the normalised fields above, or null on any failure. `upload`
    is a full row from scan_uploads -- data, data_is_compressed, content_type, kind. */
export async function parseReceipt(upload) {
	const anthropic = getClient()
	if (!anthropic || !upload.data) return null
	const bytes = decompressBlob(upload.data, upload.data_is_compressed)
	if (!bytes?.length) return null

	try {
		const response = await anthropic.messages.create({
			model: MODEL,
			max_tokens: 4096,
			tool_choice: { type: 'tool', name: READ_RECEIPT_TOOL.name },
			tools: [READ_RECEIPT_TOOL],
			messages: [{
				role: 'user',
				content: [
					contentBlockFor(bytes, upload.content_type, upload.kind),
					{
						type: 'text',
						text: 'Read this receipt, invoice or order confirmation and report its contents with the '
							+ 'read_receipt tool. Report only what is actually printed on the document -- never invent '
							+ 'a vendor, a line or a total that is not there, and mark a line uncertain rather than '
							+ 'guessing at a figure you cannot read. Every amount you report (line prices, shipping, '
							+ 'discount, total) must include VAT -- the amount actually payable. If the document '
							+ 'prints its line prices net of VAT with the tax added separately near the total (common '
							+ 'on an emailed invoice), convert every one of them using the rate the document states; '
							+ 'if none is stated, use the rate implied by the stated VAT amount against the net total; '
							+ 'only fall back to 25% if the document is clearly Danish/EU and states neither.'
					}
				]
			}]
		})
		const call = response.content.find(b => b.type === 'tool_use' && b.name === READ_RECEIPT_TOOL.name)
		return call ? normalise(call.input) : null
	} catch {
		// No network, a bad key, a rate limit, a file the model refuses -- every one of these
		// is the same "could not read it" to the caller, which already has a fallback for that.
		return null
	}
}
