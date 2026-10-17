import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Choice, Switch } from '../components/Choice.jsx'
import { Gauge, Stat } from '../components/Data.jsx'
import { Skeleton, Spinner, Stacked, useDismiss } from '../components/Utilities.jsx'
import { Alert, Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, useToast } from '../components/Overlays.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	checkImportDuplicates, failureMessage, getCurrentUser, getImportUndo, getImports, getKnownVendorNames, getSettings, importOrders,
	setImportHidden, startImport, undoImport
} from '../api/client.js'
import { amount, amountRound, dayShortMonth, dot, plural, shortDate } from '../api/format.js'
import { buildOrders, download, guessMapping, readSheet, reuseMapping, skippedCsv, templateWorkbook } from '../api/orderImport.js'
import { landing, useStepFocus } from './SettingsParts.jsx'
import { ImportFooter, MapStep } from './SettingsImportMap.jsx'
import { useStatuses } from '../app/statuses.js'
import { useShellShape } from '../app/useMedia.js'
import { ImportButton } from './BudgetImport.jsx'
import { LeaveDialog } from './vendorsCategories.jsx'

/* The server takes 50 MB per request and a receipt rides along as base64, so orders are sent
   in slices under this many bytes of JSON. */
const BATCH_BYTES = 40 * 1024 * 1024

function slices(orders) {
	const out = []
	let batch = [], bytes = 0, offset = 0
	for (const order of orders) {
		const size = JSON.stringify(order).length + 1
		if (batch.length && bytes + size > BATCH_BYTES) {
			out.push({ orders: batch, offset })
			offset += batch.length
			batch = []; bytes = 0
		}
		batch.push(order); bytes += size
	}
	out.push({ orders: batch, offset })
	return out
}

const itemsOf = order => (Array.isArray(order?.items) ? order.items : [])
// the item name orderImport.js gives a whole order with no description
const UNNAMED = 'Imported order'
const dateOf = o => (/^\d{4}-\d{2}-\d{2}$/.test(String(o.date)) ? shortDate(o.date) : o.date)
const linesIn = orders => orders.reduce((n, o) => n + itemsOf(o).length, 0)
// summed as a saved order's total is: its lines, plus shipping, less discount
const totalOne = o => itemsOf(o).reduce((n, i) => n + (Number(i?.price) * Number(i?.quantity) || 0), 0)
	+ (Number(o?.shipping) || 0) - (Number(o?.discount) || 0)
const totalOf = orders => orders.reduce((sum, o) => sum + totalOne(o), 0)

// names the account has no vendor for yet; `known` holds the names the server files under a vendor
const newVendors = (orders, known) => {
	const seen = new Set()
	for (const o of orders) {
		const name = String(o?.vendor ?? '').trim()
		if (name && !known.has(name)) seen.add(name.toLowerCase())
	}
	return seen.size
}

// the same column names in any order, matched as reuseMapping matches them
const columnKey = names => (names ?? []).map(n => String(n).trim().toLowerCase()).sort().join('\n')
const sameColumns = (a, b) => columnKey(a) === columnKey(b)

const FILE_ID = 'import-file'
const ACCEPT = '.csv,.xlsx,.json,text/csv,application/json'
const TEMPLATE = 'Spendly_import_template.xlsx'

const ordersWord = n => `${amount(n, 0)} ${n === 1 ? 'order' : 'orders'}`
const rowsWord = n => `${amount(n, 0)} ${n === 1 ? 'row' : 'rows'}`

/* The server refuses a row in the order form's words, which ask a question; a skipped row needs
   what is wrong with it. Kept in step with api/src/lib/validate.js; any other text shows as sent. */
