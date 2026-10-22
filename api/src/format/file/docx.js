import { zipFiles } from '../../lib/zip.js'
import { FIGURES, paragraphsOf, plain, xml } from './document.js'

const run = (text, { bold = false } = {}) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
const para = (text, { style, bold = false, right = false } = {}) => {
	const props = [style && `<w:pStyle w:val="${style}"/>`, right && '<w:jc w:val="right"/>'].filter(Boolean).join('')
	return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${run(text, { bold })}</w:p>`
}

function docxTable({ columns, rows }, write) {
	const cell = (text, { bold, right }) => `<w:tc>${para(text, { bold, right })}</w:tc>`
	const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns.map(c => cell(c.name, { bold: true, right: FIGURES.has(c.kind) })).join('')}</w:tr>`
	const body = rows.map(r => `<w:tr>${columns.map((c, i) => cell(plain(r[i], c.kind, write), { right: FIGURES.has(c.kind) })).join('')}</w:tr>`).join('')
	return `<w:tbl><w:tblPr><w:tblStyle w:val="Table"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>${head}${body}</w:tbl>${para('')}`
}

function build(doc, write) {
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

export const docx = { type: 'docx', name: 'Word', word: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', build }
