import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Card, CardBody, Panel, Toolbar } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Computed, LineEditor } from '../components/LineEditor.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField, TokensField } from '../components/Inputs.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { DateField } from '../components/DatePickers.jsx'
import { Check } from '../components/Choice.jsx'
import { Sum } from '../components/Data.jsx'
import { Pill } from '../components/Pill.jsx'
import { Slot } from '../components/FileDrop.jsx'
import { AttachmentAdd, Strip } from '../components/Attachments.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty } from '../components/Utilities.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { useApi } from '../api/useApi.js'
import {
	addAttachments, addItemAttachments, addVendorAlias, attachScanDocument, categoriesForVendor, createOrder,
	failureMessage, getVendors, invalidateOrderData, invalidateVendorData, removeAttachment,
	removeItemAttachment, spendKinds, updateOrder, vendorByAnyName, vendorTextMatch
} from '../api/client.js'
import { activeLocaleCode, amount, currencySymbol, today } from '../api/format.js'
import {
	AttachmentTile, LineAmount, LinePhoto, SEP, Saving, dayShortMonth, itemsWord, lineMeta, lineTotal, money, saves, totalsOf,
	useTouch
} from './OrderParts.jsx'
import { useLeaveGuard } from './vendorsCategories.jsx'

/* The order as a form (1d): editing and every way to create one are this screen in another
   state (3a, 3b). Nothing reaches the server until Save or Create writes the order, then its files. */

const MONEY = 'da-DK'
const STATUSES = ['Ordered', 'Delivered', 'Returned'].map(s => ({ value: s, label: s }))

const orderErrors = d => {
	const e = {}
	if (!d.vendor.trim()) e.vendor = 'A vendor is required. Pick one or create it here.'
	else if (d.vendor.trim().length > 80) e.vendor = '80 characters at most.'
	if (!d.date) e.date = 'When was the order placed?'
	else if (d.date > today()) e.date = 'An order cannot be dated in the future.'
	if (!spendKinds.includes(d.kind)) e.kind = 'Pick a kind.'
	return e
}

/** A message that blocks the save, or nothing: a danger type alone marks the field invalid. */
const problem = message => (message ? { message, messageType: 'danger' } : {})

const lineErrors = v => {
	const e = {}
	if (!String(v.title ?? '').trim()) e.title = 'Describe the item.'
	else if (v.title.trim().length > 120) e.title = '120 characters at most.'
	if (!(Number(v.quantity) > 0)) e.quantity = 'More than 0. Remove the line instead of setting it to zero.'
	else if (Number(v.quantity) > 9999) e.quantity = '9999 at most.'
	if (v.price == null) e.price = 'What did you pay?'
	return e
}

/** A saved order as the form's draft. Its lines keep their ids, so a save edits them in place. */
export function draftOf(order) {
	const last = status => order.statusHistory.findLast(s => s.status === status)?.date ?? ''
	return {
		vendor: order.vendor?.name ?? '', date: order.date, status: order.status, kind: order.kind,
		deliveredDate: last('Delivered'), returnedDate: last('Returned'),
		categories: order.categories.map(c => c.name),
		shipping: order.shipping || null, discount: order.discount || null,
		reference: order.reference ?? '', note: order.note ?? '', refunded: order.refunded,
		lines: order.items.map(item => ({
			key: item.id, id: item.id, title: item.title, quantity: item.quantity, price: item.price,
			retail: item.retail ?? null, note: item.note ?? '',
			photo: item.attachments?.[0] ?? null
		}))
	}
}

/** The draft as the API takes it. A status date the form does not show follows the order's. */
function apiDraft(d, lines) {
	const delivered = d.status === 'Ordered' ? '' : [d.deliveredDate || today(), d.date].sort().at(-1)
	const returned = d.status === 'Returned' ? [d.returnedDate || today(), delivered].sort().at(-1) : ''
	return {
		vendor: d.vendor.trim(), date: d.date, status: d.status, kind: d.kind,
		deliveredDate: delivered, returnedDate: returned,
		categories: d.categories, shipping: d.shipping ? amount(d.shipping) : '', discount: d.discount ? amount(d.discount) : '',
		reference: d.reference, note: d.note, refunded: d.refunded,
		items: lines.map(l => ({ ...(l.id ? { id: l.id } : {}), title: l.title.trim(), quantity: l.quantity, price: l.price, retail: l.retail, note: l.note }))
	}
}

let made = 0
const freshKey = () => `new-${++made}`

/** `origin` is `{ copy: { id, vendor, date } }` or `{ scan: answer }`; `region` draws the split
    itself, for a route whose body is not already the split. */