const REASONS = [
	[/^Who did you buy from\?$/, 'The vendor is missing.'],
	[/^80 characters at most\.$/, 'The vendor name is longer than 80 characters.'],
	[/^When was the order placed\?$/, 'The date is missing, or is not written like 2026-08-18.'],
	[/^Pick a kind\.$/, 'The kind is missing.'],
	[/^Kind is one of: (.+)$/, m => `The kind is not one Spendly knows. Use one of: ${m[1]}`],
	[/^Status is one of: (.+)$/, m => `The status is not one Spendly knows. Use one of: ${m[1]}`],
	[/^That is not a valid date\.$/, 'A delivery or return date is not written like 2026-08-18.'],
	[/^A delivery cannot be dated in the future\.$/, 'The delivery date is in the future.'],
	[/^That is before the order date\.$/, 'The delivery date is before the order date.'],
	[/^A return cannot be dated in the future\.$/, 'The return date is in the future.'],
	[/^That is before the delivery date\.$/, 'The return date is before the delivery date.'],
	[/^Shipping must be/, 'The shipping is not an amount, or is below zero.'],
	[/^Discount must be/, 'The discount is not an amount, or is below zero.'],
	[/^An order needs at least one item\.$/, 'It has no items.'],
	[/^Describe the item\.$/, 'An item has no name.'],
	[/^120 characters at most\.$/, 'An item name or note is longer than 120 characters.'],
	[/^Quantity must be/, 'An item quantity is wrong. Use a number above 0 and at most 9999.'],
	[/^What did you pay\?$/, 'An item has no price.'],
	[/^Price cannot go below zero/, 'An item price is below zero.'],
	[/^Retail price must be/, 'An item retail price is not an amount, or is below zero.']
]
const reason = error => {
	for (const [pattern, plain] of REASONS) {
		const m = String(error).match(pattern)
		if (m) return typeof plain === 'function' ? plain(m) : plain
	}
	return error
}

// what a row of the file is called in a sentence: its row in a spreadsheet, its place in a JSON list
const where = (source, rows) => (source.kind === 'json' ? `Order ${rows[0]} in the file` : rows.length > 1 ? `Rows ${rows[0]} to ${rows.at(-1)}` : `Row ${rows[0]}`)

/** The import's stage and the mapping waiting for the next file. Settings holds them, so moving
    between its sections keeps an import, as it keeps every other unsaved change. */
export function useImportState() {
	const [stage, setStage] = useState({ name: 'rest' })
	const [reuse, setReuse] = useState(null)
	return { stage, setStage, reuse, setReuse }
}

/** The file of an import chosen and not yet written (stages 2 and 3), or null: until Import is
    pressed it is unsaved, and leaving loses it. */
export const importUnsaved = ({ stage }) => (stage.name === 'map' ? stage.file : stage.name === 'review' ? stage.source.file : null)

/** What leaving an import before it is written loses (11b). */
export const importLeaveBody = file => `${file} is not imported yet. Leaving discards the file and the column choices you made. No orders have been written.`

/* Import, as 11b: pick a file, map a spreadsheet's columns, check what it holds, then write it,
   with the last few imports listed for their mapping and their undo. Nothing is written before Import is pressed. */
