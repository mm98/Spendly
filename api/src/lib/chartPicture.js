import * as mupdf from 'mupdf'

/* An answer's chart as a picture for the emailed conversation, at twice its shown width, on a clear
   ground for the light and the dark card. mupdf's own Helvetica draws the text, so no font is installed. */

export const CHART_PICTURE_WIDTH = 520
const W = CHART_PICTURE_WIDTH * 2
const BARS_H = 316
const TICK = 24
const GAP = 16
const KEY_ROW = 44
const GREY = rgb('#8b8a82')
// the bars' green, then the lighter greens a second series and the shares take
const KEYS = ['#4f7f63', '#8caf97', '#2f7a51', '#c6d6c9'].map(rgb)
const SHARE_KEYS = ['#2f7a51', '#4f7f63', '#8caf97', '#c6d6c9'].map(rgb)

function rgb(hex) {
	const n = parseInt(hex.slice(1), 16)
	return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function canvas(height) {
	const buffer = new mupdf.Buffer()
	const writer = new mupdf.DocumentWriter(buffer, 'pdf', '')
	const device = writer.beginPage([0, 0, W, height])
	const font = new mupdf.Font('Helvetica')
	const widthOf = (text, size) => [...text].reduce((w, ch) => w + font.advanceGlyph(font.encodeCharacter(ch.codePointAt(0)), 0), 0) * size
	const fill = (path, color) => device.fillPath(path, false, mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, color, 1)
	return {
		widthOf,
		fill,
		// a bar with its top corners rounded, as the app draws one
		bar(x, y, w, h, color) {
			if (h <= 0) return
			const r = Math.min(6, w / 2, h)
			const p = new mupdf.Path()
			p.moveTo(x, y + h)
			p.lineTo(x, y + r)
			p.curveTo(x, y, x, y, x + r, y)
			p.lineTo(x + w - r, y)
			p.curveTo(x + w, y, x + w, y, x + w, y + r)
			p.lineTo(x + w, y + h)
			p.closePath()
			fill(p, color)
		},
		rect(x, y, w, h, color) {
			const p = new mupdf.Path()
			p.rect(x, y, x + w, y + h)
			fill(p, color)
		},
		text(text, x, baseline, size, color, align = 'left') {
			const at = align === 'center' ? x - widthOf(text, size) / 2 : align === 'right' ? x - widthOf(text, size) : x
			const line = new mupdf.Text()
			line.showString(font, mupdf.Matrix.concat(mupdf.Matrix.scale(size, -size), mupdf.Matrix.translate(at, baseline)), text)
			device.fillText(line, mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, color, 1)
		},
		// text cut with ... to `width`
		fit(text, width, size) {
			if (widthOf(text, size) <= width) return text
			let cut = text.length
			while (cut > 1 && widthOf(text.slice(0, cut) + '...', size) > width) cut--
			return text.slice(0, cut) + '...'
		},
		png() {
			writer.endPage()
			writer.close()
			const doc = mupdf.Document.openDocument(buffer.asUint8Array(), 'application/pdf')
			const page = doc.loadPage(0)
			try { return Buffer.from(page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, true).asPNG()) } finally { page.destroy(); doc.destroy() }
		}
	}
}

function barsPicture(chart) {
	const series = chart.series ?? []
	const keyed = series.length > 1
	const height = BARS_H + TICK + 12 + (keyed ? KEY_ROW : 0)
	const pen = canvas(height)
	const columns = chart.columns
	const top = Math.max(0, ...columns.flatMap(c => c.values)) || 1
	const pitch = (W + GAP) / columns.length
	const width = pitch - GAP
	// ticks a step apart where two would touch, the last always written, as the app's chart does
	const widest = Math.max(...columns.map(c => pen.widthOf(c.tick ?? '', 22)))
	const step = Math.max(1, Math.ceil((widest + 24) / pitch))
	columns.forEach((c, i) => {
		const x = i * pitch
		const bars = keyed ? c.values.length : 1
		const inner = keyed ? (width - 4 * (bars - 1)) / bars : width
		c.values.slice(0, bars).forEach((v, s) => {
			const h = Math.max(0, v) / top * BARS_H
			pen.bar(x + s * (inner + 4), BARS_H - h, inner, h, KEYS[s])
		})
		if (c.tick && (i % step === 0 || i === columns.length - 1)) pen.text(c.tick, x + width / 2, BARS_H + TICK + 2, 22, GREY, 'center')
	})
	if (keyed) {
		let x = 0
		const y = BARS_H + TICK + 12 + 28
		series.forEach((s, i) => {
			pen.rect(x, y - 16, 16, 16, KEYS[i])
			pen.text(s.name, x + 24, y, 22, GREY)
			x += 24 + pen.widthOf(s.name, 22) + 32
		})
	}
	return pen.png()
}

function sharesPicture(chart, write) {
	const shares = chart.shares
	const total = shares.reduce((sum, s) => sum + Math.max(0, s.amount), 0) || 1
	const ring = 256
	const rows = shares.length * 56
	const height = Math.max(ring, rows)
	const pen = canvas(height)
	const cx = ring / 2
	const cy = height / 2
	let from = -Math.PI / 2
	shares.forEach((s, i) => {
		const to = from + Math.max(0, s.amount) / total * Math.PI * 2
		const p = new mupdf.Path()
		const steps = Math.max(2, Math.ceil((to - from) / 0.05))
		for (let k = 0; k <= steps; k++) {
			const a = from + (to - from) * k / steps
			const [x, y] = [cx + Math.cos(a) * ring / 2, cy + Math.sin(a) * ring / 2]
			if (k) p.lineTo(x, y)
			else p.moveTo(x, y)
		}
		for (let k = steps; k >= 0; k--) {
			const a = from + (to - from) * k / steps
			p.lineTo(cx + Math.cos(a) * ring * 0.32, cy + Math.sin(a) * ring * 0.32)
		}
		p.closePath()
		pen.fill(p, SHARE_KEYS[i % 4])
		from = to
	})
	const left = ring + 48
	shares.forEach((s, i) => {
		const y = (height - rows) / 2 + i * 56 + 36
		pen.rect(left, y - 18, 18, 18, SHARE_KEYS[i % 4])
		const share = `${Math.round(Math.max(0, s.amount) / total * 100)}%`
		const amount = write.money(s.amount)
		pen.text(share, W, y, 24, GREY, 'right')
		pen.text(amount, W - 96, y, 24, GREY, 'right')
		pen.text(pen.fit(s.name, W - 96 - pen.widthOf(amount, 24) - 24 - (left + 30), 24), left + 30, y, 24, GREY)
	})
	return pen.png()
}

/** A drawn chart (lib/assistantCharts.js) as a PNG, CHART_PICTURE_WIDTH wide at twice the pixels. */
export const chartPicture = (chart, write) => (chart.kind === 'shares' ? sharesPicture(chart, write) : barsPicture(chart))
