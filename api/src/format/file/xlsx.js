import { zipFiles } from '../../lib/zip.js'
import { toEpoch } from '../../lib/dates.js'
import { isNumber, paragraphsOf, plain, tablesOf, xml } from './document.js'

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

function build(doc, write) {
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

// a sheet of the words, then a sheet per table under its heading row
export const xlsx = { type: 'xlsx', name: 'Excel', word: 'spreadsheet', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build }