export function ImportCard({ state }) {
	const history = useApi(getImports)
	const settings = useApi(getSettings)
	const held = useApi(getCurrentUser).data?.emailConfirmed === false
	const { stage, setStage, reuse, setReuse } = state
	const { box, then } = useStepFocus(stage)

	// a refused file mounts a fresh picker, which is what lets the same file be chosen again
	const refuse = problem => { then(FILE_ID); setStage(s => ({ name: 'rest', problem, attempt: (s.attempt ?? 0) + 1 })) }

	const read = async files => {
		const file = files?.[0]
		if (!file) return
		if (/\.json$/i.test(file.name) || file.type === 'application/json') {
			let parsed
			try { parsed = JSON.parse(await file.text()) } catch {
				return refuse('unreadable')
			}
			const list = Array.isArray(parsed) ? parsed : parsed?.orders
			if (!Array.isArray(list) || !list.length) return refuse('empty')
			then('heading')
			return setStage({ name: 'review', source: { kind: 'json', file: file.name, orders: list.map((draft, i) => ({ rows: [i + 1], draft })), skipped: [] } })
		}
		if (!/\.(csv|xlsx)$/i.test(file.name)) return refuse('type')
		let rows
		try { rows = await readSheet(file) } catch {
			return refuse('unreadable')
		}
		if (rows.length < 2) return refuse('empty')
		const fresh = {
			shape: 'line', line: guessMapping(rows, 'line'), order: guessMapping(rows, 'order'),
			group: 'reference', categories: {}
		}
		const kept = reuse && (!reuse.replacing || sameColumns(reuse.names, rows[0])) ? reuse : null
		const mapping = kept ? reuseMapping(kept, rows) : fresh
		if (kept) {
			mapping.line = mapping.shape === 'line' ? mapping.columns : fresh.line
			mapping.order = mapping.shape === 'order' ? mapping.columns : fresh.order
		}
		setReuse(null)
		then('heading')
		setStage({ name: 'map', file: file.name, rows, mapping })
	}

	const restart = () => { then(FILE_ID); setStage({ name: 'rest' }) }
	const replace = () => {
		const { mapping } = stage
		setReuse({ ...mapping, columns: mapping[mapping.shape], names: stage.rows[0], fileName: stage.file, replacing: true })
		restart()
	}

	if (stage.name === 'map') return (
		<MapStep box={box} file={stage.file} rows={stage.rows} mapping={stage.mapping}
			onChange={patch => setStage(s => ({ ...s, mapping: { ...s.mapping, ...patch } }))}
			onReplace={replace}
			onPreview={facts => {
				const mapping = { ...stage.mapping, columns: facts.columns, dateFormat: facts.dateFormat, decimal: facts.decimal }
				// a spreadsheet names no kind or status, so each order takes the account's defaults for a new one
				const { orders, skipped } = buildOrders(facts.body, mapping,
					{ kind: settings.data?.defaultKind ?? 'Expense', status: settings.data?.defaultStatus ?? 'Delivered' })
				then('heading')
				setStage({ name: 'review', back: stage, source: { kind: 'sheet', file: stage.file, header: stage.rows[0], body: facts.body, mapping, orders, skipped } })
			}} />
	)

	if (stage.name === 'review' || stage.name === 'importing')
		return <ReviewStep box={box} stage={stage} setStage={setStage} then={then} restart={restart} />

	if (stage.name === 'done') return <DoneStep box={box} stage={stage} setStage={setStage} restart={restart} history={history} />

	if (stage.name === 'undone') return (
		<Card ref={box}>
			<CardHeader name="Import" {...landing('import')} />
			<ListItem color="success">
				<span className="sp-row-flex sp-flex-none"><Icon name="check" /></span>
				<span className="sp-subtitle sp-ink-accent">The import is undone. {ordersWord(stage.removed)} {stage.removed === 1 ? 'was' : 'were'} removed, with the vendors and categories it created.</span>
			</ListItem>
			<ImportFooter>
				<Button variant="outline" onClick={restart}>Import another file</Button>
			</ImportFooter>
		</Card>
	)

	return (
		<>
			<Card ref={box}>
				<CardHeader name="Import" {...landing('import')} />
				{held
					? (
						<FileDrop disabled>
							<Mark size="medium" fill="solid" aria-label="Upload" aria-hidden="true"><Icon name="upload" /></Mark>
							<span className="sp-title sp-ink-2">Drop a file, or choose one</span>
							<span className="sp-meta">Available once your email is confirmed</span>
						</FileDrop>
					)
					: (
						<FileDrop key={stage.attempt ?? 0} id={FILE_ID} accept={ACCEPT} onFiles={read}>
							<Mark size="medium" fill="solid" aria-label="Upload" aria-hidden="true"><Icon name="upload" /></Mark>
							<span className="sp-title">Drop a file, or choose one</span>
							<span className="sp-subtitle">CSV, XLSX or a JSON export. One row per item line, or one row per order - both work.</span>
						</FileDrop>
					)}
				{reuse && !reuse.replacing
					? (
						<ListItem color="success">
							<span className="sp-row-flex sp-flex-none"><Icon name="check" /></span>
							<span className="sp-subtitle sp-ink-accent sp-grow">The next file is read with the mapping from {reuse.fileName}.</span>
							<Button variant="text" size="small" onClick={() => setReuse(null)}>Don't</Button>
						</ListItem>
					)
					: null}
				{stage.problem
					? (
						<Well color="danger">
							<span className="sp-title sp-ink-danger">
								{stage.problem === 'empty' ? 'There are no orders in that file.'
									: stage.problem === 'type' ? 'Spendly cannot read that kind of file.'
									: 'That file could not be read.'}
							</span>
							<span className="sp-meta sp-ink-danger">Choose a CSV or XLSX spreadsheet, or a .json file exported from Spendly or a similar app.</span>
						</Well>
					)
					: null}
				<div className="sp-stack sp-gap-8">
					<span className="sp-section-label">Or start from a template</span>
					<ListItem variant="outline">
						<span className="sp-row-flex sp-flex-none"><Icon name="file" /></span>
						<span className="sp-data sp-grow sp-truncate">{TEMPLATE}</span>
						<Button variant="outline" size="small" onClick={() => download(TEMPLATE, templateWorkbook(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}>Download</Button>
					</ListItem>
					<span className="sp-meta">Fill it in and upload it - the columns are already named correctly.</span>
				</div>
			</Card>
			<History history={history} onReuse={item => { setReuse({ ...item.mapping, fileName: item.fileName }); then(FILE_ID) }} />
			<BudgetImport />
		</>
	)
}

/** The budget's own Excel import, the same button Budget has (21f): it opens the newest year it brought in. */
function BudgetImport() {
	const navigate = useNavigate()
	return (
		<Card>
			<CardHeader name="Budget" />
			<span className="sp-data">An Excel workbook with one sheet for each year, named like 2026. You see the years it holds before anything is written.</span>
			<div className="sp-row-flex">
				<ImportButton onImported={years => navigate(`/budget/${Math.max(...years)}`)} />
			</div>
		</Card>
	)
}

/** Previous imports (11b): when, what each wrote, its undo for a day, and its menu: the mapping to
    reuse, and once the undo has gone, the way to remove the line from the list. */
function History({ history, onReuse }) {
	const toast = useToast()
	// on a phone Undo takes a row of its own under the name, which keeps the whole width beside the menu
	const touch = useShellShape() === 'touch'
	const [busy, setBusy] = useState(null)
	const [said, setSaid] = useState(null)
	const [asking, setAsking] = useState(null)
	const list = history.data ?? []
	if (!list.length) return null
	const undo = item => {
		setAsking(null)
		setBusy(item.id)
		setSaid(null)
		undoImport(item.id)
			.then(out => setSaid(`${item.fileName}: ${ordersWord(out.orders)} removed.`))
			.catch(e => setSaid(failureMessage(e, 'The import was not undone. Try again.')))
			.finally(() => { setBusy(null); history.refresh() })
	}
	const hide = (item, hidden) => setImportHidden(item.id, hidden).then(() => history.refresh())
	const remove = item => {
		setBusy(item.id)
		hide(item, true)
			.then(() => toast({
				message: `${item.fileName} removed from Previous imports`,
				undo: {
					label: 'Undo',
					onClick: () => hide(item, false).catch(e => toast({ message: failureMessage(e, `${item.fileName} was not put back. Try again.`), color: 'danger' }))
				}
			}))
			.catch(e => toast({ message: failureMessage(e, `${item.fileName} was not removed. Try again.`), color: 'danger' }))
			.finally(() => setBusy(null))
	}
	return (
		<Card>
			<CardHeader name="Previous imports" />
			{list.map((item, i) => {
				const facts = [dayShortMonth(new Date(item.createdAt * 1000).toISOString().slice(0, 10)), ordersWord(item.orders)]
				if (item.skipped) facts.push(`${amount(item.skipped, 0)} skipped`)
				if (item.undone) facts.push('undone')
				const undo = item.undoable
					? <Button variant="outline" size={touch ? 'standard' : 'small'} fullWidth={touch} disabled={busy === item.id} onClick={() => setAsking(item)}>Undo</Button>
					: null
				return (
					<div key={item.id} className="sp-stack sp-gap-12">
						{i ? <span className="sp-rule" /> : null}
						<div className="sp-row-flex sp-gap-12">
							<Stacked>
								<span className="sp-title sp-truncate">{item.fileName}</span>
								<span className="sp-meta sp-truncate">{facts.join(dot)}</span>
							</Stacked>
							{touch ? null : undo}
							<ImportMenu item={item} disabled={busy === item.id} onReuse={() => onReuse(item)} onRemove={() => remove(item)} />
						</div>
						{touch ? undo : null}
					</div>
				)
			})}
			{said ? <span className="sp-meta" role="status">{said}</span> : null}
			{asking ? <UndoImport id={asking.id} onCancel={() => setAsking(null)} onConfirm={() => undo(asking)} /> : null}
		</Card>
	)
}

/** A line's menu in Previous imports (11b, c9): Reuse mapping, and Remove from this list once the
    line has no Undo. A line with neither has no menu. */
function ImportMenu({ item, disabled, onReuse, onRemove }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	if (!item.mapping && item.undoable) return null
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" disabled={disabled} aria-label={`Actions for ${item.fileName}`}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open
				? (
					<Menu position="floating" aria-label={item.fileName}>
						{item.mapping ? <MenuItem onClick={() => { close(); onReuse() }}>Reuse mapping</MenuItem> : null}
						{item.undoable ? null : <MenuItem onClick={() => { close(); onRemove() }}>Remove from this list</MenuItem>}
					</Menu>
				)
				: null}
		</Anchor>
	)
}

