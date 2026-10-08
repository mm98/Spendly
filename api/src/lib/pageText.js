/** A PDF page (mupdf's structured text, asJSON) as `{ text, scan }`: its words one printed row per line,
    and whether a picture covers half the page or more, as on a scan, whose words are a stamp or guesses. */
export function readPage({ json, width, height }) {
	let blocks
	try { blocks = JSON.parse(json).blocks ?? [] } catch { return { text: '', scan: false } }
	const covered = blocks.filter(b => b.type === 'image').reduce((most, b) => Math.max(most, b.bbox.w * b.bbox.h), 0)
	return { text: inRows(blocks.filter(b => b.type === 'text')), scan: covered * 2 >= width * height }
}

// An invoice often stores its columns one after another: its lines go back into rows by height, columns by spaces.
function inRows(blocks) {
	const lines = blocks.flatMap(b => b.lines ?? [])
		.map(l => ({ x: l.bbox.x, w: l.bbox.w, h: l.bbox.h, top: l.bbox.y, bottom: l.bbox.y + l.bbox.h, text: String(l.text ?? '').trim() }))
		.filter(l => l.text)
	if (!lines.length) return ''
	const sideways = l => l.h > l.w && [...l.text].length > 2
	const upright = lines.filter(l => !sideways(l))

	const widths = upright.map(l => l.w / [...l.text].length).sort((a, b) => a - b)
	const char = widths[widths.length >> 1] || 5
	const left = upright.reduce((min, l) => Math.min(min, l.x), Infinity)

	const rows = []
	for (const line of upright.sort((a, b) => a.top + a.bottom - b.top - b.bottom)) {
		const row = rows.at(-1), middle = (line.top + line.bottom) / 2
		if (!row || middle <= row.top || middle >= row.bottom) rows.push({ top: line.top, bottom: line.bottom, cells: [line] })
		// text drawn twice a hair apart, to look bold, is kept once
		else if (!row.cells.some(c => c.text === line.text && Math.abs(c.x - line.x) < char)) row.cells.push(line)
	}
	return rows.map(row => row.cells.sort((a, b) => a.x - b.x).reduce((out, cell) => {
		const column = Math.round((cell.x - left) / char)
		return out + ' '.repeat(out ? Math.max(column - out.length, 2) : column) + cell.text
	}, '')).concat(lines.filter(sideways).map(l => l.text)).join('\n')
}

// a receipt always prints an amount; glyphs a PDF never mapped to letters come out as U+FFFD or private-use characters
export const readable = text => /\d/.test(text)
	&& (text.match(/[�-]/g)?.length ?? 0) * 10 < text.replace(/\s/g, '').length