export function OrderForm({ mode, orderId, seed, origin = {}, files: savedFiles = [], photoUrl = () => null, region = false, onLeave }) {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useTouch()
	const vendors = useApi(getVendors)
	const creating = mode === 'new'
	const scan = origin.scan ?? null

	const [draft, setDraft] = useState(() => ({ ...seed, lines: undefined }))
	const [lines, setLines] = useState(seed.lines)
	const [editing, setEditing] = useState(() => (creating && !seed.lines.length && !scan ? newEditing() : null))
	const [tried, setTried] = useState(false)
	const [saving, setSaving] = useState(false)
	const [files, setFiles] = useState([])
	const [gone, setGone] = useState([])
	const [folded, setFolded] = useState(true)
	const [reordering, setReordering] = useState(false)
	const [carried, setCarried] = useState(null)
	const [asking, setAsking] = useState(false)
	const list = useRef(null)
	// the line or add control whose editor is open, which takes focus back when it closes
	const reopen = useRef(editing?.isNew ? 'add' : null)
	const dragged = useRef(false)
	const [start] = useState(seed)
	const staged = useRef(files)
	staged.current = files
	const statusName = useId()

	const set = patch => setDraft(d => ({ ...d, ...patch }))
	const errors = orderErrors(draft)
	const shown = tried ? errors : {}
	const included = lines.filter(l => l.include !== false)
	const sums = totalsOf(included, draft.shipping, draft.discount)

	const lineChanged = editing && (editing.isNew
		? editing.values.title.trim() || editing.values.price != null || editing.values.newPhoto
		: JSON.stringify(editing.values) !== JSON.stringify(lines.find(l => l.key === editing.key)))
	const dirty = Boolean(lineChanged) || files.length > 0 || gone.length > 0
		|| JSON.stringify(draft) !== JSON.stringify({ ...start, lines: undefined })
		|| JSON.stringify(lines) !== JSON.stringify(start.lines)
	const guard = useLeaveGuard(dirty)

	/* ---- lines ---- */

	function newEditing() {
		return { key: freshKey(), isNew: true, values: { title: '', quantity: 1, price: null, retail: null, note: '', photo: null, newPhoto: null, dropPhoto: false } }
	}
	const openLine = line => {
		if (editing && !Object.keys(lineErrors(editing.values)).length) commitInto(editing)
		reopen.current = line.key
		setEditing({ key: line.key, isNew: false, values: { ...line } })
	}
	const openNew = () => {
		reopen.current = 'add'
		setEditing(e => (e?.isNew ? e : newEditing()))
	}
	const commitInto = current => setLines(ls => current.isNew
		? [...ls, { ...current.values, key: current.key, include: true, uncertain: false }]
		: ls.map(l => (l.key === current.key ? { ...current.values, uncertain: false } : l)))
	const commit = next => {
		if (!editing) return
		if (Object.keys(lineErrors(editing.values)).length) {
			setEditing(e => ({ ...e, tried: true }))
			return
		}
		commitInto(editing)
		if (!next) return setEditing(null)
		const at = lines.findIndex(l => l.key === editing.key)
		const following = editing.isNew || at === lines.length - 1 ? null : lines[at + 1]
		reopen.current = following?.key ?? 'add'
		setEditing(following ? { key: following.key, isNew: false, values: { ...following } } : newEditing())
	}
	useEffect(() => {
		if (editing || !reopen.current) return
		const key = reopen.current
		reopen.current = null
		const card = list.current?.closest('.sp-card')
		const row = list.current?.querySelector(`[data-line="${CSS.escape(key)}"]`)
		const target = row?.matches('button') ? row : row?.querySelector('button[aria-label="Edit this line"]')
		;(target ?? card?.querySelector('[data-add]'))?.focus()
	}, [editing])
	const cancelLine = () => {
		if (editing?.values.newPhoto && editing.values.newPhoto !== lines.find(l => l.key === editing.key)?.newPhoto)
			URL.revokeObjectURL(editing.values.newPhoto.url)
		setEditing(null)
	}
	const removeLine = line => {
		const at = lines.findIndex(l => l.key === line.key)
		setLines(ls => ls.filter(l => l.key !== line.key))
		if (editing?.key === line.key) setEditing(null)
		toast({
			message: `${line.title} removed.`,
			undo: { label: 'Undo', onClick: () => setLines(ls => [...ls.slice(0, at), line, ...ls.slice(at)]) }
		})
	}
	const moveTo = (key, to) => setLines(ls => {
		const at = ls.findIndex(l => l.key === key)
		if (at < 0 || to < 0 || to >= ls.length || to === at) return ls
		const next = [...ls]
		next.splice(to, 0, next.splice(at, 1)[0])
		return next
	})
	const move = (key, by) => moveTo(key, lines.findIndex(l => l.key === key) + by)

	/* A row is carried by its handle and passes a neighbour once the pointer crosses that
	   neighbour's middle. The window listens, since moving a row re-inserts its element. */
	const grab = ev => {
		const handle = ev.target.closest?.('.sp-list-item__handle')
		const row = handle?.closest('[data-line]')
		if (!row || ev.button !== 0) return
		ev.preventDefault()
		dragged.current = true
		setCarried(row.dataset.line)
	}
	// a click on a row opens it, as its pencil does (c15); the click that ends a drag does not
	const rowClick = ev => {
		const afterDrag = dragged.current
		dragged.current = false
		const row = ev.target.closest?.('[data-line]')
		if (afterDrag || !row || ev.target.closest('button, input, label, a')) return
		const line = lines.find(l => l.key === row.dataset.line)
		if (line) openLine(line)
	}
	useEffect(() => {
		if (!carried) return
		const drag = ev => {
			const rows = [...(list.current?.querySelectorAll('[data-line]') ?? [])]
			const at = rows.findIndex(r => r.dataset.line === carried)
			const over = rows.findIndex(r => {
				const box = r.getBoundingClientRect()
				return ev.clientY >= box.top && ev.clientY <= box.bottom
			})
			if (at < 0 || over < 0 || over === at) return
			const box = rows[over].getBoundingClientRect()
			const middle = box.top + box.height / 2
			if ((over > at && ev.clientY > middle) || (over < at && ev.clientY < middle)) moveTo(carried, over)
		}
		const drop = () => {
			setCarried(null)
			// the click that ends the drag reads the flag first; a drop that makes no click clears it
			setTimeout(() => { dragged.current = false })
		}
		window.addEventListener('pointermove', drag)
		window.addEventListener('pointerup', drop)
		window.addEventListener('pointercancel', drop)
		return () => {
			window.removeEventListener('pointermove', drag)
			window.removeEventListener('pointerup', drop)
			window.removeEventListener('pointercancel', drop)
		}
	}, [carried])
	const keyMove = ev => {
		const row = ev.target.closest?.('.sp-list-item__handle') && ev.target.closest('[data-line]')
		if (!row || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return
		ev.preventDefault()
		move(row.dataset.line, ev.key === 'ArrowUp' ? -1 : 1)
	}

	/* ---- attachments, staged until the save ---- */

	const addFiles = picked => setFiles(fs => [...fs, ...picked.map(file => ({
		key: freshKey(), file, name: file.name,
		kind: /pdf/i.test(file.type) || /\.pdf$/i.test(file.name) ? 'pdf' : 'image',
		thumb: /^image\//.test(file.type) ? URL.createObjectURL(file) : null
	}))])
	const dropFile = file => setFiles(fs => {
		if (file.thumb) URL.revokeObjectURL(file.thumb)
		return fs.filter(f => f.key !== file.key)
	})
	useEffect(() => () => {
		for (const f of staged.current) if (f.thumb) URL.revokeObjectURL(f.thumb)
	}, [])

	/* ---- the vendor ---- */

	const pickVendor = name => {
		const found = vendorByAnyName(vendors.data ?? [], name)
		const vendor = found?.name ?? name.trim()
		set({ vendor, categories: categoriesForVendor(vendors.data ?? [], vendor, draft.categories) })
	}
	const setStatus = status => set({
		status,
		...(status !== 'Ordered' && !draft.deliveredDate ? { deliveredDate: today() } : {}),
		...(status === 'Returned' && !draft.returnedDate ? { returnedDate: today() } : {})
	})

	/* ---- save ---- */

	// Discard throws a new order away on purpose; Cancel on a saved one asks first, as the other forms do
	const leave = () => {
		if (creating) guard.release()
		if (onLeave) onLeave()
		else navigate(creating ? '/orders/new' : `/orders/${orderId}`)
	}

	const save = async () => {
		setTried(true)
		let current = lines
		const untouched = editing?.isNew && !editing.values.title.trim() && editing.values.price == null && !editing.values.newPhoto
		reopen.current = null
		if (untouched) setEditing(null)
		else if (editing) {
			if (Object.keys(lineErrors(editing.values)).length) {
				setEditing(e => ({ ...e, tried: true }))
				return focusFirst('.sp-line-editor')
			}
			current = editing.isNew
				? [...lines, { ...editing.values, key: editing.key, include: true }]
				: lines.map(l => (l.key === editing.key ? { ...editing.values, uncertain: false } : l))
			setLines(current)
			setEditing(null)
		}
		if (Object.keys(errors).length) {
			setFolded(false)
			return focusFirst('[data-details]')
		}
		const kept = current.filter(l => l.include !== false)
		const broken = kept.find(l => Object.keys(lineErrors(l)).length)
		if (broken) {
			setEditing({ key: broken.key, isNew: false, values: { ...broken }, tried: true })
			return focusFirst('.sp-line-editor')
		}
		if (!kept.length) return focusFirst('[data-add]')

		setSaving(true)
		try {
			const body = apiDraft(draft, kept)
			const order = creating ? await createOrder(body) : await updateOrder(orderId, body)
			const problems = []
			const quietly = (work, what) => work.catch(() => problems.push(what))
			if (scan) await quietly(attachScanDocument(scan.documentKey, order.id), 'the receipt')
			// the server keeps one file per name, so a removed one goes before its namesake arrives
			await Promise.all(gone.map(id => quietly(removeAttachment(order.id, id), 'an attachment')))
			await Promise.all(kept.map(async (line, i) => {
				const saved = order.items[i], old = line.photo
				if (!saved || !old && !line.newPhoto) return
				const named = old && line.newPhoto && old.name.toLowerCase() === line.newPhoto.file.name.toLowerCase()
				if (old && (line.dropPhoto || named)) await quietly(removeItemAttachment(order.id, saved.id, old.id), 'a photo')
				if (line.newPhoto) await quietly(addItemAttachments(order.id, saved.id, [line.newPhoto.file]), 'a photo')
				if (old && line.newPhoto && !named) await quietly(removeItemAttachment(order.id, saved.id, old.id), 'a photo')
			}))
			let clash = null
			if (files.length) {
				const sent = await addAttachments(order.id, files.map(f => f.file)).catch(() => problems.push('an attachment'))
				clash = sent?.skipped?.[0] ?? null
			}
			if (scan) learnAlias(scan.vendor, order)
			invalidateOrderData()
			guard.release()
			toast(problems.length || clash
				? {
					message: problems.length
						? `The order was saved, but ${problems[0]} was not added. Try again from the order.`
						: `The order was saved. ${clash} was not added: the order already has a file with that name.`,
					color: 'danger'
				}
				: { message: creating ? (scan ? `Order created from ${scan.file.name}. The receipt is kept as an attachment.` : 'Order created.') : 'Changes saved.' })
			navigate(`/orders/${order.id}`, { replace: creating })
		} catch (e) {
			setSaving(false)
			toast({ message: failureMessage(e, 'The order was not saved. Try again.'), color: 'danger' })
		}
	}

	/* A receipt's vendor line that was filed under another name becomes that vendor's alias,
	   so the next receipt with it matches on its own. */
	const learnAlias = (read, order) => {
		const scanned = String(read ?? '').trim()
		if (scanned && order.vendor?.id && scanned.toLowerCase() !== order.vendor.name.toLowerCase())
			addVendorAlias(order.vendor.id, scanned).then(invalidateVendorData).catch(() => {})
	}

	const discard = () => (scan && lines.length ? setAsking(true) : leave())

	/* ---- the parts ---- */

	const editor = editing
		? (
			<LineForm
				key={editing.key}
				editing={editing}
				sheet={touch}
				photoUrl={photoUrl}
				onChange={values => setEditing(e => ({ ...e, values }))}
				onCommit={() => commit(false)}
				onCommitNext={() => commit(true)}
				onCancel={cancelLine}
			/>
		)
		: null

	const lineRow = line => {
		const photo = line.newPhoto?.url ?? (line.dropPhoto ? null : photoUrl(line))
		const mark = <LinePhoto src={photo} name={line.title} />
		const warn = line.uncertain || (tried && Object.keys(lineErrors(line)).length)
		const text = (
			<>
				<span className="sp-stacked">
					<span className="sp-title sp-truncate">{line.title || 'Unnamed line'}</span>
					<span className={warn ? 'sp-subtitle sp-truncate sp-ink-warning' : 'sp-subtitle sp-truncate'}>
						{warn ? 'Check this line against the receipt' : lineMetaWith(line, photo, scan || touch)}
					</span>
				</span>
				<span className="sp-grow" />
				{line.price == null ? <span className="sp-subtitle sp-nowrap">No price</span> : <LineAmount line={line} compact />}
			</>
		)
		if (touch && !reordering)
			return (
				<ListItem key={line.key} data-line={line.key} color={warn ? 'warning' : 'default'} mark={mark}
					onClick={() => openLine(line)}>
					{text}
				</ListItem>
			)
		const at = lines.indexOf(line)
		return (
			<ListItem
				key={line.key}
				data-line={line.key}
				variant={carried === line.key ? 'carried' : 'default'}
				color={warn ? 'warning' : 'default'}
				handle={scan && !touch ? undefined : <Icon name="grip-vertical" size={14} />}
				mark={scan ? <><Include line={line} setLines={setLines} />{mark}</> : mark}
				actions={reordering
					? <>
						<IconButton variant="outline" icon="chevron-up" aria-label={`Move ${line.title} up`} disabled={at === 0} onClick={() => move(line.key, -1)} />
						<IconButton variant="outline" icon="chevron-down" aria-label={`Move ${line.title} down`} disabled={at === lines.length - 1} onClick={() => move(line.key, 1)} />
					</>
					: <>
						<IconButton variant="outline" icon="pencil" aria-label="Edit this line" onClick={() => openLine(line)} />
						{scan ? null : <IconButton variant="outline" danger icon="trash" aria-label="Remove this line" onClick={() => removeLine(line)} />}
					</>}
			>
				{text}
			</ListItem>
		)
	}

	const brokenCount = tried ? lines.filter(l => l.include !== false && Object.keys(lineErrors(l)).length).length : 0
	const itemsHead = (
		<div className="sp-row-flex sp-wrap sp-gap-8">
			<span className="sp-section-label">{scan ? 'Lines found' : 'Items'}{SEP}{lines.length}</span>
			<span className="sp-grow" />
			{brokenCount
				? <span className="sp-subtitle sp-ink-danger">{brokenCount === 1 ? '1 line needs attention' : `${brokenCount} lines need attention`}</span>
				: touch
					? (lines.length > 1 ? <Button variant="outline" size="small" onClick={() => setReordering(r => !r)}>{reordering ? 'Done' : 'Reorder'}</Button> : null)
					: scan
						? (lines.length ? <span className="sp-meta">Untick a line to leave it out</span> : null)
						: (lines.length > 1 ? <span className="sp-meta">Drag the handle, or select a line and use ↑ ↓</span> : null)}
		</div>
	)

	const printed = scan?.total ?? null
	const mismatch = printed != null && Math.abs(printed - sums.total) >= 0.005
	const itemsCard = (
		<Card>
			{itemsHead}
			<div className="sp-stack sp-gap-8" ref={list} onPointerDown={touch ? undefined : grab} onClick={touch ? undefined : rowClick}
				onKeyDown={keyMove}>
				{lines.map(line => (editing && !touch && editing.key === line.key ? editor : lineRow(line)))}
				{!lines.length && !(editing?.isNew) && tried
					? (
						<Empty dashed>
							<span className="sp-heading sp-ink-accent">Add the first item</span>
							<span className="sp-meta">An order needs at least one line before it can be saved.</span>
						</Empty>
					)
					: null}
				{editing?.isNew && !touch
					? editor
					: scan && !touch
						? null
						: (
							<ListItem variant="add" onClick={openNew} data-add=""
								mark={<>
									{touch ? null : <span className="sp-list-item__handle" aria-hidden="true" />}
									<Mark size="medium" fill="add" aria-label="Add" aria-hidden="true"><Icon name="plus" /></Mark>
								</>}>
								<span className="sp-title">{scan ? 'Add a line the scan missed' : 'Add item'}</span>
							</ListItem>
						)}
			</div>
			{scan && !touch
				? (
					<div className="sp-row-flex sp-gap-12">
						{editing?.isNew ? null : <Button variant="outline" size="small" iconStart="plus" data-add="" onClick={openNew}>Add a line the scan missed</Button>}
						<span className="sp-grow" />
						<span className="sp-subtitle">Lines {money(sums.paid)}{SEP}shipping {money(draft.shipping || 0)}</span>
					</div>
				)
				: null}
			{mismatch
				? (
					<ListItem color="warning" mark={<span className="sp-list-item__count">!</span>}>
						<span className="sp-data sp-ink-warning">
							The order comes to <strong className="sp-strong">{money(sums.total)}</strong> but the receipt says <strong className="sp-strong">{money(printed)}</strong> - a line may be missing.
						</span>
					</ListItem>
				)
				: null}
		</Card>
	)

	const shownFiles = savedFiles.filter(f => !gone.includes(f.id))
	const attachmentsCard = scan
		? null
		: (
			<Card>
				<span className="sp-section-label">Attachments{SEP}{shownFiles.length + files.length}</span>
				<Strip>
					{shownFiles.map(f => (
						<AttachmentTile key={f.id} name={f.name} kind={f.kind} thumb={f.thumb} bare={touch}
							onRemove={() => setGone(g => [...g, f.id])} />
					))}
					{files.map(f => (
						<AttachmentTile key={f.key} name={f.name} kind={f.kind} thumb={f.thumb} bare={touch} onRemove={() => dropFile(f)} />
					))}
					<AttachmentAdd onFiles={addFiles} />
				</Strip>
			</Card>
		)

	const fixCount = Object.keys(shown).length
	const fields = (
		<>
			<Field label="Vendor" {...problem(shown.vendor)}>
				<VendorPicker vendors={vendors.data ?? []} value={draft.vendor} onPick={pickVendor} />
			</Field>
			<div className="sp-fields">
				<Field label="Date" {...problem(shown.date)}>
					<DateField value={draft.date} max={today()} danger={!!shown.date} locale={activeLocaleCode()}
						onChange={date => set({ date })} />
				</Field>
				<Field label="Kind" {...problem(shown.kind)}>
					<KindPicker value={draft.kind} onPick={kind => set({ kind })} />
				</Field>
			</div>
			<Field label="Status">
				<Segmented name={statusName} variant="facet" options={STATUSES} value={draft.status} onChange={setStatus} />
			</Field>
			<Field label="Categories">
				<TokensField value={draft.categories} onChange={categories => set({ categories })} placeholder="Add category…" aria-label="Add a category" />
			</Field>
			<div className="sp-fields">
				<Field label="Discount" unit={currencySymbol()}>
					<NumberField value={draft.discount} min={0} locale={MONEY} placeholder="0,00" onChange={discount => set({ discount })} />
				</Field>
				<Field label="Shipping fee" unit={currencySymbol()}>
					<NumberField value={draft.shipping} min={0} locale={MONEY} placeholder="0,00" onChange={shipping => set({ shipping })} />
				</Field>
			</div>
			<div className="sp-fields">
				<Field label="Reference">
					<TextField value={draft.reference} onChange={reference => set({ reference })} />
				</Field>
				<Field label="Note">
					<TextField value={draft.note} onChange={note => set({ note })} />
				</Field>
			</div>
		</>
	)

	const detailsCard = touch
		? (
			<Card variant="flush" data-details="">
				<Toolbar variant="toggle" expanded={!folded} onClick={() => setFolded(f => !f)}>
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">Order details</span>
						<span className="sp-meta">{detailsLine(draft)}</span>
					</span>
					<span className="sp-card__chevron"><Icon name="chevron-down" /></span>
				</Toolbar>
				<CardBody>
					<div className="sp-stack sp-gap-12">{fields}</div>
				</CardBody>
			</Card>
		)
		: (
			<Card data-details="">
				<div className="sp-row-flex sp-gap-8">
					<span className="sp-section-label">Order details</span>
					<span className="sp-grow" />
					{fixCount
						? <Pill color="danger">{fixCount === 1 ? '1 to fix' : `${fixCount} to fix`}</Pill>
						: creating ? <span className="sp-meta">Every value can be changed</span> : null}
				</div>
				{fields}
			</Card>
		)

	const leaveWord = creating ? 'Discard' : 'Cancel'
	const commitWord = saving ? 'Saving...' : creating ? 'Create' : 'Save'
	const totalsCard = (
		<Card
			footer={[
				<Button key="leave" variant="outline" onClick={discard}>{leaveWord}</Button>,
				<Button key="save" disabled={saving} onClick={save}>{commitWord}</Button>
			]}
			footerLayout="split"
			footerCommits
		>
			{scan ? <span className="sp-section-label">Totals</span> : null}
			<div className="sp-stack">
				{scan
					? <>
						<Sum value={money(sums.total)}>Order total</Sum>
						{printed != null ? <Sum value={money(printed)}>On the receipt</Sum> : null}
					</>
					: <Sum variant="total" value={money(sums.total)}>Total</Sum>}
			</div>
			{scan
				? (printed != null && !mismatch ? <Pill color="success">Totals match</Pill> : null)
				: <>
					<span className="sp-meta">{itemsWord(included.length)}{SEP}discount {amount(draft.discount || 0)}{SEP}shipping {amount(draft.shipping || 0)}</span>
					{saves(sums.saved) ? <span className="sp-stat__delta">Saved {money(sums.saved)}</span> : <Saving value={0} />}
				</>}
		</Card>
	)

	const saveBar = (
		<ListItem variant="sticky">
			<span className="sp-subtitle sp-grow">{dirty ? 'Unsaved changes' : creating ? 'Nothing saved yet' : null}</span>
			<Button variant="outline" onClick={discard}>{leaveWord}</Button>
			<Button disabled={saving} onClick={save}>{commitWord}</Button>
		</ListItem>
	)

	const notice = notices({ origin, scan, lines, leave, touch })

	const sheet = touch && editing
		? createPortal(
			<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) cancelLine() }}>
				<Sheet role="dialog" aria-modal="true" aria-label={editing.isNew ? 'Add a line' : 'Edit line'}>
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-heading">{editing.isNew ? 'Add a line' : 'Edit line'}</span>
						<span className="sp-grow" />
						{editing.isNew ? null : <IconButton variant="outline" danger icon="trash" aria-label="Remove this line"
							onClick={() => removeLine(lines.find(l => l.key === editing.key))} />}
					</div>
					{editor}
				</Sheet>
			</Scrim>,
			document.body
		)
		: null

	const dialog = asking
		? (
			<Dialog onCancel={() => setAsking(false)} aria-label="Discard this scan?">
				<div className="sp-stack sp-gap-12">
					<DialogTitle>Discard this scan?</DialogTitle>
					<DialogBody>The receipt was read and {itemsWord(lines.length).replace('item', 'line')} {lines.length === 1 ? 'is' : 'are'} waiting to be checked. Nothing is saved if you discard.</DialogBody>
				</div>
				<DialogActions>
					<Button variant="outline" fullWidth onClick={() => setAsking(false)}>Keep checking</Button>
					<Button color="danger" fullWidth onClick={leave}>Discard</Button>
				</DialogActions>
			</Dialog>
		)
		: null

	if (touch) return (
		<div className="sp-stack sp-gap-12">
			{notice}{itemsCard}{attachmentsCard}{detailsCard}{saveBar}{sheet}{dialog}{guard.prompt}
		</div>
	)
	const main = <div className="sp-stack sp-gap-12">{itemsCard}{attachmentsCard}</div>
	const rail = <Panel>{detailsCard}{totalsCard}{dialog}{guard.prompt}</Panel>
	if (!region) return <>{main}{rail}</>
	return <>{notice}<div className="sp-shell__body--split">{main}{rail}</div></>
}

