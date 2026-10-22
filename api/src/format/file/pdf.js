import * as mupdf from 'mupdf'
import { FIGURES, PAGE_ORIENTATION, paragraphsOf, plain } from './document.js'

// A4 in points
const A4 = { short: 595, long: 842 }
const MARGIN = 48
const INK = [0.13, 0.13, 0.13]
const RULE = [0.85, 0.85, 0.85]

/** A page writer over mupdf: text that wraps, rules, and a new page when the space runs out. */
function pdfPen(page) {
	const buffer = new mupdf.Buffer()
	const writer = new mupdf.DocumentWriter(buffer, 'pdf', 'compress')
	const fonts = { regular: new mupdf.Font('Helvetica'), bold: new mupdf.Font('Helvetica-Bold') }
	let device = null
	let y = 0
	const widths = new Map()
	const widthOf = (text, size, bold) => {
		const font = bold ? fonts.bold : fonts.regular
		let w = 0
		for (const ch of text) {
			const key = (bold ? 'b' : 'r') + ch
			if (!widths.has(key)) widths.set(key, font.advanceGlyph(font.encodeCharacter(ch.codePointAt(0)), 0))
			w += widths.get(key)
		}
		return w * size
	}
	const newPage = () => {
		if (device) writer.endPage()
		device = writer.beginPage([0, 0, page.width, page.height])
		y = page.margin
	}
	const room = height => { if (!device || y + height > page.height - page.margin) newPage() }
	const draw = (text, x, baseline, size, bold, color = INK) => {
		const line = new mupdf.Text()
		line.showString(bold ? fonts.bold : fonts.regular, mupdf.Matrix.concat(mupdf.Matrix.scale(size, -size), mupdf.Matrix.translate(x, baseline)), text)
		device.fillText(line, mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, color, 1)
	}
	// the words of `text` broken into lines no wider than `width`; a word wider than the line is cut
	const wrap = (text, width, size, bold) => {
		const lines = []
		for (const piece of String(text).split('\n')) {
			let line = ''
			for (const word of piece.split(/\s+/).filter(Boolean)) {
				const next = line ? `${line} ${word}` : word
				if (widthOf(next, size, bold) <= width) { line = next; continue }
				if (line) lines.push(line)
				line = word
				while (widthOf(line, size, bold) > width && line.length > 1) {
					let cut = line.length - 1
					while (cut > 1 && widthOf(line.slice(0, cut), size, bold) > width) cut--
					lines.push(line.slice(0, cut))
					line = line.slice(cut)
				}
			}
			lines.push(line)
		}
		return lines
	}
	return {
		page, widthOf, wrap, room, draw,
		get y() { return y },
		set y(at) { y = at },
		rule(x0, x1, at) {
			const path = new mupdf.Path()
			path.rect(x0, at, x1, at + 0.6)
			device.fillPath(path, false, mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, RULE, 1)
		},
		paragraph(text, { size = 10.5, bold = false, before = 0, after = 6, indent = 0 } = {}) {
			const lead = size * 1.35
			y += before
			for (const line of wrap(text, page.width - 2 * page.margin - indent, size, bold)) {
				room(lead)
				draw(line, page.margin + indent, y + size, size, bold)
				y += lead
			}
			y += after
		},
		close() {
			if (!device) newPage()
			writer.endPage()
			writer.close()
			return Buffer.from(buffer.asUint8Array())
		}
	}
}

function pdfTable(pen, { columns, rows }, write) {
	const { page } = pen
	const size = 9
	const lead = size * 1.3
	const pad = 4
	const width = page.width - 2 * page.margin
	const texts = rows.map(r => columns.map((c, i) => plain(r[i], c.kind, write)))
	// a figure column takes its widest cell; text columns share what is left by their longest cell
	const natural = columns.map((c, i) => Math.max(pen.widthOf(c.name, size, true), ...texts.slice(0, 500).map(t => pen.widthOf(t[i], size, false))) + 2 * pad)
	const fixed = columns.map((c, i) => (FIGURES.has(c.kind) || c.kind === 'date' ? natural[i] : 0))
	// a text column is never narrower than its longest word, and shares what is left by how much longer it runs
	const least = columns.map((c, i) => (fixed[i] ? 0 : Math.max(pen.widthOf(c.name, size, true),
		...texts.slice(0, 500).flatMap(t => t[i].split(/\s+/).map(word => pen.widthOf(word, size, false)))) + 2 * pad))
	const spare = Math.max(0, width - fixed.reduce((a, b) => a + b, 0) - least.reduce((a, b) => a + b, 0))
	const wants = columns.map((_, i) => (fixed[i] ? 0 : Math.max(0, Math.min(natural[i], 240) - least[i])))
	const wantSum = wants.reduce((a, b) => a + b, 0)
	let widths = columns.map((_, i) => fixed[i] || least[i] + (wantSum ? Math.min(wants[i], spare * wants[i] / wantSum) : 0))
	const total = widths.reduce((a, b) => a + b, 0)
	if (total > width) widths = widths.map(w => w * width / total)
	const xs = widths.reduce((at, w, i) => [...at, at[i] + w], [page.margin])
	const drawRow = (cells, bold) => {
		const wrapped = cells.map((t, i) => pen.wrap(t, widths[i] - 2 * pad, size, bold))
		const height = Math.max(1, ...wrapped.map(l => l.length)) * lead + 2 * pad
		return { wrapped, height, paint() {
			wrapped.forEach((lines, i) => lines.forEach((line, n) => {
				const right = FIGURES.has(columns[i].kind)
				const x = right ? xs[i + 1] - pad - pen.widthOf(line, size, bold) : xs[i] + pad
				pen.draw(line, x, pen.y + pad + size + n * lead, size, bold)
			}))
			pen.y += height
			pen.rule(page.margin, page.margin + width, pen.y)
		} }
	}
	const head = () => drawRow(columns.map(c => c.name), true)
	let first = head()
	pen.room(first.height * 2)
	first.paint()
	for (const cells of texts) {
		const row = drawRow(cells, false)
		const before = pen.y
		pen.room(row.height)
		// a table that runs onto a new page names its columns again
		if (pen.y < before) head().paint()
		row.paint()
	}
	pen.y += 12
}

function build(doc, write, { orientation }) {
	const wide = orientation === 'landscape'
	const pen = pdfPen({ width: wide ? A4.long : A4.short, height: wide ? A4.short : A4.long, margin: MARGIN })
	pen.paragraph(doc.title, { size: 18, bold: true, after: 10 })
	for (const s of doc.sections) {
		if (s.heading) pen.paragraph(s.heading, { size: 13, bold: true, before: 8, after: 4 })
		for (const p of paragraphsOf(s.text)) {
			for (const line of p.split('\n').map(l => l.trim()).filter(Boolean)) {
				if (/^[-*]\s+/.test(line)) pen.paragraph(`•  ${line.replace(/^[-*]\s+/, '')}`, { indent: 10, after: 2 })
				else pen.paragraph(line)
			}
		}
		if (s.table?.columns?.length) pdfTable(pen, s.table, write)
	}
	return pen.close()
}

// A4 in Helvetica, which mupdf carries itself, so no font has to be installed
export const pdf = { type: 'pdf', name: 'PDF', word: 'PDF', mime: 'application/pdf', options: { orientation: PAGE_ORIENTATION }, build }
