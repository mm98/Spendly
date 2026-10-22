import * as mupdf from 'mupdf'

/* A chart's picture for the emailed conversation, at twice its shown width, on a clear ground for the light
   and the dark card. mupdf's own Helvetica draws the text, so no font is installed. */

export const CHART_PICTURE_WIDTH = 520
export const W = CHART_PICTURE_WIDTH * 2
export const GREY = rgb('#8b8a82')

export function rgb(hex) {
	const n = parseInt(hex.slice(1), 16)
	return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function canvas(height) {
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