const INVALID = '[aria-invalid="true"] input, input[aria-invalid="true"], [aria-invalid="true"] button, button[aria-invalid="true"]'

const focusFirst = selector => requestAnimationFrame(() => {
	const box = document.querySelector(selector)
	const target = box?.querySelector(INVALID) ?? box?.querySelector('input, button') ?? box
	target?.focus?.()
	box?.scrollIntoView?.({ block: 'nearest' })
})

const lineMetaWith = (line, photo, plain) => (plain || photo ? lineMeta(line, plain) : `${lineMeta(line)}${SEP}no photo`)

const detailsLine = d => [d.categories.join(', '), d.kind, d.reference].filter(Boolean).join(SEP)

function Include({ line, setLines }) {
	return (
		<Check checked={line.include !== false} aria-label={`Include ${line.title}`}
			onChange={ev => setLines(ls => ls.map(l => (l.key === line.key ? { ...l, include: ev.target.checked } : l)))} />
	)
}

/** Where a copy came from, or what a scan could not read. On a phone the save bar is the way
    out and a button takes the row's whole width, so there the notice only states. */
function notices({ origin, scan, lines, leave, touch }) {
	if (origin.copy)
		return (
			<Alert color="success" mark={<Icon name="copy" size={13} />}
				action={touch ? null : <Button variant="outline" size="small" onClick={leave}>Discard</Button>}>
				Copied from <b>{origin.copy.vendor}, {dayShortMonth(origin.copy.date)}</b> - the receipt stays on that order.
			</Alert>
		)
	if (!scan) return null
	if (!scan.linesRead)
		return (
			<Alert mark="!" title="Nothing was read from this receipt.">
				Add the lines and the details yourself. The receipt is kept with the order when you create it.
			</Alert>
		)
	const looks = [
		...(scan.vendorMatched ? [] : ['the vendor is new and will be created']),
		...(scan.total == null ? ['no printed total was found'] : []),
		...(scan.checks?.some(c => c.id === 'vat' && c.warning) ? ['it was not clear if the prices include VAT'] : [])
	]
	const unclear = lines.filter(l => l.uncertain).length
	const count = looks.length + unclear
	if (!count) return null
	const said = [unclear ? `${unclear === 1 ? '1 line was' : `${unclear} lines were`} hard to read` : null, ...looks].filter(Boolean)
	return (
		<Alert mark="!" title={count === 1 ? '1 value needs a look.' : `${count} values need a look.`}
			action={unclear && !touch ? <Button variant="outline" size="small" onClick={() => focusFirst('.sp-list-item[data-color="warning"]')}>Jump to first</Button> : null}>
			{said.join(', ').replace(/^./, c => c.toUpperCase())}.
		</Alert>
	)
}

