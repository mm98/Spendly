import { FILE_KEPT_DAYS, FILE_REFUSALS, FILE_ROWS_MOST, fileDownload, fileStates, makeFile, makesFiles, sweepFiles } from '../../lib/askFiles.js'
import { publicLink } from '../../lib/mail.js'
import { day, text } from '../schema.js'
import { COLUMN_KINDS } from './document.js'
import { FILE_FORMATS, fileFormat } from './formats.js'

/* The file maker (Ask 24d, 24e): a file the reader downloads, in one of the formats in formats.js, kept on Files. */

const formatOf = type => fileFormat(type) ?? FILE_FORMATS[0]
const nameOf = f => (f.name.toLowerCase() === f.type ? f.name : `${f.name} (${f.type})`)
const names = FILE_FORMATS.map(nameOf)
const notes = FILE_FORMATS.map(f => f.note).filter(Boolean)
const withOptions = FILE_FORMATS.filter(f => f.options)

const tool = {
	name: 'make_file',
	description: `Make a file the reader can download: ${names.slice(0, -1).join(', ')} or ${names.at(-1)}. Only when the reader asks for a file. Give "orders" to list the reader's orders (Spendly reads them itself, at most ${FILE_ROWS_MOST}), and "sections" for headings, text and your own tables. Answers a place mark to write on a line of its own in the answer, where the file belongs.`,
	input_schema: {
		type: 'object',
		properties: {
			type: text('The kind of file.', { enum: FILE_FORMATS.map(f => f.type) }),
			title: text('The heading at the top of the file, and the name it downloads as, in the language of the question, for example "Orders in October 2026". Short, and never the question itself.'),
			orders: {
				type: 'object',
				description: 'List these orders in the file as a table: date, shop, categories, status, reference, lines, saved and total. Every filter is optional.',
				properties: {
					from: day('The first day to include.'),
					to: day('The last day to include.'),
					vendorId: text('Only orders from this shop.'),
					categoryId: text('Only orders in this category.'),
					status: text('Only orders with this status key.'),
					query: text('Text to find in the orders.')
				}
			},
			sections: {
				type: 'array',
				description: ['Parts of the file in order, before the orders.', ...notes].join(' '),
				items: {
					type: 'object',
					properties: {
						heading: text('The part\'s heading.'),
						text: text('Paragraphs, split by an empty line. A line starting with "- " is a list item. Amounts written out with the currency.'),
						table: {
							type: 'object',
							properties: {
								columns: { type: 'array', items: { type: 'object', properties: { name: text('The column\'s heading.'), kind: text('What the column holds. An amount is a plain number.', { enum: COLUMN_KINDS }) }, required: ['name', 'kind'] } },
								rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number', 'null'] } }, description: 'One array per row, a cell per column. Amounts and numbers as plain numbers, dates as YYYY-MM-DD.' }
							},
							required: ['columns', 'rows']
						}
					}
				}
			},
			// a format's own options sit under its type, so two formats can name an option the same
			...(withOptions.length ? {
				options: {
					type: 'object',
					description: 'Settings for the kind of file, under its type. Each one is optional.',
					properties: Object.fromEntries(withOptions.map(f => [f.type, {
						type: 'object',
						properties: Object.fromEntries(Object.entries(f.options).map(([key, { default: _, ...schema }]) => [key, schema]))
					}]))
				}
			} : {})
		},
		required: ['type', 'title']
	}
}

const ORDER_COLUMNS = [
	{ name: 'Date', kind: 'date' }, { name: 'Shop', kind: 'text' }, { name: 'Categories', kind: 'text' }, { name: 'Status', kind: 'text' },
	{ name: 'Reference', kind: 'text' }, { name: 'Lines', kind: 'number' }, { name: 'Saved', kind: 'amount' }, { name: 'Total', kind: 'amount' }
]
const ORDERS_PAGE = 1000
const ORDER_FILTERS = ['from', 'to', 'vendorId', 'categoryId', 'status', 'query']

