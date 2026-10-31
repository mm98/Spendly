/* Reads an .xlsx workbook in the browser, with no library: the zip's parts, the text, each
   cell's value, and whether its text is drawn light. The file itself never leaves the page. */

const decoder = new TextDecoder()
const u16 = (bytes, at) => bytes[at] | (bytes[at + 1] << 8)
const u32 = (bytes, at) => (u16(bytes, at) | (u16(bytes, at + 2) << 16)) >>> 0

const damaged = () => new Error('This file could not be read as an Excel workbook.')

/** The zip's table of contents, and a reader for any part named in it. */
function openZip(bytes) {
	let end = -1
	for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--)
		if (u32(bytes, at) === 0x06054b50) { end = at; break }
	if (end < 0) throw damaged()
	const parts = new Map()
	let at = u32(bytes, end + 16)
	for (let left = u16(bytes, end + 10); left > 0; left--) {
		if (u32(bytes, at) !== 0x02014b50) throw damaged()
		const nameLength = u16(bytes, at + 28)
		parts.set(decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)),
			{ method: u16(bytes, at + 10), size: u32(bytes, at + 20), header: u32(bytes, at + 42) })
		at += 46 + nameLength + u16(bytes, at + 30) + u16(bytes, at + 32)
	}
	return async name => {
		const part = parts.get(name)
		if (!part) return null
		const start = part.header + 30 + u16(bytes, part.header + 26) + u16(bytes, part.header + 28)
		const data = bytes.subarray(start, start + part.size)
		if (part.method === 0) return decoder.decode(data)
		if (part.method !== 8) throw damaged()
		return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
	}
}

const xml = text => {
	const doc = new DOMParser().parseFromString(text, 'application/xml')
	if (doc.getElementsByTagName('parsererror').length) throw damaged()
	return doc
}
const all = (node, name) => (node ? [...node.getElementsByTagNameNS('*', name)] : [])
const kids = (node, name) => [...(node?.children ?? [])].filter(child => child.localName === name)
const partPath = target => (target.startsWith('/') ? target.slice(1) : 'xl/' + target)
const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// Excel numbers a theme's colours with the first two pairs swapped: 0 is light 1, 1 is dark 1.
const THEME_SLOTS = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4',
	'accent5', 'accent6', 'hlink', 'folHlink']
const INDEXED = { 0: '000000', 1: 'FFFFFF', 8: '000000', 9: 'FFFFFF', 64: '000000' }

const themeColours = doc => {
	const scheme = all(doc, 'clrScheme')[0]
	return THEME_SLOTS.map(slot => {
		const colour = kids(scheme, slot)[0]?.children[0]
		return colour?.getAttribute('lastClr') ?? colour?.getAttribute('val') ?? null
	})
}

/* HSL lightness after Excel's tint, which darkens toward black below 0 and lightens toward white above. */
function lightness(hex, tint) {
	const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
	const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2
	return tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint
}

function fontLightness(colour, theme) {
	if (!colour || colour.getAttribute('auto') === '1') return 0
	const tint = Number(colour.getAttribute('tint') ?? 0)
	const rgb = colour.getAttribute('rgb')
	const hex = rgb ? rgb.slice(-6) : theme[colour.getAttribute('theme')] ?? INDEXED[colour.getAttribute('indexed')]
	return hex ? lightness(hex, tint) : 0
}

/** Which cell styles draw their text light: 60% lightness or more, the greys a sheet uses for "not sure". */
function lightStyles(doc, theme) {
	const fonts = kids(all(doc, 'fonts')[0], 'font').map(font => fontLightness(kids(font, 'color')[0], theme) >= 0.6)
	const styles = kids(all(doc, 'cellXfs')[0], 'xf').map(xf => Number(xf.getAttribute('fontId') ?? 0))
	return style => fonts[styles[style] ?? 0] ?? false
}

// a date cell written as text (t="d") becomes the day count Excel itself stores, so both kinds read alike
const EXCEL_DAY_ZERO = Date.UTC(1899, 11, 30)
const daySerial = raw => {
	const time = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw ?? '') || !/T/.test(raw ?? '') ? raw : raw + 'Z')
	return Number.isNaN(time) ? raw : (time - EXCEL_DAY_ZERO) / 86400000
}

const columnOf = ref => [...ref.replace(/\d+$/, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

function readRows(doc, strings, isLight) {
	const rows = []
	for (const row of all(doc, 'row')) {
		const index = Number(row.getAttribute('r') ?? rows.length + 1) - 1
		const cells = []
		let column = -1
		for (const cell of kids(row, 'c')) {
			const ref = cell.getAttribute('r')
			column = ref ? columnOf(ref) : column + 1
			const type = cell.getAttribute('t')
			const raw = kids(cell, 'v')[0]?.textContent
			const value = type === 's' ? strings[Number(raw)]
				: type === 'inlineStr' ? all(cell, 't').map(t => t.textContent).join('')
				: type === 'str' ? raw
				: type === 'd' ? daySerial(raw)
				: type === 'b' || type === 'e' || raw == null || raw === '' ? null
				: Number(raw)
			if (value == null || value === '') continue
			cells[column] = { value, light: isLight(Number(cell.getAttribute('s') ?? 0)) }
		}
		rows[index] = cells
	}
	return rows
}

/** Every sheet in the workbook, in order: its name and its rows of cells, each `{ value, light }`. */
export async function readWorkbook(file) {
	let read
	try { read = openZip(new Uint8Array(await file.arrayBuffer())) } catch { throw damaged() }
	const workbook = await read('xl/workbook.xml')
	if (!workbook) throw damaged()
	const relations = all(xml(await read('xl/_rels/workbook.xml.rels') ?? '<Relationships/>'), 'Relationship')
	const target = id => relations.find(r => r.getAttribute('Id') === id)?.getAttribute('Target')
	const themePart = relations.find(r => /\/theme$/.test(r.getAttribute('Type') ?? ''))?.getAttribute('Target')
	const themeText = await read(themePart ? partPath(themePart) : 'xl/theme/theme1.xml')
	const theme = themeText ? themeColours(xml(themeText)) : []
	const stylesText = await read('xl/styles.xml')
	const isLight = stylesText ? lightStyles(xml(stylesText), theme) : () => false
	const stringsText = await read('xl/sharedStrings.xml')
	const strings = stringsText ? all(xml(stringsText), 'si').map(si => all(si, 't')
		.filter(t => t.parentNode.localName !== 'rPh').map(t => t.textContent).join('')) : []

	const sheets = []
	for (const sheet of all(xml(workbook), 'sheet')) {
		const path = target(sheet.getAttribute('r:id') ?? sheet.getAttributeNS(RELATIONSHIPS, 'id'))
		const text = path && await read(partPath(path))
		if (text) sheets.push({ name: sheet.getAttribute('name') ?? '', rows: readRows(xml(text), strings, isLight) })
	}
	return sheets
}
