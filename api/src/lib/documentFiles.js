import * as mupdf from 'mupdf'
import { zipFiles } from './zip.js'
import { toEpoch } from './dates.js'

/* A document { title, sections: [{ heading?, text?, table: { columns: [{ name, kind }], rows }? }] } as an
   Excel, CSV, Word or PDF file. `text` splits paragraphs on an empty line, "- " starts a list item. */

export const DOCUMENT_TYPES = {
	xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: xlsxOf },
	csv: { mime: 'text/csv; charset=utf-8', build: csvOf },
	docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', build: docxOf },
	pdf: { mime: 'application/pdf', build: pdfOf }
}

const xml = value => String(value ?? '')
	// characters XML 1.0 cannot hold at all, which a pasted note can carry
	.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
	.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const tablesOf = doc => doc.sections.filter(s => s.table?.columns?.length)
const paragraphsOf = text => String(text ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
const isNumber = v => typeof v === 'number' && Number.isFinite(v)
const plain = (cell, kind, write) => {
	if (cell === null || cell === undefined || cell === '') return ''
	if (kind === 'amount' && isNumber(cell)) return write.money(cell)
	if (kind === 'number' && isNumber(cell)) return write.count(cell)
	if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(cell)) return write.date(cell)
	return String(cell)
}

/* ---- Excel ---- */