/** The line being edited or added (1b), in place on a desktop and in a sheet on a phone. */
function LineForm({ editing, sheet, photoUrl, onChange, onCommit, onCommitNext, onCancel }) {
	const v = editing.values
	const errors = editing.tried ? lineErrors(v) : {}
	const set = patch => onChange({ ...v, ...patch })
	const photo = v.newPhoto?.url ?? (v.dropPhoto ? null : photoUrl(v))
	const take = file => {
		if (v.newPhoto) URL.revokeObjectURL(v.newPhoto.url)
		set({ newPhoto: { file, url: URL.createObjectURL(file) }, dropPhoto: false })
	}
	// a pasted picture is the line's photo; pasted words stay with the field they went into
	const paste = ev => {
		const image = [...(ev.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
		if (image) { ev.preventDefault(); take(image) }
	}
	return (
		<LineEditor
			onPaste={paste}
			sheet={sheet}
			hint="Enter saves · Escape cancels · ⌘↵ saves and opens the next line"
			commit={editing.isNew ? 'Add line' : 'Save line'}
			photo={
				<Slot
					size="medium"
					name="the line's photo"
					src={photo}
					onFile={take}
					onRemove={() => set({ newPhoto: null, dropPhoto: Boolean(v.photo) })}
				/>
			}
			onCommit={onCommit}
			onCommitNext={onCommitNext}
			onCancel={onCancel}
		>
			<Field label="Item" {...problem(errors.title)}>
				<TextField value={v.title} placeholder="Item name" autoFocus onChange={title => set({ title })} />
			</Field>
			<div className="sp-line-editor__grid">
				<Field label="Quantity" {...problem(errors.quantity)}>
					<Stepper value={Number(v.quantity) || 0} min={1} step={1} aria-label="Quantity" onChange={quantity => set({ quantity })} />
				</Field>
				<Field label="Unit price" unit={currencySymbol()} {...problem(errors.price)}>
					<NumberField value={v.price} min={0} locale={MONEY} placeholder="0,00" onChange={price => set({ price })} />
				</Field>
				<Field label="Retail price" unit={currencySymbol()}>
					<NumberField value={v.retail} min={0} locale={MONEY} placeholder="0,00" onChange={retail => set({ retail })} />
				</Field>
				<Computed label="Line total">{v.price == null ? '-' : money(lineTotal(v))}</Computed>
			</div>
		</LineEditor>
	)
}

/** Vendors as you type their name or an alias; a name that is none of them becomes a new one. */
function VendorPicker({ vendors, value, onPick, ...rest }) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const typed = query.trim()
	const shown = vendors.filter(v => vendorTextMatch(v, typed).matches).slice(0, 8)
	const known = typed && vendorByAnyName(vendors, typed)
	const pick = name => { onPick(name); setOpen(false); setQuery('') }
	return (
		<Combobox searchable value={value} placeholder="Choose a vendor" open={open}
			onOpenChange={next => { setOpen(next); if (!next) setQuery('') }} onSearch={setQuery} aria-label="Vendor" {...rest}>
			{shown.map(v => (
				<ComboboxOption key={v.id} selected={v.name === value} onSelect={() => pick(v.name)}
					meta={vendorTextMatch(v, typed).alias ?? undefined}>{v.name}</ComboboxOption>
			))}
			{typed && !known ? <ComboboxOption onSelect={() => pick(typed)}>Add "{typed}" as a new vendor</ComboboxOption> : null}
		</Combobox>
	)
}

function KindPicker({ value, onPick, ...rest }) {
	const [open, setOpen] = useState(false)
	return (
		<Combobox value={value} open={open} onOpenChange={setOpen} aria-label="Kind" {...rest}>
			{spendKinds.map(kind => (
				<ComboboxOption key={kind} selected={kind === value} onSelect={() => { onPick(kind); setOpen(false) }}>{kind}</ComboboxOption>
			))}
		</Combobox>
	)
}
