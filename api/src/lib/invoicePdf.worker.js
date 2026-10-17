/* The invoice PDF (24a, 24b) on its own thread, as mupdf's work would hold up other requests. Laid out
   in the design's CSS pixels with the browser's Poppins line heights, drawn at 0.75 points a pixel. */

import { parentPort, workerData } from 'node:worker_threads'
import { readFileSync } from 'node:fs'
import * as mupdf from 'mupdf'

mupdf.setLog(() => {})

const { invoice, photos, preview } = workerData

const font = weight => new mupdf.Font('Poppins', readFileSync(new URL(`../fonts/poppins-${weight}.ttf`, import.meta.url)))
const FONTS = { 400: font(400), 500: font(500), 600: font(600) }

const PAGE_W = 794
const PAGE_H = 1123
const PAD = 56
const GAP = 28
const WIDTH = PAGE_W - PAD * 2
// the page's foot, and the two gaps around the space that grows above it
const FOOT_TOP = PAGE_H - PAD - lineHeight(11)
const BOTTOM = FOOT_TOP - GAP * 2

const INK = '#1b1a17'
const GREEN = '#1d4d33'
const TILE = '#f7f6f2'
const LINE = '#e3e1d9'
const LABEL = '#6b6a63'
const SOFT = '#57564f'
const NOTE = '#3d3c36'
const TOTAL_LABEL = '#c6d6c9'
// a vendor's image standing in for a line's photo (--fade-standin)
const FADE_STANDIN = 0.6

// the lines' columns: photo, item, quantity, unit price, amount (.iv-line)
const ROW_PAD_X = 16
const COL_GAP = 14
const COLS = (() => {
	const inner = WIDTH - 2 - ROW_PAD_X * 2
	const widths = [44, 0, 56, 110, 110]
	widths[1] = inner - widths.reduce((a, b) => a + b) - COL_GAP * 4
	let x = PAD + 1 + ROW_PAD_X
	return widths.map(w => { const col = { x, w }; x += w + COL_GAP; return col })
})()

/** A browser's normal line height for Poppins: ascent, descent and line gap, each rounded. */
function lineHeight(size) {
	return Math.round(size * 1.05) + Math.round(size * 0.35) + Math.round(size * 0.1)
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)

function glyphs(text, weight) {
	const f = FONTS[weight]
	const out = []
	for (const ch of String(text)) {
		const code = ch.codePointAt(0)
		let gid = f.encodeCharacter(code)
		// a character Poppins does not draw is written as a question mark rather than as nothing
		if (!gid && code > 32) gid = f.encodeCharacter('?')
		out.push({ gid, code, advance: f.advanceGlyph(gid) })
	}
	return out
}

const measure = (text, size, weight = 400, spacing = 0) =>
	glyphs(text, weight).reduce((w, g) => w + g.advance * size + spacing, 0)

/** Lines no wider than `width`, broken at spaces, and inside a word only when the word alone is wider. */
function wrap(text, size, weight, width) {
	const lines = []
	for (const paragraph of String(text).split('\n')) {
		let line = ''
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			const tried = line ? `${line} ${word}` : word
			if (measure(tried, size, weight) <= width) { line = tried; continue }
			if (line) lines.push(line)
			line = ''
			let piece = ''
			for (const ch of word) {
				if (measure(piece + ch, size, weight) > width && piece) { lines.push(piece); piece = '' }
				piece += ch
			}
			line = piece
		}
		lines.push(line)
	}
	return lines
}

/** One line cut to `width`, with an ellipsis when it is cut. */
function fit(text, size, weight, width, spacing = 0) {
	if (measure(text, size, weight, spacing) <= width) return text
	let cut = [...String(text)]
	while (cut.length && measure(cut.join('') + '…', size, weight, spacing) > width) cut.pop()
	return cut.join('').trimEnd() + '…'
}

/* ---- drawing ---------------------------------------------------------------------------- */

const SCALE = 0.75
const CTM = [SCALE, 0, 0, SCALE, 0, 0]

function roundRect(x, y, w, h, r) {
	const p = new mupdf.Path()
	const k = r * 0.4477
	p.moveTo(x + r, y)
	p.lineTo(x + w - r, y)
	p.curveTo(x + w - k, y, x + w, y + k, x + w, y + r)
	p.lineTo(x + w, y + h - r)
	p.curveTo(x + w, y + h - k, x + w - k, y + h, x + w - r, y + h)
	p.lineTo(x + r, y + h)
	p.curveTo(x + k, y + h, x, y + h - k, x, y + h - r)
	p.lineTo(x, y + r)
	p.curveTo(x, y + k, x + k, y, x + r, y)
	p.closePath()
	return p
}

