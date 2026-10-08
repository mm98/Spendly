/** A PDF page (mupdf's structured text, asJSON) as `{ text, scan }`: its words one printed row per line, and
    whether it is a scan: pictures over half of it, or more words hidden than shown (a scanner app's guesses). */
export function readPage({ json, width, height, shown = 0, hidden = 0 }) {
	let blocks
	try { blocks = JSON.parse(json).blocks ?? [] } catch { return { text: '', scan: false } }
	const covered = blocks.filter(b => b.type === 'image').reduce((sum, b) => sum + b.bbox.w * b.bbox.h, 0)
	return { text: inRows(blocks.filter(b => b.type === 'text')), scan: covered * 2 >= width * height || hidden > shown }
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

const UNREADABLE = /[\0-\x08\x0E-\x1F\x7F-\x9F\uFFFD\uE000-\uF8FF]/g
const PUNCTUATION = /[!-/:-@[-`{-~]/g
const PUNCTUATION_RUN = new RegExp(`${PUNCTUATION.source}{4,}`, 'g')

/** Whether a PDF's words can be read in place of its pictures, by the checks MinerU's DocVortex makes: no page is a
    scan, the pages average 50 characters, under 3% are unreadable, and none came out as runs of punctuation. */
export function wordsHold(pages) {
	if (!pages.length || pages.some(page => page.scan)) return false
	const text = pages.map(page => page.text).join('\n'), chars = text.replace(/\s/g, '')
	// a receipt always prints an amount
	if (!/\d/.test(text) || chars.length < 50 * pages.length) return false
	if ((chars.match(UNREADABLE)?.length ?? 0) * 100 >= chars.length * 3) return false
	return !pages.some(page => punctuated(page.text))
}

// a font with no letters behind its glyphs can come out as punctuation, in runs of mixed marks
function punctuated(text) {
	const chars = text.replace(/\s/g, '')
	const marks = chars.match(PUNCTUATION)?.length ?? 0
	const runs = (text.match(PUNCTUATION_RUN) ?? []).filter(run => new Set(run).size > 1).join('').length
	return chars.length >= 100 && marks * 4 >= chars.length && runs * 10 >= chars.length
}
