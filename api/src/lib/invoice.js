import { Worker } from 'node:worker_threads'
import sharp from 'sharp'
import { db } from '../db.js'
import { fromEpoch } from './dates.js'
import { decompressBlob } from './blobCompression.js'
import { CURRENCIES } from './constants.js'
import { countryName } from './countries.js'
import { addressOn, currentAddress, storedCompany } from './cvrRegister.js'

/* An invoice made from a saved order (Invoice 24a, 24b): the order's facts gathered and written out
   as the page prints them, then drawn as a PDF on a worker thread. Nothing is stored. */

const INVOICE_WORKER = new URL('./invoicePdf.worker.js', import.meta.url)
const RENDER_TIMEOUT_MS = 15_000
// Prices on an order include VAT at 25%, so the VAT is a fifth of the total.
export const VAT_PERCENT = 25

const selectOrder = db.prepare(`SELECT id, number, vendor_id, date, shipping, discount, note, reference, total
	FROM orders WHERE id = ? AND user_id = ?`)
const selectVendor = db.prepare('SELECT name, colour, country, cvr, vat_number, address FROM vendors WHERE id = ? AND user_id = ?')
const selectLines = db.prepare(`SELECT oi.title, oi.quantity, oi.price,
	(SELECT a.id FROM order_attachments a WHERE a.order_item_id = oi.id AND a.kind = 'image' AND a.thumbnail IS NOT NULL ORDER BY a.rowid LIMIT 1) AS photo_id
	FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.position`)
const selectPhoto = db.prepare('SELECT thumbnail, thumbnail_is_compressed FROM order_attachments WHERE id = ?')
const selectVendorImage = db.prepare('SELECT square_256 FROM vendor_images WHERE vendor_id = ? AND user_id = ?')
// a line's photo cell is 44px; drawn from three times that, as the PDF is printed and zoomed
const PHOTO_PX = 132
// the empty photo box at PHOTO_PX: --surface-2 ground, 1px dashed --line-3 edge, the camera icon at 18px in --ink-6
const EMPTY_PHOTO_SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_PX}" height="${PHOTO_PX}" viewBox="0 0 44 44">
	<rect x="0.5" y="0.5" width="43" height="43" rx="5.5" fill="#f7f6f2" stroke="#dedcd4" stroke-width="1" stroke-dasharray="3 3"/>
	<g transform="translate(13 13) scale(0.75)" fill="none" stroke="#b3b1a9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"/>
		<path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
	</g>
