/** A PDF page's text from mupdf's structured text (asJSON), one printed row per line: an invoice often
    stores its columns one after another, so lines go back into rows by height and columns by spaces. */
export function pageText(json) {
	let blocks
	try { blocks = JSON.parse(json).blocks ?? [] } catch { return '' }
	const lines = blocks.filter(b => b.type === 'text').flatMap(b => b.lines ?? [])
		.map(l => ({ x: l.bbox.x, w: l.bbox.w, top: l.bbox.y, bottom: l.bbox.y + l.bbox.h, text: String(l.text ?? '').trim() }))
		.filter(l => l.text)
	if (!lines.length) return ''

	const widths = lines.map(l => l.w / [...l.text].length).sort((a, b) => a - b)
	const char = widths[widths.length >> 1] || 5
	const left = Math.min(...lines.map(l => l.x))

	const rows = []
	for (const line of lines.sort((a, b) => a.top + a.bottom - b.top - b.bottom)) {
		const row = rows.at(-1), middle = (line.top + line.bottom) / 2
		if (row && middle > row.top && middle < row.bottom) {
			row.cells.push(line)
			row.bottom = Math.max(row.bottom, line.bottom)
		} else rows.push({ top: line.top, bottom: line.bottom, cells: [line] })
	}
	return rows.map(row => row.cells.sort((a, b) => a.x - b.x).reduce((out, cell) => {
		const column = Math.round((cell.x - left) / char)
		return out + ' '.repeat(out ? Math.max(column - out.length, 2) : column) + cell.text
	}, '')).join('\n')
}

// a receipt always prints an amount; glyphs a PDF never mapped to letters come out as U+FFFD
export const readable = text => /\d/.test(text)
	&& (text.match(/�/g)?.length ?? 0) * 10 < text.replace(/\s/g, '').length