function makePage(device) {
	const fill = (path, colour) => device.fillPath(path, false, CTM, mupdf.ColorSpace.DeviceRGB, rgb(colour), 1)
	const box = (x, y, w, h, r, colour) => fill(roundRect(x, y, w, h, r), colour)
	const rect = (x, y, w, h, colour) => { const p = new mupdf.Path(); p.rect(x, y, x + w, y + h); fill(p, colour) }
	const stroke = (x, y, w, h, r, colour) => {
		const s = new mupdf.StrokeState({ lineWidth: 1, lineCap: 'Butt', lineJoin: 'Miter', miterLimit: 10 })
		device.strokePath(roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5), s, CTM, mupdf.ColorSpace.DeviceRGB, rgb(colour), 1)
	}
	/** Text in a line box whose top is `top`, from `x`, or ending at `x` when `right`. */
	const text = (value, { x, top, size, weight = 400, colour = INK, right = false, spacing = 0, height = lineHeight(size) }) => {
		const run = glyphs(value, weight)
		const width = run.reduce((w, g) => w + g.advance * size + spacing, 0)
		const ascent = Math.round(size * 1.05)
		const baseline = top + (height - ascent - Math.round(size * 0.35)) / 2 + ascent
		const t = new mupdf.Text()
		let at = right ? x - width : x
		for (const g of run) {
			t.showGlyph(FONTS[weight], [size, 0, 0, -size, at, baseline], g.gid, g.code)
			at += g.advance * size + spacing
		}
		device.fillText(t, CTM, mupdf.ColorSpace.DeviceRGB, rgb(colour), 1)
	}
	const image = (index, x, y, w, h, r, alpha = 1) => {
		device.clipPath(roundRect(x, y, w, h, r), false, CTM)
		device.fillImage(new mupdf.Image(photos[index]), [w * SCALE, 0, 0, h * SCALE, x * SCALE, y * SCALE], alpha)
		device.popClip()
	}
	const clip = path => device.clipPath(path, false, CTM)
	const unclip = () => device.popClip()
	return { box, rect, stroke, text, image, clip, unclip }
}

/* ---- the parts of the page, each measured, then drawn at a given top ---------------------- */

function head(page) {
	const { vendor } = invoice
	page.box(PAD, PAD, 48, 48, 10, vendor.colour)
	const initialsWidth = measure(vendor.initials, 16, 600)
	page.text(vendor.initials, { x: PAD + 24 - initialsWidth / 2, top: PAD + (48 - lineHeight(16)) / 2, size: 16, weight: 600, colour: vendor.ink })
	const kickerWidth = measure('INVOICE', 12, 500, 12 * 0.14)
	const name = fit(vendor.name, 22, 600, WIDTH - 48 - 14 - 24 - kickerWidth)
	page.text(name, { x: PAD + 48 + 14, top: PAD + (48 - lineHeight(22)) / 2, size: 22, weight: 600 })
	page.text('INVOICE', { x: PAD + WIDTH, top: PAD + (48 - lineHeight(12)) / 2, size: 12, weight: 500, colour: GREEN, right: true, spacing: 12 * 0.14 })
}

const TILE_PAD_Y = 14
const TILE_PAD_X = 16

function tiles() {
	const unit = (WIDTH - 24) / 3.4
	const widths = [unit, unit, unit * 1.4]
	const parts = [
		{ label: 'Number', value: invoice.number, size: 15, height: lineHeight(15) },
		{ label: 'Date', value: invoice.date, size: 15, height: lineHeight(15) },
		{ label: 'Total, VAT included', value: invoice.total, size: 26, height: 26 * 1.1, total: true }
	].map((t, i) => ({ ...t, w: widths[i], lines: wrap(t.value, t.size, 600, widths[i] - TILE_PAD_X * 2) }))
	const height = Math.max(...parts.map(t => TILE_PAD_Y * 2 + lineHeight(11) + 4 + t.lines.length * t.height))
	return {
		height,
		draw(page, top) {
			let x = PAD
			for (const t of parts) {
				page.box(x, top, t.w, height, 10, t.total ? GREEN : TILE)
				page.text(t.label, { x: x + TILE_PAD_X, top: top + TILE_PAD_Y, size: 11, colour: t.total ? TOTAL_LABEL : LABEL })
				t.lines.forEach((line, i) => page.text(line, {
					x: x + TILE_PAD_X, top: top + TILE_PAD_Y + lineHeight(11) + 4 + i * t.height, size: t.size, weight: 600,
					colour: t.total ? '#ffffff' : INK, height: t.height
				}))
				x += t.w + 12
			}
		}
	}
}