/** "Undo this import?" (11b), from stage 4 and from Previous imports: what the undo deletes, counted
    as it stands now, so every number in it is true. Delete waits for the count. */
function UndoImport({ id, onCancel, onConfirm }) {
	const counts = useApi(getImportUndo, [id])
	const c = counts.data
	let body
	if (c) {
		const made = [[c.vendors, 'vendor'], [c.categories, 'category', 'categories']].filter(([n]) => n > 0).map(([n, noun, many]) => plural(n, noun, many))
		const also = made.length ? `${c.orders ? ', and' : ''} the ${made.join(' and ')} it created that nothing else uses now` : ''
		const what = c.orders ? `its ${ordersWord(c.orders)} and ${plural(c.lines, 'item line')}${also}` : also.replace(/^, and /, '')
		const day = dayShortMonth(new Date(c.createdAt * 1000).toISOString().slice(0, 10))
		body = (
			<>
				<DialogBody>{c.fileName}, imported {day}. {what ? `Undoing deletes ${what}.` : 'Its orders are already deleted.'}</DialogBody>
				{c.changed
					? <ListItem>{c.changed === 1 ? '1 of these orders was changed after the import. It is deleted too, with the changes.' : `${amount(c.changed, 0)} of these orders were changed after the import. They are deleted too, with the changes.`}</ListItem>
					: null}
			</>
		)
	} else if (counts.error)
		body = (
			<Alert color="danger" mark="!" title="What the undo deletes did not load"
				action={<Button variant="outline" size="small" onClick={counts.refresh}>Try again</Button>}>
				Nothing is deleted yet. Check your connection.
			</Alert>
		)
	else
		body = (
			<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Counting what the undo deletes">
				<Skeleton shape="line" />
				<Skeleton shape="short" />
			</div>
		)
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>Undo this import?</DialogTitle>
			{body}
			<DialogActions>
				<Button variant="outline" fullWidth onClick={onCancel}>Keep the orders</Button>
				<Button color="danger" fullWidth disabled={!c?.undoable} onClick={onConfirm}>{c?.orders ? `Delete ${ordersWord(c.orders)}` : 'Undo this import'}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** Step 3 (11b): what will be written, what looks like it is already here, what cannot be read. */
function ReviewStep({ box, stage, setStage, then, restart }) {
	const { source } = stage
	// which of the file's vendor names the account already has
	const names = [...new Set(source.orders.map(o => String(o.draft?.vendor ?? '').trim()).filter(Boolean))]
	const vendors = useApi(getKnownVendorNames, [names], { enabled: names.length > 0 })
	const known = names.length ? (vendors.data ? new Set(vendors.data) : null) : new Set()
	const busy = stage.name === 'importing'
	const [duplicates, setDuplicates] = useState(null)
	const [withDuplicates, setWithDuplicates] = useState(false)
	const [drafts, setDrafts] = useState(true)
	const [open, setOpen] = useState(null)
	const [leaving, setLeaving] = useState(false)
	useEffect(() => {
		const ask = new AbortController()
		checkImportDuplicates(source.orders.map(o => ({ vendor: o.draft?.vendor, date: o.draft?.date, total: totalOne(o.draft) })), ask.signal)
			.then(out => setDuplicates(new Set(out.duplicates)))
			.catch(() => setDuplicates(new Set()))
		return () => ask.abort()
	}, [source])

	const statuses = useStatuses()
	const draftKey = statuses.find(s => s.type === 'draft')?.key
	const canDraft = !!draftKey
	const sending = source.orders.filter((_, i) => withDuplicates || !duplicates?.has(i))
	const drafts$ = sending.map(o => (canDraft && drafts && source.kind === 'sheet' ? { ...o.draft, status: draftKey } : o.draft))
	const fresh = known && !vendors.loading ? newVendors(drafts$, known) : null
	const reasons = new Map()
	for (const s of source.skipped) reasons.set(s.reason, [...(reasons.get(s.reason) ?? []), s])
	const toggle = key => setOpen(o => (o === key ? null : key))

	const run = async () => {
		then('heading')
		setStage({ ...stage, name: 'importing', done: 0 })
		const failed = []
		let imported = 0, lines = 0, importId = null
		try {
			const unread = source.skipped.reduce((n, s) => n + s.rows.length, 0)
			const record = await startImport(source.file, source.kind === 'sheet' ? { ...source.mapping, names: source.header } : null, unread)
			importId = record.id
			for (const batch of slices(drafts$)) {
				try {
					const result = await importOrders(batch.orders, {
						importId,
						onRows: done => setStage(s => (s.name === 'importing' ? { ...s, done: batch.offset + done } : s))
					})
					imported += result.imported
					lines += result.orders.reduce((n, o) => n + itemsOf(o).length, 0)
					failed.push(...result.failed.map(f => ({ ...f, index: f.index + batch.offset })))
				} catch (e) {
					// a 400 here names every refused row; anything else stops the import
					if (e.status === 400 && e.body?.failed) failed.push(...e.body.failed.map(f => ({ ...f, index: f.index + batch.offset })))
					else if (e.status === 413) failed.push({ index: batch.offset, error: 'This order is too big to send.' })
					else throw e
				}
			}
			if (imported) invalidate()
			then('heading')
			setStage({ name: 'done', importId, source, sent: sending, imported, lines, failed, fresh })
		} catch (e) {
			// the batch in flight may have written orders that never came back counted
			invalidate()
			then('heading')
			setStage({ name: 'done', importId, source, sent: sending, imported, lines, failed, fresh, stopped: true, why: failureMessage(e, '') })
		}
	}

	const heading = <CardHeader name="Import" {...landing('import')} />
	const preview = drafts$.slice(0, 5)
	const wholeOrders = source.mapping?.shape === 'order'
	return (
		<Card ref={box}>
			{heading}
			<div className="sp-stats">
				<Stat large label="Orders" figure={amount(drafts$.length, 0)} />
				<Stat large label="Item lines" figure={amount(linesIn(drafts$), 0)} />
				{fresh === null ? null : <Stat large label="New vendors" figure={amount(fresh, 0)} />}
				<Stat large label="Total" figure={amountRound(totalOf(drafts$))} />
			</div>
			{duplicates?.size || reasons.size
				? (
					<>
						<span className="sp-rule" />
						<div className="sp-stack sp-gap-8">
							{duplicates?.size
								? (
									<>
										<ListItem color="warning" count={amount(duplicates.size, 0)}>
											<span className="sp-data sp-ink-warning sp-grow">{duplicates.size === 1 ? 'row looks like an order you already have' : 'rows look like orders you already have'}</span>
											<Button variant="text" size="small" color="warning" onClick={() => toggle('dupes')}>{open === 'dupes' ? 'Hide' : 'Review'}</Button>
										</ListItem>
										{open === 'dupes'
											? (
												<div className="sp-stack sp-gap-8">
													{[...duplicates].slice(0, 20).map(i => {
														const o = source.orders[i]
														return <span key={i} className="sp-meta">{where(source, o.rows)}: {o.draft.vendor}, {shortDate(o.draft.date)}, {amount(totalOne(o.draft))}</span>
													})}
													<Choice control={<Switch checked={withDuplicates} disabled={busy} onChange={ev => setWithDuplicates(ev.target.checked)} />}>
														Import these too
													</Choice>
												</div>
											)
											: null}
									</>
								)
								: null}
							{[...reasons].map(([why, list]) => {
								const count = list.reduce((n, s) => n + s.rows.length, 0)
								return (
									<div key={why} className="sp-stack sp-gap-8">
										<ListItem color="danger" count={amount(count, 0)}>
											<span className="sp-data sp-ink-danger sp-grow">{count === 1 ? 'row' : 'rows'} can't be imported - {why}</span>
											<Button variant="text" size="small" color="danger" onClick={() => toggle(why)}>{open === why ? 'Hide' : 'See them'}</Button>
										</ListItem>
										{open === why ? <span className="sp-meta">{list.slice(0, 40).map(s => where(source, s.rows)).join(dot)}{list.length > 40 ? `${dot}and ${amount(list.length - 40, 0)} more` : ''}</span> : null}
									</div>
								)
							})}
							{reasons.size ? <span className="sp-meta">Rows that can't be imported are skipped. You can download them, correct them, and import them again.</span> : null}
						</div>
					</>
				)
				: null}
			{preview.length
				? (
					<>
						<span className="sp-rule" />
						<div className="sp-stack sp-gap-8">
							<span className="sp-section-label">{preview.length === 5 ? 'First five orders, as they will be saved' : 'The orders, as they will be saved'}</span>
							<div className="sp-list st-sideways">
								{wholeOrders
									? (
										<table className="sp-table sp-table--static st-table" data-cols="imports">
											<thead>
												<tr>
													<th scope="col" className="sp-col-title">Vendor</th>
													<th scope="col" className="sp-col-date">Date</th>
													<th scope="col">Item line</th>
													<th scope="col" className="sp-col-amount">Total</th>
												</tr>
											</thead>
											<tbody>
												{preview.map((o, i) => {
													const line = itemsOf(o)[0]
													return (
														<tr key={i}>
															<td className="sp-col-title"><span className="sp-title sp-truncate">{o.vendor}</span></td>
															<td><span className="sp-data sp-ink-2">{dateOf(o)}</span></td>
															<td><span className={'sp-data sp-truncate ' + (line?.title === UNNAMED ? 'sp-ink-5' : 'sp-ink-2')}>{line ? `${line.title} × ${line.quantity}` : ''}</span></td>
															<td className="sp-col-amount"><div className="sp-stacked sp-cell-amount"><span className="sp-amount">{amountRound(totalOne(o))}</span></div></td>
														</tr>
													)
												})}
											</tbody>
										</table>
									)
									: (
										<table className="sp-table sp-table--static st-table" data-cols="preview">
											<thead>
												<tr>
													<th scope="col" className="sp-col-title">Vendor</th>
													<th scope="col" className="sp-col-date">Date</th>
													<th scope="col" className="st-w-lines">Lines</th>
													<th scope="col">Category</th>
													<th scope="col" className="sp-col-amount">Amount</th>
												</tr>
											</thead>
											<tbody>
												{preview.map((o, i) => {
													const isNew = known && !known.has(String(o.vendor ?? '').trim())
													return (
														<tr key={i}>
															<td className="sp-col-title"><span className="sp-title sp-truncate">{o.vendor}</span></td>
															<td><span className="sp-data sp-ink-2">{dateOf(o)}</span></td>
															<td><span className="sp-data sp-ink-2">{itemsOf(o).length}</span></td>
															<td>{o.categories?.length
																? <span className="sp-data sp-ink-2 sp-truncate">{o.categories.join(', ')}</span>
																: isNew ? <span className="sp-data sp-ink-warning">New vendor</span>
																: <span className="sp-data sp-ink-5">None</span>}</td>
															<td className="sp-col-amount"><div className="sp-stacked sp-cell-amount"><span className="sp-amount">{amountRound(totalOne(o))}</span></div></td>
														</tr>
													)
												})}
											</tbody>
										</table>
									)}
							</div>
						</div>
					</>
				)
				: null}
			{canDraft && source.kind === 'sheet'
				? (
					<Choice variant="described" control={<Switch checked={drafts} disabled={busy} onChange={ev => setDrafts(ev.target.checked)} />}
						description="Drafts don't count in Statistics until you set a status on them.">
						Bring them in as drafts
					</Choice>
				)
				: null}
			{busy
				? (
					<>
						<Gauge thin value={(stage.done / Math.max(1, drafts$.length)) * 100} aria-label="Import progress" />
						<div className="sp-sum">
							<span className="sp-meta">{amount(stage.done, 0)} of {amount(drafts$.length, 0)}</span>
							<span className="sp-grow" />
							<span className="sp-meta">This can take a moment.</span>
						</div>
					</>
				)
				: null}
			<ImportFooter>
				<Button variant="outline" disabled={busy} onClick={() => setLeaving(true)}>Cancel</Button>
				<span className="st-push" />
				{stage.back ? <Button variant="outline" disabled={busy} onClick={() => { then('heading'); setStage(stage.back) }}>Back to mapping</Button> : null}
				{busy
					? <Button disabled><Spinner />Importing…</Button>
					: <Button disabled={!drafts$.length || duplicates === null} onClick={run}>Import {ordersWord(drafts$.length)}</Button>}
			</ImportFooter>
			{leaving ? <LeaveDialog body={importLeaveBody(source.file)} onStay={() => setLeaving(false)} onLeave={restart} /> : null}
		</Card>
	)
}

/** Step 4 (11b): what was written, its undo for a day, the skipped rows to fix, and the way to the orders. */
function DoneStep({ box, stage, setStage, restart, history }) {
	const { imported, lines, failed, stopped, source, sent, fresh, importId } = stage
	const [undoing, setUndoing] = useState(false)
	const [asking, setAsking] = useState(false)
	const [problem, setProblem] = useState(null)
	useEffect(() => { history.refresh() }, [])
	const record = history.data?.find(h => h.id === importId)
	const vendorsMade = record ? record.vendors : fresh
	const heading = <CardHeader name="Import" {...landing('import')} />
	const again = <Button variant="outline" onClick={restart}>Import another file</Button>

	// every row the file had that was not written: unreadable here, or refused by the server
	const refused = failed.map(f => ({ rows: sent[f.index]?.rows ?? [], reason: reason(f.error) }))
	const skipped = [...source.skipped, ...refused]
	const skippedRows = skipped.reduce((n, s) => n + s.rows.length, 0)
	const saveSkipped = () => {
		if (source.kind === 'sheet') {
			download(source.file.replace(/\.(csv|xlsx)$/i, '') + ' - skipped.csv', skippedCsv(source.header, source.body, skipped), 'text/csv;charset=utf-8')
		} else {
			const orders = failed.filter(f => sent[f.index]?.draft).map(f => ({ ...sent[f.index].draft, reason: reason(f.error) }))
			download(source.file.replace(/\.json$/i, '') + ' - skipped.json', JSON.stringify({ orders }, null, '\t'), 'application/json')
		}
	}
	const undo = () => {
		setAsking(false)
		setUndoing(true)
		setProblem(null)
		undoImport(importId)
			.then(out => setStage({ name: 'undone', removed: out.orders }))
			.catch(e => { setUndoing(false); setProblem(failureMessage(e, 'The import was not undone. Try again.')) })
	}
	const asked = asking ? <UndoImport id={importId} onCancel={() => setAsking(false)} onConfirm={undo} /> : null

	const reasons = skipped.length
		? (
			<ListItem color="danger">
				<span className="sp-stack sp-gap-6">
					{skipped.slice(0, 3).map((s, i) => (
						<span key={i} className="sp-data sp-ink-danger">{where(source, s.rows)}: {s.reason}</span>
					))}
					{skipped.length > 3 ? <span className="sp-meta sp-ink-danger">And {amount(skipped.length - 3, 0)} more.</span> : null}
				</span>
			</ListItem>
		)
		: null
	const downloadButton = skipped.length ? <Button variant="outline" onClick={saveSkipped}>Download skipped</Button> : null

	if (stopped || !imported) return (
		<Card ref={box}>
			{heading}
			<Well color="danger">
				<span className="sp-title sp-ink-danger">{stopped ? 'The import stopped before the end.' : 'No orders were imported.'}</span>
				<span className="sp-meta sp-ink-danger">
					{stopped
						? `${imported ? `At least ${ordersWord(imported)} ${imported === 1 ? 'was' : 'were'} imported. ` : ''}${stage.why ? stage.why + ' ' : ''}Look at your orders before you import this file again.`
						: 'Fix the rows in the file, then import it again.'}
				</span>
			</Well>
			{reasons}
			<ImportFooter>
				{again}
				<span className="st-push" />
				{downloadButton}
				{stopped && importId && imported ? <Button variant="outline" disabled={undoing} onClick={() => setAsking(true)}>Undo this import</Button> : null}
			</ImportFooter>
			{asked}
		</Card>
	)

	const facts = [plural(lines, 'item line')]
	if (vendorsMade) facts.push(`${plural(vendorsMade, 'vendor')} created`)
	if (skippedRows) facts.push(`${rowsWord(skippedRows)} skipped`)
	return (
		<Card ref={box}>
			{heading}
			<div className="sp-row-flex sp-gap-12">
				<Mark size="medium" round aria-label="Imported"><Icon name="check" /></Mark>
				<Stacked>
					<span className="sp-heading sp-truncate">{ordersWord(imported)} imported</span>
					<span className="sp-subtitle">{facts.join(dot)}</span>
				</Stacked>
			</div>
			{reasons}
			<span className="sp-meta">Undo removes exactly what this import wrote, including the vendors it created, for 24 hours. After that the orders are ordinary orders.</span>
			{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
			<ImportFooter>
				<Button variant="outline" disabled={undoing} onClick={() => setAsking(true)}>{undoing ? 'Undoing…' : 'Undo this import'}</Button>
				<span className="st-push" />
				{downloadButton}
				<Button to={`/orders?import=${encodeURIComponent(importId)}`}>See the {ordersWord(imported)}</Button>
			</ImportFooter>
			{asked}
		</Card>
	)
}