</svg>`)
const selectCurrency = db.prepare('SELECT currency FROM user_settings WHERE user_id = ?')
const selectAccount = db.prepare('SELECT name, email FROM users WHERE id = ?')

/** The sender (24a): the register's name and address on the order date, else the vendor's own. `missing`
    lists 'address', 'cvr' or 'vat'; `unknownNumber` means the register does not know its CVR number. */
export function senderOf(vendor, day) {
	const abroad = vendor.country !== 'DK'
	const company = !abroad && vendor.cvr ? storedCompany(vendor.cvr) : null
	// a number the register does not know is not printed as if it were one
	const known = company?.found ? company : null
	const unknownNumber = company && !company.found
	const address = known ? addressOn(known, day) : String(vendor.address ?? '').split('\n').map(l => l.trim()).filter(Boolean)
	const number = abroad ? vendor.vat_number : unknownNumber ? null : vendor.cvr
	return {
		name: known?.name || vendor.name,
		address,
		country: abroad ? countryName(vendor.country) : null,
		numberLine: number ? `${abroad ? 'VAT number' : 'CVR'} ${number}` : null,
		missing: [address.length ? null : 'address', number ? null : abroad ? 'vat' : 'cvr'].filter(Boolean),
		unknownNumber: Boolean(unknownNumber)
	}
}

const initialsOf = name => {
	const words = String(name).trim().split(/\s+/).filter(Boolean)
	if (!words.length) return ''
	if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase()
	return (words[0][0] + words[1][0]).toLocaleUpperCase()
}

// APCA lightness contrast, as the app picks a mark's ink (react/src/components/colour.js)
const luminance = hex => {
	const [r, g, b] = [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4)
	const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
}
const contrast = (ink, fill) => {
	const [t, b] = [luminance(ink), luminance(fill)]
	const s = (b > t ? b ** 0.56 - t ** 0.57 : b ** 0.65 - t ** 0.62) * 1.14
	return Math.abs(s) < 0.1 ? 0 : Math.abs((s > 0 ? s - 0.027 : s + 0.027) * 100)
}
const WHITE = '#ffffff'
const INK = '#1b1a17'
const inkOn = fill => (contrast(WHITE, fill) >= contrast(INK, fill) ? WHITE : INK)

/** Money as the account writes it: the reader's number format and the account's currency. */
function moneyIn(locale, code) {
	const currency = CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0]
	let format
	try { format = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
	catch { format = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
	const figures = n => format.format(Math.abs(n))
	const money = n => {
		const figure = figures(n)
		const minus = n < 0 && /[1-9]/.test(figure) ? '-' : ''
		return currency.before ? minus + currency.symbol + figure : minus + figure + ' ' + currency.symbol
	}
	const count = n => {
		const f = new Intl.NumberFormat(format.resolvedOptions().locale, { maximumFractionDigits: 2 })
		return (n < 0 ? '-' : '') + f.format(Math.abs(n))
	}
	return { money, count }
}

const longDate = iso => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
	.format(new Date(iso + 'T00:00:00Z'))

const cents = n => Math.round(n * 100) / 100

/** A recipient as the dialog sends it, cleaned: `{ name, country, cvr, vatNumber, address, att }`, every
    field optional. A CVR number is kept for Denmark only, and a VAT number for anywhere else. */
export function cleanRecipient(raw) {
	const text = (value, most) => String(value ?? '').trim().slice(0, most)
	const country = /^[A-Z]{2}$/.test(String(raw?.country ?? '')) ? raw.country : 'DK'
	const lines = Array.isArray(raw?.address) ? raw.address : String(raw?.address ?? '').split('\n')
	const cvr = String(raw?.cvr ?? '').replace(/\s+/g, '')
	return {
		name: text(raw?.name, 200) || null,
		country,
		cvr: country === 'DK' && /^\d{8}$/.test(cvr) ? cvr : null,
		vatNumber: country !== 'DK' ? text(raw?.vatNumber, 40) || null : null,
		address: lines.map(l => text(l, 200)).filter(Boolean).slice(0, 6),
		att: text(raw?.att, 200) || null
	}
}

const isEmptyRecipient = r => !r || (!r.name && !r.cvr && !r.vatNumber && !r.address.length && !r.att)

/** The To box (24b, 24c): a CVR number the register knows prints the register's name and address; one it
    does not know is not printed. With every field empty, To is the account's name and email. */
function recipientParty(userId, recipient) {
	if (isEmptyRecipient(recipient)) {
		const account = selectAccount.get(userId)
		const name = String(account?.name ?? '').trim()
		return { name: name || account?.email || '', att: null, address: name ? [account.email] : [], country: null, numberLine: null }
	}
	const company = recipient.cvr ? storedCompany(recipient.cvr) : null
	const known = company?.found ? company : null
	const number = recipient.country !== 'DK' ? recipient.vatNumber : company && !company.found ? null : recipient.cvr
	return {
		name: known?.name || recipient.name || '',
		att: recipient.att,
		address: known ? currentAddress(known) : recipient.address,
		country: recipient.country !== 'DK' ? countryName(recipient.country) : null,
		numberLine: number ? `${recipient.country !== 'DK' ? 'VAT number' : 'CVR'} ${number}` : null
	}
}

/** The invoice for one of the account's orders, written out (24a), with its photos and file name:
    `{ invoice, photos, fileName }`, or null when the account has no such order. */
export async function invoiceFor(userId, orderId, recipient, locale) {
	const order = selectOrder.get(orderId, userId)
	if (!order) return null
	const vendor = selectVendor.get(order.vendor_id, userId)
	const day = fromEpoch(order.date)
	const { money, count } = moneyIn(locale, selectCurrency.get(userId)?.currency)
	const sender = senderOf(vendor, day)
	const number = order.reference.trim() || `Order ${order.number}`

	const rows = selectLines.all(order.id)
	const photos = []
	const square = async bytes => {
		try {
			photos.push(await sharp(bytes).resize(PHOTO_PX, PHOTO_PX, { fit: 'cover' }).png().toBuffer())
			return photos.length - 1
		} catch { return null }
	}
	// a line with no photo of its own: the vendor's image, faded, else the empty photo box (24a)
	let standIn
	const standInPhoto = async () => {
		if (standIn) return standIn
		const image = selectVendorImage.get(order.vendor_id, userId)?.square_256
		const faded = image ? await square(image) : null
		standIn = faded != null ? { photo: faded, faded: true } : { photo: await square(EMPTY_PHOTO_SVG), faded: false }
		return standIn
	}
	const lines = []
	for (const row of rows) {
		const stored = row.photo_id ? selectPhoto.get(row.photo_id) : null
		const own = stored ? await square(decompressBlob(stored.thumbnail, stored.thumbnail_is_compressed)) : null
		const { photo, faded } = own != null ? { photo: own, faded: false } : await standInPhoto()
		lines.push({ photo, faded, name: row.title, qty: count(row.quantity), unit: money(row.price), amount: money(cents(row.price * row.quantity)) })
	}

	const total = cents(order.total)
	const vat = cents(total * VAT_PERCENT / (100 + VAT_PERCENT))
	const party = p => [
		p.att ? `Att. ${p.att}` : null,
		p.address.length ? p.address.join(', ') : null,
		p.country,
		p.numberLine
	].filter(Boolean)
	const toParty = recipientParty(userId, recipient)
	const to = { name: toParty.name, lines: party(toParty) }

	const invoice = {
		vendor: { name: vendor.name, initials: initialsOf(vendor.name), colour: vendor.colour, ink: inkOn(vendor.colour) },
		number,
		date: longDate(day),
		total: money(total),
		from: { name: sender.name, lines: party({ address: sender.address, country: sender.country, numberLine: sender.numberLine }) },
		to,
		lines,
		extras: [
			order.shipping ? { name: 'Shipping', amount: money(order.shipping) } : null,
			order.discount ? { name: 'Discount', amount: money(-order.discount) } : null
		].filter(Boolean),
		note: order.note.trim(),
		sums: { net: money(cents(total - vat)), vat: money(vat), vatLabel: `VAT ${VAT_PERCENT}%`, total: money(total) },
		foot: [sender.name, sender.numberLine].filter(Boolean).join(' - ')
	}
	// no character a file system refuses
	const fileName = `Invoice ${number} ${vendor.name}.pdf`.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ')
	return { invoice, photos, fileName }
}

/** The invoice drawn as a PDF, or its first page as a PNG `width` pixels wide: bytes, or null when the
    drawing fails or outruns its time. */
export function drawInvoice(made, { preview = null } = {}) {
	return new Promise(resolve => {
		let settled = false
		const settle = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value) } }
		const worker = new Worker(INVOICE_WORKER, { workerData: { invoice: made.invoice, photos: made.photos, preview } })
		// a worker that has posted its answer exits by itself; terminating it then can crash the process (lib/images.js)
		const timer = setTimeout(() => { worker.terminate(); settle(null) }, RENDER_TIMEOUT_MS)
		worker.on('message', message => settle(message ? Buffer.from(message) : null))
		worker.on('error', e => { console.error('The invoice was not drawn:', e); settle(null) })
		worker.on('exit', () => settle(null))
	})
}
