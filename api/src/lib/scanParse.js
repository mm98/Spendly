import Anthropic, { APIError } from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { decompressBlob } from './blobCompression.js'
import { pdfText, renderPdfPage, toSize } from './images.js'
import { readPage, readable } from './pageText.js'
import { todayIso } from './dates.js'
import { categoryNamesOf, vatNumberOf, webAddressOf } from './names.js'
import { fromPrintedLineTotals, reconcileWithTotal } from './lineTotals.js'

/* The one place a scanned document's bytes are actually read. Everything in routes/scan.js
   around this stayed an honest blank draft until now -- see that route's own comment, and the
   one on Scan.jsx -- because nothing behind GET /scan/draft/:key looked at the file at all. This
   does, via Claude's vision: a picture goes at the size the model reads it at, a PDF as its
   words, its pages' pictures or the whole file (readingBlocks), and a forced tool call is what
   gets a receipt's loose, inconsistent layout back as the fixed shape the review form can edit.

   No API key configured is a real, supported state -- not every install runs one -- so this
   never throws into its caller. A missing key, a failed request and a response the model
   declined to fill in all come back without a read; routes/scan.js's fallback is exactly the
   draft this app shipped with before any of this existed. */

export const MODEL = 'claude-sonnet-4-5-20250929'
// MODEL's own picture limits (standard tier); a model from Claude 4.7 on reads up to 2576 px and 4784
const MAX_EDGE = 1568, MAX_PICTURE_TOKENS = 1568
// SPENDLY_PDF_READING, set in docker-compose.yml
const PDF_READING = ['text', 'pictures', 'document'].find(m => m === process.env.SPENDLY_PDF_READING) ?? 'text'
const PDF_PAGES = 5
const REQUEST_TIMEOUT_MS = 45_000

let client
export function getClient() {
	if (!process.env.ANTHROPIC_API_KEY) return null
	if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS })
	return client
}

/* What a document is decides the order's status or kind when the account lets a scan set them
   (Settings, Defaults); routes/scan.js maps each to one. */