// a sheet's name: at most 31 characters, none of []:*?/\, and unique in the workbook
function sheetNames(names) {
	const used = new Set()
	return names.map((name, i) => {
		const base = (String(name || `Table ${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').trim() || `Table ${i + 1}`).slice(0, 31)
		let named = base
		for (let n = 2; used.has(named.toLowerCase()); n++) named = `${base.slice(0, 31 - String(n).length - 1)} ${n}`
		used.add(named.toLowerCase())
		return named
	})
}

const columnName = i => (i >= 26 ? columnName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))
// Excel counts days from 1899-12-30
const excelDay = iso => toEpoch(iso) / 86400 + 25569

// styles, by their place in styles.xml: 1 an amount, 2 a heading cell, 3 a date, 4 a count, 5 the title
const STYLE = { amount: 1, head: 2, date: 3, number: 4, title: 5 }

function cellXml(ref, value, kind) {
	if (value === null || value === undefined || value === '') return ''
	if ((kind === 'amount' || kind === 'number') && isNumber(value)) return `<c r="${ref}" s="${STYLE[kind]}"><v>${value}</v></c>`
	if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `<c r="${ref}" s="${STYLE.date}"><v>${excelDay(value)}</v></c>`
	return `<c r="${ref}" t="inlineStr"${kind in STYLE ? ` s="${STYLE[kind]}"` : ''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`
}

function sheetXml(rows, { widths = [], frozen = false } = {}) {
	const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
	const pane = frozen ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : ''
	const body = rows.map((cells, r) => `<row r="${r + 1}">${cells.map(([value, kind], c) => cellXml(`${columnName(c)}${r + 1}`, value, kind)).join('')}</row>`).join('')
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData></worksheet>`
}

const widthOf = (table, i, write) => Math.min(60, Math.max(10, String(table.columns[i].name).length + 2,
	...table.rows.slice(0, 500).map(r => plain(r[i], table.columns[i].kind, write).length + 2)))

function xlsxOf(doc, write) {
	const sheets = []
	const words = doc.sections.filter(s => !s.table?.columns?.length || s.text)
	if (words.length || !tablesOf(doc).length) {
		const rows = [[[doc.title, 'title']]]
		for (const s of words) {
			rows.push([])
			if (s.heading) rows.push([[s.heading, 'head']])
			for (const p of paragraphsOf(s.text)) for (const line of p.split('\n')) rows.push([[line.trim(), 'text']])
		}
		sheets.push({ name: 'Summary', xml: sheetXml(rows, { widths: [100] }) })
	}
	const tables = tablesOf(doc)
	const names = sheetNames(tables.map(s => s.heading))
	tables.forEach((s, t) => {
		const { columns, rows } = s.table
		const head = columns.map(c => [c.name, 'head'])
		sheets.push({
			name: names[t],
			xml: sheetXml([head, ...rows.map(r => columns.map((c, i) => [r[i], c.kind]))], { widths: columns.map((_, i) => widthOf(s.table, i, write)), frozen: true })
		})
	})
	const files = [
		{ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
		{ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
		{ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
		{ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
		{ name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>` },
		...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml }))
	]
	return zipFiles(files)
}

/* ---- CSV: the first table, comma between cells, a dot in numbers ---- */

// a cell a spreadsheet would read as a formula is kept as text
const csvCell = value => {
	if (value === null || value === undefined) return ''
	if (isNumber(value)) return String(value)
	const text = /^[=+\-@\t\r]/.test(String(value)) ? `'${value}` : String(value)
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvOf(doc) {
	const table = tablesOf(doc)[0]?.table ?? { columns: [{ name: doc.title, kind: 'text' }], rows: doc.sections.flatMap(s => paragraphsOf(s.text).map(p => [p])) }
	const lines = [table.columns.map(c => csvCell(c.name)), ...table.rows.map(r => table.columns.map((_, i) => csvCell(r[i])))]
	// the mark at the start tells a spreadsheet the letters are UTF-8, so æ, ø and å survive
	return Buffer.from('﻿' + lines.map(l => l.join(',')).join('\r\n') + '\r\n', 'utf8')
}

/* ---- Word ---- */

const run = (text, { bold = false } = {}) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
const para = (text, { style, bold = false, right = false } = {}) => {
	const props = [style && `<w:pStyle w:val="${style}"/>`, right && '<w:jc w:val="right"/>'].filter(Boolean).join('')
	return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${run(text, { bold })}</w:p>`
}
const RIGHT = new Set(['amount', 'number'])

function docxTable({ columns, rows }, write) {
	const cell = (text, { bold, right }) => `<w:tc>${para(text, { bold, right })}</w:tc>`
	const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns.map(c => cell(c.name, { bold: true, right: RIGHT.has(c.kind) })).join('')}</w:tr>`
	const body = rows.map(r => `<w:tr>${columns.map((c, i) => cell(plain(r[i], c.kind, write), { right: RIGHT.has(c.kind) })).join('')}</w:tr>`).join('')
	return `<w:tbl><w:tblPr><w:tblStyle w:val="Table"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>${head}${body}</w:tbl>${para('')}`
}

function docxOf(doc, write) {
	const body = [para(doc.title, { style: 'Title' })]
	for (const s of doc.sections) {
		if (s.heading) body.push(para(s.heading, { style: 'Heading1' }))
		for (const p of paragraphsOf(s.text)) {
			for (const line of p.split('\n').map(l => l.trim()).filter(Boolean)) {
				body.push(/^[-*]\s+/.test(line) ? para(`•  ${line.replace(/^[-*]\s+/, '')}`, { style: 'ListItem' }) : para(line))
			}
		}
		if (s.table?.columns?.length) body.push(docxTable(s.table, write))
	}
	const border = side => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>`
	const files = [
		{ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
		{ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
		{ name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
		{ name: 'word/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListItem"><w:name w:val="List Item"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360"/></w:pPr></w:style><w:style w:type="table" w:styleId="Table"><w:name w:val="Table"/><w:tblPr><w:tblBorders>${['top', 'bottom', 'insideH'].map(border).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr></w:style></w:styles>` },
		{ name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>` }
	]
	return zipFiles(files)
}

/* ---- PDF: A4, Helvetica, which mupdf carries itself, so no font has to be installed ---- */

const PAGE = { width: 595, height: 842, margin: 48 }
const INK = [0.13, 0.13, 0.13]
const RULE = [0.85, 0.85, 0.85]

/** A page writer over mupdf: text that wraps, rules, and a new page when the space runs out. */
function pdfPen() {
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
		device = writer.beginPage([0, 0, PAGE.width, PAGE.height])
		y = PAGE.margin
	}
	const room = height => { if (!device || y + height > PAGE.height - PAGE.margin) newPage() }
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
		widthOf, wrap, room, draw,
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
			for (const line of wrap(text, PAGE.width - 2 * PAGE.margin - indent, size, bold)) {
				room(lead)
				draw(line, PAGE.margin + indent, y + size, size, bold)
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
	const size = 9
	const lead = size * 1.3
	const pad = 4
	const width = PAGE.width - 2 * PAGE.margin
	const texts = rows.map(r => columns.map((c, i) => plain(r[i], c.kind, write)))
	// a figure column takes its widest cell; text columns share what is left by their longest cell
	const natural = columns.map((c, i) => Math.max(pen.widthOf(c.name, size, true), ...texts.slice(0, 500).map(t => pen.widthOf(t[i], size, false))) + 2 * pad)
	const fixed = columns.map((c, i) => (RIGHT.has(c.kind) || c.kind === 'date' ? natural[i] : 0))
	// a text column is never narrower than its longest word, and shares what is left by how much longer it runs
	const least = columns.map((c, i) => (fixed[i] ? 0 : Math.max(pen.widthOf(c.name, size, true),
		...texts.slice(0, 500).flatMap(t => t[i].split(/\s+/).map(word => pen.widthOf(word, size, false)))) + 2 * pad))
	const spare = Math.max(0, width - fixed.reduce((a, b) => a + b, 0) - least.reduce((a, b) => a + b, 0))
	const wants = columns.map((_, i) => (fixed[i] ? 0 : Math.max(0, Math.min(natural[i], 240) - least[i])))
	const wantSum = wants.reduce((a, b) => a + b, 0)
	let widths = columns.map((_, i) => fixed[i] || least[i] + (wantSum ? Math.min(wants[i], spare * wants[i] / wantSum) : 0))
	const total = widths.reduce((a, b) => a + b, 0)
	if (total > width) widths = widths.map(w => w * width / total)
	const xs = widths.reduce((at, w, i) => [...at, at[i] + w], [PAGE.margin])
	const drawRow = (cells, bold) => {
		const wrapped = cells.map((t, i) => pen.wrap(t, widths[i] - 2 * pad, size, bold))
		const height = Math.max(1, ...wrapped.map(l => l.length)) * lead + 2 * pad
		return { wrapped, height, paint() {
			wrapped.forEach((lines, i) => lines.forEach((line, n) => {
				const right = RIGHT.has(columns[i].kind)
				const x = right ? xs[i + 1] - pad - pen.widthOf(line, size, bold) : xs[i] + pad
				pen.draw(line, x, pen.y + pad + size + n * lead, size, bold)
			}))
			pen.y += height
			pen.rule(PAGE.margin, PAGE.margin + width, pen.y)
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

function pdfOf(doc, write) {
	const pen = pdfPen()
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