function parties() {
	const w = (WIDTH - 12) / 2
	const inner = w - 2 - TILE_PAD_X * 2
	const LH = 12 * 1.6
	const boxes = [['From', invoice.from], ['To', invoice.to]].map(([label, p]) => [
		{ text: label, colour: LABEL, weight: 400 },
		...(p.name ? wrap(p.name, 12, 600, inner) : []).map(text => ({ text, weight: 600 })),
		...p.lines.flatMap(line => wrap(line, 12, 400, inner).map(text => ({ text, weight: 400 })))
	])
	const height = 2 + TILE_PAD_Y * 2 + Math.max(...boxes.map(b => b.length)) * LH
	return {
		height,
		draw(page, top) {
			boxes.forEach((lines, i) => {
				const x = PAD + i * (w + 12)
				page.stroke(x, top, w, height, 10, LINE)
				lines.forEach((line, n) => page.text(line.text, {
					x: x + 1 + TILE_PAD_X, top: top + 1 + TILE_PAD_Y + n * LH, size: 12, weight: line.weight, colour: line.colour ?? INK, height: LH
				}))
			})
		}
	}
}

const HEAD_ROW = 10 * 2 + lineHeight(11)
const ROW_PAD_Y = 12

/** A row of the lines: an order line, or Shipping or Discount after them (.iv-line--extra). */
function row(line, extra = false) {
	const names = wrap(line.name, 13, 500, COLS[1].w)
	const content = Math.max(extra ? 0 : 44, names.length * lineHeight(13))
	return {
		height: ROW_PAD_Y * 2 + content,
		draw(page, top, last) {
			const height = ROW_PAD_Y * 2 + content
			if (extra) page.rect(PAD + 1, top, WIDTH - 2, height + (last ? 0 : 1), TILE)
			const middle = top + ROW_PAD_Y + content / 2
			if (!extra && line.photo != null) page.image(line.photo, COLS[0].x, middle - 22, 44, 44, 6, line.faded ? FADE_STANDIN : 1)
			const textTop = middle - (names.length * lineHeight(13)) / 2
			names.forEach((name, i) => page.text(name, { x: COLS[1].x, top: textTop + i * lineHeight(13), size: 13, weight: 500 }))
			const one = middle - lineHeight(13) / 2
			if (line.qty) page.text(line.qty, { x: COLS[2].x + COLS[2].w, top: one, size: 13, colour: SOFT, right: true })
			if (line.unit) page.text(line.unit, { x: COLS[3].x + COLS[3].w, top: one, size: 13, colour: SOFT, right: true })
			page.text(line.amount, { x: COLS[4].x + COLS[4].w, top: one, size: 13, weight: 500, right: true })
			if (!last) page.rect(PAD + 1, top + height, WIDTH - 2, 1, LINE)
		}
	}
}

/** The lines' box from `top`, holding these rows: its height, and how to draw it. */
function table(rows) {
	const height = 2 + HEAD_ROW + 1 + rows.reduce((h, r) => h + r.height, 0) + Math.max(0, rows.length - 1)
	return {
		height,
		draw(page, top) {
			page.clip(roundRect(PAD, top, WIDTH, height, 10))
			let y = top + 1
			const labelTop = y + 10
			page.text('Item', { x: COLS[1].x, top: labelTop, size: 11, colour: LABEL })
			page.text('Qty', { x: COLS[2].x + COLS[2].w, top: labelTop, size: 11, colour: LABEL, right: true })
			page.text('Unit price', { x: COLS[3].x + COLS[3].w, top: labelTop, size: 11, colour: LABEL, right: true })
			page.text('Amount', { x: COLS[4].x + COLS[4].w, top: labelTop, size: 11, colour: LABEL, right: true })
			y += HEAD_ROW
			page.rect(PAD + 1, y, WIDTH - 2, 1, LINE)
			y += 1
			rows.forEach((r, i) => {
				const last = i === rows.length - 1
				r.draw(page, y, last)
				y += r.height + (last ? 0 : 1)
			})
			page.unclip()
			page.stroke(PAD, top, WIDTH, height, 10, LINE)
		}
	}
}