// the reader's orders as the file's table, read over the API like every tool; null when there are too many
async function ordersTable(filter, { token, self, signal }) {
	const read = async params => {
		const search = new URLSearchParams(params)
		for (const key of ORDER_FILTERS) if (typeof filter?.[key] === 'string' && filter[key]) search.set(key, filter[key])
		const answer = await fetch(`${self}/api/orders?${search}`, { headers: { Authorization: `Bearer ${token}` }, signal })
		if (!answer.ok) throw new Error(`orders answered ${answer.status}`)
		return answer.json()
	}
	const { matched } = await read({ pageSize: '0' })
	if (matched > FILE_ROWS_MOST) return null
	const rows = []
	for (let page = 1; rows.length < matched; page++) {
		const out = await read({ with: 'rows', sort: 'date-asc', page: String(page), pageSize: String(ORDERS_PAGE) })
		rows.push(...out.orders.filter(o => !o.draft))
		if (page >= out.pages) break
	}
	return {
		columns: ORDER_COLUMNS,
		rows: rows.map(o => [o.date, o.vendor?.name ?? '', (o.categories ?? []).map(c => c.name).join(', '), o.status ?? '', o.reference ?? '', o.itemCount ?? 0, o.saved ?? 0, o.total ?? 0])
	}
}

// a table the model wrote, held to the shape and size a file takes
function tableOf(table) {
	const columns = (Array.isArray(table?.columns) ? table.columns : []).slice(0, 30)
		.map(c => ({ name: String(c?.name ?? '').slice(0, 200), kind: COLUMN_KINDS.includes(c?.kind) ? c.kind : 'text' }))
	if (!columns.length) return null
	const rows = (Array.isArray(table?.rows) ? table.rows : []).slice(0, FILE_ROWS_MOST)
		.map(r => columns.map((c, i) => {
			const cell = Array.isArray(r) ? r[i] : null
			if (cell === null || cell === undefined) return null
			if ((c.kind === 'amount' || c.kind === 'number') && Number.isFinite(Number(cell)) && cell !== '') return Number(cell)
			return String(cell).slice(0, 2000)
		}))
	return { columns, rows }
}

async function make(input, making) {
	const format = formatOf(input?.type)
	const sections = (Array.isArray(input?.sections) ? input.sections : []).slice(0, 50).map(s => ({
		heading: s?.heading ? String(s.heading).slice(0, 200) : null,
		text: s?.text ? String(s.text).slice(0, 20000) : null,
		table: s?.table ? tableOf(s.table) : null
	}))
	let refusal = null
	if (input?.orders && typeof input.orders === 'object') {
		const table = await ordersTable(input.orders, making)
		if (table) sections.push({ heading: 'Orders', table })
		else refusal = FILE_REFUSALS.tooMany
	}
	const file = makeFile({
		userId: making.userId, chatId: making.chatId, day: making.today, unlimited: making.unlimited, title: making.question, askedAt: making.askedAt, type: format.type,
		doc: { title: String(input?.title || making.question).slice(0, 200), sections }, write: making.write, options: input?.options?.[format.type], refusal
	})
	const said = file.state === 'failed' ? ` It could not be made: ${file.reason} Say so in the answer.` : ''
	return { item: file, said: `The ${format.word} is {{file:${file.id}}}. Write this place mark on a line of its own in the answer.${said}` }
}

// the files one answer made together, named and sized, never linked: each says whether it is attached,
// and one that is not points to Files, where the download asks for a sign-in (emails/README.md)
function emailBlocks(ids, files, { attached }) {
	const shown = ids.map(id => files[id]).filter(f => f && f.state !== 'gone')
	if (!shown.length) return []
	return [{
		files: true,
		items: shown.map((f, i) => (f.state === 'failed'
			? { title: f.title, first: i === 0, failed: true, reason: f.reason }
			: { title: f.title, kind: f.kind, size: f.size, first: i === 0, attached: attached.has(f.id), kept_until: f.keptUntil })),
		files_url: publicLink('/ask/files')
	}]
}

// the files still kept go with the email, in the order the answers name them, while they fit
function attachments(userId, ids, files) {
	return ids.filter(id => files[id]?.state === 'ready').map(id => {
		const file = fileDownload(userId, id)
		return file && { id, inline: false, filename: file.name, content: file.content, contentType: file.mime }
	}).filter(Boolean)
}

export const fileMaker = {
	place: 'file',
	name: 'Files',
	formats: () => FILE_FORMATS.map(f => f.name),
	example: 'Make an Excel file of my orders in October',
	note: `Files are kept for ${FILE_KEPT_DAYS} days`,
	off: unlimited => (makesFiles(unlimited) ? null : 'Ask cannot make files on this Spendly.'),
	tool,
	doing: input => `Making your ${formatOf(input?.type).word}`,
	make,
	byIds: fileStates,
	emailBlocks,
	attachments,
	sweep: () => sweepFiles()
}