export const DOCUMENT_TYPES = ['receipt', 'order_confirmation', 'return', 'sale', 'other']

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
			website: { type: 'string', description: 'The issuer\'s web address as printed (e.g. indbo.dk), or the part after the @ of its printed email address. Omit if neither is printed.' },
			vatNumber: { type: 'string', description: 'The issuer\'s VAT or company registration number as printed (in Denmark the CVR or SE number, e.g. "CVR 12345678"). Omit if none is printed - never the customer\'s number.' },
			date: { type: 'string', description: 'The order or purchase date printed on the document, as YYYY-MM-DD.' },
			currency: { type: 'string', description: 'The ISO 4217 code of the currency the amounts are printed in, if it can be told (e.g. DKK, EUR, USD).' },
			pricesAsPrintedIncludeVat: { type: 'boolean', description: 'Whether the unit prices and total AS PRINTED on the document already include VAT (true for most Danish paper receipts) or are shown net of it with VAT added separately (common on emailed/PDF invoices). This describes the source document, not the numbers you report below -- those are always converted to include VAT regardless of this value.' },
			vatRate: { type: 'number', description: 'The VAT rate as a percentage (e.g. 25), if it is stated on the document or can be computed from a stated VAT amount. Omit if genuinely not determinable -- do not guess one.' },
			shipping: { type: 'number', description: 'A shipping or delivery fee, VAT-inclusive. 0 if none is printed.' },
			discount: { type: 'number', description: 'A whole-order discount/rabat (as a positive amount taken off), VAT-inclusive. 0 if none is printed. Never a negative-amount line printed under an item: that is taken off the item\'s own price.' },
			total: { type: 'number', description: 'The final total actually payable, VAT-inclusive, after any shipping and discount.' },
			reference: { type: 'string', description: 'The order, invoice or receipt number printed on the document, if there is one.' },
			documentType: {
				type: 'string', enum: DOCUMENT_TYPES,
				description: 'What the document is: receipt (paid, and the goods were handed over, as at a shop till), order_confirmation (ordered, not yet delivered), return (money back for goods sent back), sale (the reader sold something and was paid), or other. Use other when it cannot be told.'
			},
			unclear: {
				type: 'array',
				items: { type: 'string', enum: ['vendor', 'date', 'shipping', 'discount', 'total'] },
				description: 'Which of these document-level values were genuinely hard to read -- smudged, cropped or ambiguous. Empty when all were clearly printed.'
			},
			categories: {
				type: 'array', maxItems: 3, items: { type: 'string' },
				description: 'At most three categories that fit the items on the document, most fitting first. Use a name from the reader\'s own list when one fits; offer a new short name only when none does. Fewer than three, or none, when not confident.'
			},
			lines: {
				type: 'array',
				description: 'Every line item printed on the document, each converted to include VAT. A discount line (named Rabat, Tilbud, discount or anything else, or with no name, but with a negative amount) is never an item of its own: leave it out here and take it off the item printed directly above it.',
				items: {
					type: 'object',
					properties: {
						title: { type: 'string', description: 'The item as described on the document.' },
						quantity: { type: 'number', description: 'How many of this item, as printed (1 if not stated). May be a fraction where the line is sold by weight or length, e.g. 0.75.' },
						lineTotal: { type: 'number', description: 'The amount printed for this line as a whole, all units together, INCLUDING VAT -- the figure in the line\'s amount column, after any negative-amount line printed directly under it. Equal to price when quantity is 1.' },
						price: { type: 'number', description: 'The per-unit price INCLUDING VAT: lineTotal divided by quantity. A document often prints only the line total beside a quantity above 1 -- that figure is lineTotal, never the price. Convert it first if the document prints it net of VAT.' },
						retail: { type: 'number', description: 'The per-unit price INCLUDING VAT as printed on the item\'s own line, before any discount line under it takes something off. Only when a discount line follows the item; omit otherwise.' },
						uncertain: { type: 'boolean', description: 'true only if this specific line is a genuine guess -- smudged, cropped or otherwise hard to read. Omit or false for anything clearly printed.' },
						unclearPart: { type: 'string', enum: ['title', 'quantity', 'price'], description: 'When uncertain, the part of the line that was hardest to read.' }
					},
					required: ['title', 'quantity', 'lineTotal', 'price']
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
export function normalise(input, today) {
	if (!input || typeof input !== 'object') return null
	const vendor = String(input.vendor ?? '').trim()
	if (!vendor) return null

	const date = ISO_DATE.test(input.date) && input.date <= today
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

	const rawLines = Array.isArray(input.lines) ? input.lines
		.map(l => ({
			title: String(l?.title ?? '').trim().slice(0, 120),
			quantity: isFiniteNumber(l?.quantity) && l.quantity > 0 ? Math.round(l.quantity * 100) / 100 : 1,
			price: isFiniteNumber(l?.price) && l.price >= 0 ? l.price : null,
			retail: isFiniteNumber(l?.retail) && l.retail >= 0 ? l.retail : null,
			lineTotal: isFiniteNumber(l?.lineTotal) && l.lineTotal >= 0 ? l.lineTotal : null,
			uncertain: l?.uncertain === true,
			unclearPart: l?.uncertain === true && ['title', 'quantity', 'price'].includes(l?.unclearPart) ? l.unclearPart : null
		}))
		.filter(l => l.title && l.price !== null)
		: []
	// a line total given as a price is set right by the line's own total, then by the printed total
	const lines = reconcileWithTotal(fromPrintedLineTotals(rawLines), { total, shipping, discount })
		.map(l => ({ ...l, retail: l.retail > l.price ? l.retail : null }))
	const linesFromTotals = lines.filter(l => l.fromLineTotal).length
	const reference = String(input.reference ?? '').trim().slice(0, 80)
	// the other two things a receipt is matched to its vendor by (5h), kept only when they read as one
	const website = webAddressOf(input.website)
	const vatNumber = vatNumberOf(input.vatNumber)
	const unclear = Array.isArray(input.unclear)
		? [...new Set(input.unclear.filter(f => ['vendor', 'date', 'shipping', 'discount', 'total'].includes(f)))] : []

	const documentType = DOCUMENT_TYPES.includes(input.documentType) ? input.documentType : null

	// a read without lines still carries the vendor and date it found (6e), but is no answer to keep
	const suggestions = categoryNamesOf(input.categories).slice(0, 3)
	return { vendor, website, vatNumber, date, currency, pricesAsPrintedIncludeVat, vatRate, shipping, discount, total, reference, unclear, lines, linesFromTotals, documentType, suggestions }
}

/** What a partial answer already holds, for the reading screen (3a step 2): the vendor and date
    once both are in, and how many lines are complete. */
function progressOf(snapshot) {
	if (!snapshot || typeof snapshot !== 'object') return null
	const lines = Array.isArray(snapshot.lines) ? snapshot.lines : []
	// the last line may still be arriving; it counts once its price is in
	const complete = lines.filter(l => l && typeof l.price === 'number').length
	return { found: Boolean(snapshot.vendor && snapshot.date), lines: complete }
}

const imageBlock = (bytes, contentType) => ({ type: 'image', source: { type: 'base64', media_type: contentType, data: bytes.toString('base64') } })
const documentBlock = bytes => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') } })
const roundHalfEven = v => (v - Math.floor(v) === 0.5 ? Math.floor(v) + (Math.floor(v) % 2) : Math.round(v))

/** The size the model shrinks a picture to before reading it, by the vision docs' own rule: the
    picture's own size when it already fits. */
export function readingSize(width, height) {
	const fits = (w, h) => Math.ceil(w / 28) * 28 <= MAX_EDGE && Math.ceil(h / 28) * 28 <= MAX_EDGE
		&& Math.ceil(w / 28) * Math.ceil(h / 28) <= MAX_PICTURE_TOKENS
	if (fits(width, height)) return [width, height]
	if (height > width) return readingSize(height, width).reverse()
	const aspect = width / height
	let lo = 1, hi = width
	while (lo + 1 < hi) {
		const mid = Math.floor((lo + hi) / 2)
		if (fits(mid, Math.max(roundHalfEven(mid / aspect), 1))) lo = mid
		else hi = mid
	}
	return [lo, Math.max(roundHalfEven(lo / aspect), 1)]
}

/** `picture` at the size the model reads it at, made from `source` (the full-size original) when it must shrink. */
async function pictureBlock(picture, contentType, source = picture, png = false) {
	const { width, height } = await sharp(picture).metadata()
	const [w, h] = readingSize(width, height)
	if (w === width && h === height) return imageBlock(picture, contentType)
	return imageBlock(await toSize(source, w, h, { png }), png ? 'image/png' : 'image/webp')
}

const skipped = pages => (pages > PDF_PAGES ? `\nThe document has ${pages} pages; only the first ${PDF_PAGES} are shown.` : '')

/** What the model is shown of an upload, before the instructions. */
export async function readingBlocks(upload, bytes) {
	if (upload.kind !== 'pdf') {
		const original = upload.original ? decompressBlob(upload.original, upload.original_is_compressed) : undefined
		return [await pictureBlock(bytes, upload.content_type || 'image/webp', original)]
	}
	if (PDF_READING === 'document') return [documentBlock(bytes)]
	if (PDF_READING === 'text') {
		const { text, pages } = await pdfText(bytes, PDF_PAGES) ?? {}
		const read = text?.map(readPage) ?? []
		const words = read.map(page => page.text)
		if (!read.some(page => page.scan) && readable(words.join('\n'))) return [{
			type: 'text',
			text: 'The words of a PDF document, page by page. Each line is one printed row, its columns kept apart by spaces.'
				+ skipped(pages) + words.map((page, i) => `\n\nPage ${i + 1}:\n${page}`).join('')
		}]
	}
	// a scan saved as a PDF (no words, or a picture over half a page) is read from pictures of its pages
	const blocks = []
	let pages = 1
	for (let i = 0; i < Math.min(pages, PDF_PAGES); i++) {
		const drawn = await renderPdfPage(bytes, i)
		if (!drawn?.png) break
		pages = drawn.pages
		blocks.push({ type: 'text', text: `Page ${i + 1}:` }, await pictureBlock(drawn.png, 'image/png', drawn.png, true))
	}
	if (!blocks.length) return [documentBlock(bytes)]
	return skipped(pages) ? [{ type: 'text', text: skipped(pages).trim() }, ...blocks] : blocks
}

// 402 billing_error is the documented refusal; "credit balance is too low" has come back as a 400.
export const isBillingRefusal = e => e instanceof APIError
	&& (e.status === 402 || e.type === 'billing_error' || /credit balance/i.test(e.message))

/** Reads a stored upload's own bytes (the same `data` column routes/scan.js's own /file route
    serves) via Claude, and returns `{ read, failure }`: the normalised fields above or null, and
    null when the model answered, 'billing' when the account was refused, 'failed' otherwise.
    `upload` is a full row from scan_uploads -- data, data_is_compressed, content_type, kind, and
    for a picture its original and original_is_compressed. */
export async function parseReceipt(upload, today = todayIso(), onProgress, categories = []) {
	const anthropic = getClient()
	if (!anthropic || !upload.data) return { read: null, failure: 'failed' }
	const bytes = decompressBlob(upload.data, upload.data_is_compressed)
	if (!bytes?.length) return { read: null, failure: 'failed' }

	try {
		const shown = await readingBlocks(upload, bytes)
		const stream = anthropic.messages.stream({
			model: MODEL,
			max_tokens: 4096,
			tool_choice: { type: 'tool', name: READ_RECEIPT_TOOL.name },
			tools: [READ_RECEIPT_TOOL],
			messages: [{
				role: 'user',
				content: [
					...shown,
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
							+ 'only fall back to 25% if the document is clearly Danish/EU and states neither. '
							+ 'An item is often followed by a discount line: a line with a negative amount, usually named '
							+ '"Rabat" but it may have any name or none. It belongs to the item directly above it: leave it out of lines and take its amount '
							+ 'off that item\'s line total before working out the per-unit price (a line of 2 at 179.98 with a '
							+ 'Rabat of -60.00 is 2 at 59.99), and report the per-unit price as printed, before the discount, as '
							+ 'retail (89.99 here). Only a discount on the whole order goes in discount. '
							+ 'Report the printed order or invoice number as reference when there is one, the issuer\'s '
							+ 'own web address and VAT (CVR) number when they are printed, and say in documentType what '
							+ 'kind of document it is. List in unclear '
							+ 'each document-level value you could not read clearly, and for an uncertain line say which '
							+ 'part was hard to read in unclearPart. Also report in categories up to three that fit what '
							+ 'was bought, only when you are confident. The reader\'s own categories are:\n'
							+ (categories.length ? categories.map(n => `- ${n}`).join('\n') : '(none yet)')
					}
				]
			}]
		})
		let said = ''
		stream.on('inputJson', (_, snapshot) => {
			const now = progressOf(snapshot)
			if (!now || !onProgress) return
			const key = JSON.stringify(now)
			if (key !== said) { said = key; onProgress(now) }
		})
		const response = await stream.finalMessage()
		const call = response.content.find(b => b.type === 'tool_use' && b.name === READ_RECEIPT_TOOL.name)
		return { read: call ? normalise(call.input, today) : null, failure: null }
	} catch (error) {
		// The log is the one place a bad key, a timeout or a rate limit is told apart.
		console.error('Receipt read failed:', error.message)
		return { read: null, failure: isBillingRefusal(error) ? 'billing' : 'failed' }
	}
}