function foot() {
	const sumsWidth = 280
	const noteWidth = WIDTH - sumsWidth - 32
	const LH = 13 * 1.6
	const note = invoice.note ? wrap(invoice.note, 13, 400, noteWidth) : []
	const sums = [
		['Without VAT', invoice.sums.net],
		[invoice.sums.vatLabel, invoice.sums.vat]
	]
	const sumsHeight = lineHeight(13) * 2 + 8 * 2 + 1 + 8 + lineHeight(13)
	const height = Math.max(sumsHeight, note.length ? (note.length + 1) * LH : 0)
	return {
		height,
		draw(page, top) {
			if (note.length) {
				page.text('Note', { x: PAD, top, size: 13, colour: LABEL, height: LH })
				note.forEach((line, i) => page.text(line, { x: PAD, top: top + (i + 1) * LH, size: 13, colour: NOTE, height: LH }))
			}
			const x = PAD + WIDTH - sumsWidth
			let y = top
			for (const [label, value] of sums) {
				page.text(label, { x, top: y, size: 13, colour: SOFT })
				page.text(value, { x: PAD + WIDTH, top: y, size: 13, right: true })
				y += lineHeight(13) + 8
			}
			page.rect(x, y, sumsWidth, 1, INK)
			y += 1 + 8
			page.text('Total', { x, top: y, size: 13, weight: 600 })
			page.text(invoice.sums.total, { x: PAD + WIDTH, top: y, size: 13, weight: 600, right: true })
		}
	}
}

/* ---- pages ------------------------------------------------------------------------------- */

const rows = [...invoice.lines.map(l => row(l)), ...invoice.extras.map(e => row({ name: e.name, amount: e.amount }, true))]
const tileBlock = tiles()
const partyBlock = parties()
const footBlock = foot()
const FIRST_TOP = PAD + 48 + GAP + tileBlock.height + GAP + partyBlock.height + GAP
const LATER_TOP = PAD + 48 + GAP + lineHeight(12) + GAP

/* Rows go onto a page while they fit; a row never splits. The totals follow the last row on its page,
   and when they do not fit there, the last row goes over with them, so totals never stand alone. */
const pages = []
let at = 0
while (at < rows.length || !pages.length) {
	const top = pages.length ? LATER_TOP : FIRST_TOP
	const taken = []
	let height = table([]).height
	while (at + taken.length < rows.length) {
		const next = rows[at + taken.length]
		const grown = height + next.height + (taken.length ? 1 : 0)
		if (top + grown > BOTTOM && taken.length) break
		taken.push(next)
		height = grown
	}
	const finishes = at + taken.length === rows.length
	if (finishes && top + height + GAP + footBlock.height > BOTTOM && taken.length > 1) {
		taken.pop()
		pages.push({ top, rows: taken, foot: false })
		at += taken.length
		continue
	}
	pages.push({ top, rows: taken, foot: finishes })
	at += taken.length
	if (!taken.length) break
}

const buffer = new mupdf.Buffer()
const writer = new mupdf.DocumentWriter(buffer, 'pdf', 'compress')
pages.forEach((p, i) => {
	const device = writer.beginPage([0, 0, PAGE_W * SCALE, PAGE_H * SCALE])
	const page = makePage(device)
	head(page)
	if (i === 0) {
		tileBlock.draw(page, PAD + 48 + GAP)
		partyBlock.draw(page, PAD + 48 + GAP + tileBlock.height + GAP)
	} else {
		page.text(`Continued, ${invoice.number}`, { x: PAD, top: PAD + 48 + GAP, size: 12, colour: SOFT })
	}
	const lines = table(p.rows)
	lines.draw(page, p.top)
	if (p.foot) footBlock.draw(page, p.top + lines.height + GAP)
	page.text(fit(invoice.foot, 11, 400, WIDTH - 120), { x: PAD, top: FOOT_TOP, size: 11, colour: LABEL })
	page.text(`Page ${i + 1} of ${pages.length}`, { x: PAD + WIDTH, top: FOOT_TOP, size: 11, colour: LABEL, right: true })
	writer.endPage()
})
writer.close()
// only the letters the invoice uses are kept of each font
const written = mupdf.Document.openDocument(buffer.asUint8Array(), 'application/pdf')
written.subsetFonts()
const pdf = written.saveToBuffer('compress,garbage').asUint8Array()

if (!preview) parentPort.postMessage(pdf)
else {
	const scale = preview / (PAGE_W * SCALE)
	const pixmap = mupdf.Document.openDocument(pdf, 'application/pdf').loadPage(0).toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true)
	parentPort.postMessage(pixmap.asPNG())
}
