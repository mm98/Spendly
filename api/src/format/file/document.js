/* A document is { title, sections: [{ heading?, text?, table?: { columns: [{ name, kind }], rows } }] }, what every
   file format builds from. `text` splits paragraphs on an empty line, and "- " starts a list item. */

export const COLUMN_KINDS = ['text', 'amount', 'number', 'date']
// the kinds a table lines up on the right
export const FIGURES = new Set(['amount', 'number'])

// the option every format with pages offers (README: "What Ask makes")
export const PAGE_ORIENTATION = {
	type: 'string',
	enum: ['portrait', 'landscape'],
	description: 'Which way the page lies: portrait is tall, landscape is wide. Landscape when the reader asks for it, or when a table has many columns.',
	default: 'portrait'
}

export const xml = value => String(value ?? '')
	// characters XML 1.0 cannot hold at all, which a pasted note can carry
	.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
	.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const tablesOf = doc => doc.sections.filter(s => s.table?.columns?.length)
export const paragraphsOf = text => String(text ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
export const isNumber = v => typeof v === 'number' && Number.isFinite(v)
export const plain = (cell, kind, write) => {
	if (cell === null || cell === undefined || cell === '') return ''
	if (kind === 'amount' && isNumber(cell)) return write.money(cell)
	if (kind === 'number' && isNumber(cell)) return write.count(cell)
	if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(cell)) return write.date(cell)
	return String(cell)
}

