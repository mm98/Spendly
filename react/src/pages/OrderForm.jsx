import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { Card, CardBody, Panel, Toolbar } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Announce, ListItem } from '../components/ListItem.jsx'
import { Computed, LineEditor } from '../components/LineEditor.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField, TokensField } from '../components/Inputs.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { Combobox, ComboboxGroup, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { DateField } from '../components/DatePickers.jsx'
import { Check } from '../components/Choice.jsx'
import { Sum } from '../components/Data.jsx'
import { Pill } from '../components/Pill.jsx'
import { MAX_FILE_MB, PHOTO_TYPES, Slot, fileProblem } from '../components/FileDrop.jsx'
import { AttachmentAdd, Strip, Viewer } from '../components/Attachments.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Empty, Spinner, useFocusTrap } from '../components/Utilities.jsx'
import { Scrim } from '../components/Shell.jsx'
import { SaveBar, Sheet } from '../components/Touch.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { useApi } from '../api/useApi.js'
import {
	addItemAttachments, addVendorAlias, attachScanDocument, attachmentFileUrl, createOrder,
	failureMessage, getOrderLimits, getOrders, getScanPages, getVendors, invalidateOrderData, invalidateVendorData, removeAttachment,
	removeItemAttachment, scanFileUrl, scanPageUrl, scanThumbnailUrl, sendFile, spendKinds, updateOrder, vendorByAnyName, vendorTextMatch
} from '../api/client.js'
import {
	NUMBER_LOCALE, activeLocaleCode, amount, currency, currencySymbol, dayShortMonth, dot, monthNames, plural, today
} from '../api/format.js'
import { useListReturn } from '../app/listMemory.js'
import { MAC, useShellShape } from '../app/useMedia.js'
import { Saving } from '../app/saving.jsx'
import { useStatuses } from '../app/statuses.js'
import {
	AttachmentTile, LineAmount, LinePhoto, isPdf, itemsWord, lineMeta, lineTotal, money, pagesOf, totalsOf
} from './OrderParts.jsx'
import { useLeaveGuard } from './vendorsCategories.jsx'

/* The order as a form (1d): editing and every way to create one are this screen in another
   state (3a, 3b). Nothing reaches the server until Save or Create writes the order, then its files. */

const DOT = { success: 'done', progress: 'progress', danger: 'returned', neutral: 'draft' }

const orderErrors = d => {
	const e = {}
	if (!d.vendor.trim()) e.vendor = 'A vendor is required. Pick one or create it here.'
	else if (d.vendor.trim().length > 80) e.vendor = '80 characters at most.'
	if (!d.date) e.date = 'When was the order placed?'
	if (!spendKinds.includes(d.kind)) e.kind = 'Pick a kind.'
	return e
}

/** A message that blocks the save, or nothing: a danger type alone marks the field invalid. */
const problem = message => (message ? { message, messageType: 'danger' } : {})

/** A date after today is kept, since an order can be booked ahead; amber says so (6c). */
const ahead = date => (date > today() ? { message: 'That is in the future. Keep it if the order is pre-booked.', messageType: 'warning' } : {})

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

/* A new order left to set up its vendor first (Vendors 5b), kept in memory with its files and
   photos until the form at the same address opens again. Taken once: any other visit drops it. */
let away = null
const takeAway = address => {
	const kept = away
	away = null
	return kept?.address === address ? kept : null
}

/** `origin` is `{ copy: { id, vendor, date } }` or `{ scan: answer }`; `region` draws the split
    itself, for a route whose body is not already the split. */
export function OrderForm({ mode, orderId, seed, origin = {}, files: savedFiles = [], photoUrl = () => null, region = false, onLeave }) {
	const navigate = useNavigate()
	const toast = useToast()
	const listAddress = useListReturn('orders')
	const touch = useShellShape() === 'touch'
	const vendors = useApi(getVendors)
	const latest = useApi(getOrders, [{ pageSize: 20 }])
	const creating = mode === 'new'
	const scan = origin.scan ?? null
	const here = useLocation()
	const address = here.pathname + here.search
	const [back] = useState(() => (creating ? takeAway(address) : null))

	const [draft, setDraft] = useState(() => back?.draft ?? { ...seed, lines: undefined })
	// the categories a vendor filled in, so another vendor takes back only those (5l); and the
	// defaults offered as an add when the field already had some
	const [suggested, setSuggested] = useState(back?.suggested ?? null)
	const [offer, setOffer] = useState(null)
	// the order was deleted elsewhere, in the sentence that says so: nothing here can be saved any more
	const [lost, setLost] = useState(null)
	const [lines, setLines] = useState(back?.lines ?? seed.lines)
	const [editing, setEditing] = useState(() => (back ? back.editing : creating && !seed.lines.length && !scan ? newEditing() : null))
	const [tried, setTried] = useState(false)
	const [saving, setSaving] = useState(false)
	const [files, setFiles] = useState(back?.files ?? [])
	const [gone, setGone] = useState([])
	const [folded, setFolded] = useState(true)
	const [reordering, setReordering] = useState(false)
	const [carried, setCarried] = useState(null)
	const [asking, setAsking] = useState(false)
	const [viewing, setViewing] = useState(null)
	// the row a keyboard picked up, and where it started, so Escape can put it back (c1)
	const [held, setHeld] = useState(null)
	const [said, setSaid] = useState('')
	const list = useRef(null)
	const column = useRef(null)
	const stacked = useStacked(column)
	const quietVendor = useRef(false)
	const sheetBox = useRef(null)
	useFocusTrap(sheetBox, Boolean(touch && editing), '.sp-line-editor__form input')
	// the line or add control whose editor is open, which takes focus back when it closes
	const reopen = useRef(editing?.isNew ? 'add' : null)
	const dragged = useRef(false)
	const [start, setStart] = useState(seed)
	const staged = useRef(files)
	staged.current = files
	const editingNow = useRef(editing)
	editingNow.current = editing
	const statusName = useId()
	const statuses = useStatuses()

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
	// a line's photo is sent when it is chosen (17a); one still on its way is a file the leave question counts (17b)
	const [photosSending, setPhotosSending] = useState(() => new Set())
	const sendPhoto = file => {
		const sent = sendFile(file).catch(() => null)
		setPhotosSending(p => new Set(p).add(sent))
		sent.then(() => setPhotosSending(p => { const next = new Set(p); next.delete(sent); return next }))
		return sent
	}
	const photosOnTheirWay = [...lines.map(l => l.newPhoto), editing?.values.newPhoto].filter(p => p && photosSending.has(p.sent)).length
	// a new order's steps differ only in the query, so a step away asks as a page away does
	const guard = useLeaveGuard(dirty, { search: creating, uploading: files.filter(f => f.sending).length + photosOnTheirWay })

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
		: ls.map(l => (l.key === current.key ? { ...current.values, uncertain: false, checked: true } : l)))
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
	// focus goes back to a line once its editor closes, or to the one that took a removed line's place
	useEffect(() => {
		if (editing || !reopen.current) return
		const key = reopen.current
		reopen.current = null
		const card = list.current?.closest('.sp-card')
		const row = list.current?.querySelector(`[data-line="${CSS.escape(key)}"]`)
		const target = row?.matches('button') ? row : row?.querySelector('[data-edit]')
		;(target ?? card?.querySelector('[data-add]'))?.focus()
	}, [editing, lines])
	const cancelLine = () => {
		if (editing?.values.newPhoto && editing.values.newPhoto !== lines.find(l => l.key === editing.key)?.newPhoto)
			URL.revokeObjectURL(editing.values.newPhoto.url)
		setEditing(null)
	}
	const removeLine = line => {
		const at = lines.findIndex(l => l.key === line.key)
		if (!editing || editing.key === line.key) reopen.current = (lines[at + 1] ?? lines[at - 1])?.key ?? 'add'
		setLines(ls => ls.filter(l => l.key !== line.key))
		if (editing?.key === line.key) setEditing(null)
		toast({
			message: `${line.title || 'The line'} removed.`,
			undo: {
				label: 'Undo',
				onClick: () => {
					if (!editingNow.current) reopen.current = line.key
					setLines(ls => [...ls.slice(0, at), line, ...ls.slice(at)])
				}
			}
		})
	}
	// a copy goes below its line, as a new line: its photo stays with the one it was taken of
	const duplicateLine = (line, values = line) => {
		const key = freshKey()
		const { id, photo, newPhoto, dropPhoto, photoProblem, ...kept } = values
		setLines(ls => {
			const at = ls.findIndex(l => l.key === line.key)
			const copy = { ...kept, key, photo: null, newPhoto: null, dropPhoto: false, uncertain: false, checked: true, include: true }
			return [...ls.slice(0, at + 1), copy, ...ls.slice(at + 1)]
		})
		reopen.current = key
		setSaid(`${values.title || 'The line'} copied below itself`)
	}
	const moveTo = (key, to) => setLines(ls => {
		const at = ls.findIndex(l => l.key === key)
		if (at < 0 || to < 0 || to >= ls.length || to === at) return ls
		const next = [...ls]
		next.splice(to, 0, next.splice(at, 1)[0])
		return next
	})
	const move = (key, by) => moveTo(key, lines.findIndex(l => l.key === key) + by)
	const tell = (key, at, word) => {
		const line = lines.find(l => l.key === key)
		if (line) setSaid(`${line.title}${word ? `, ${word}` : ''}, position ${at + 1} of ${lines.length}`)
	}

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
	// Space or Enter picks a row up and drops it, the arrows move it, Escape puts it back (c1)
	const keyMove = ev => {
		const row = ev.target.closest?.('.sp-list-item__handle') && ev.target.closest('[data-line]')
		if (!row) return
		const key = row.dataset.line
		const at = lines.findIndex(l => l.key === key)
		if (ev.key === ' ' || ev.key === 'Enter') {
			ev.preventDefault()
			const holding = held?.key === key
			setHeld(holding ? null : { key, from: at })
			tell(key, at, holding ? 'dropped' : 'picked up')
		} else if (ev.key === 'Escape' && held?.key === key) {
			ev.preventDefault()
			ev.stopPropagation()
			moveTo(key, held.from)
			setHeld(null)
			tell(key, held.from, 'put back')
		} else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
			ev.preventDefault()
			const to = at + (ev.key === 'ArrowUp' ? -1 : 1)
			if (to < 0 || to >= lines.length) return
			move(key, ev.key === 'ArrowUp' ? -1 : 1)
			tell(key, to)
		}
	}

	/* ---- attachments, staged until the save ---- */

	// a file is sent when added and filed by the save (17a); a refused or failed one says so on its tile (17b)
	const sends = useRef(back?.sends ?? new Map())
	const patchFile = (key, patch) => setFiles(fs => fs.map(f => (f.key === key ? { ...f, ...patch } : f)))
	const send = record => {
		const sent = sendFile(record.file, { onSent: part => patchFile(record.key, { sent: part }) })
			.then(upload => { patchFile(record.key, { upload, sending: false }); return upload })
			.catch(e => { patchFile(record.key, { sending: false, failed: failureMessage(e, '') || 'Upload failed' }); return null })
		sends.current.set(record.key, sent)
	}
	const addFiles = (picked, problems) => {
		const records = picked.map((file, i) => ({
			key: freshKey(), file, name: file.name, problem: problems[i], sending: !problems[i], sent: 0,
			kind: isPdf(file) ? 'pdf' : 'image',
			thumb: /^image\//.test(file.type) ? URL.createObjectURL(file) : null
		}))
		setFiles(fs => [...fs, ...records])
		for (const r of records) if (!r.problem) send(r)
	}
	const resend = record => {
		patchFile(record.key, { sending: true, sent: 0, failed: null })
		send(record)
	}
	const dropFile = file => setFiles(fs => {
		if (file.thumb) URL.revokeObjectURL(file.thumb)
		sends.current.delete(file.key)
		return fs.filter(f => f.key !== file.key)
	})
	// the same bytes already on the order or added just before, or one with the same name and size:
	// warned on its tile, never refused, since two photos of one thing are fine (17b)
	const twinOf = f => {
		const hash = f.upload?.sha256
		if (hash && savedFiles.some(s => !gone.includes(s.id) && s.sha256 === hash)) return true
		const earlier = files.slice(0, files.indexOf(f))
		return earlier.some(o => !o.problem && ((hash && o.upload?.sha256 === hash) || (o.file.name === f.file.name && o.file.size === f.file.size)))
	}
	const keptAway = useRef(false)
	useEffect(() => () => {
		if (keptAway.current) return
		for (const f of staged.current) if (f.thumb) URL.revokeObjectURL(f.thumb)
	}, [])
	// everything typed and added goes with the reader to set up the vendor, and comes back with them
	const setUpVendor = () => {
		away = { address, draft, lines, editing, files, suggested, sends: sends.current }
		keptAway.current = true
		guard.release()
		navigate('/vendors/new', { state: { fromScan: { name: draft.vendor, to: address } } })
	}

	/* ---- the vendor ---- */

	const suggest = (vendor, current) => {
		const defaults = vendorByAnyName(vendors.data ?? [], vendor)?.defaultCategories ?? []
		const kept = current.filter(c => !suggested?.names.includes(c))
		const missing = defaults.filter(c => !kept.includes(c))
		setSuggested(!kept.length && defaults.length ? { vendor, names: defaults, said: true } : null)
		setOffer(kept.length && missing.length ? { vendor, names: missing } : null)
		return kept.length ? kept : defaults
	}
	// a new order's vendor fills empty categories with its defaults or offers them, and another vendor
	// takes back only what the last one filled in; a saved order is never refilled (5l)
	const pickVendor = name => {
		const vendor = vendorByAnyName(vendors.data ?? [], name)?.name ?? name.trim()
		set({ vendor, ...(creating && vendor !== draft.vendor ? { categories: suggest(vendor, draft.categories) } : {}) })
	}
	// a vendor just set up from this receipt comes back chosen (Vendors 5b)
	const returned = here.state?.pickedVendor
	// a receipt or a link that names the vendor is the first vendor choice
	const seeded = useRef(false)
	useEffect(() => {
		if (seeded.current || !creating || !vendors.data || origin.copy) return
		if (returned) { seeded.current = true; return pickVendor(returned) }
		if (back) { seeded.current = true; return }
		if (!draft.vendor) return
		seeded.current = true
		const categories = suggest(draft.vendor, draft.categories)
		// filled in before the reader did anything, so it is where the form starts, not a change
		setStart(s => ({ ...s, categories }))
		set({ categories })
	}, [vendors.data])
	const setCategories = categories => {
		setSuggested(s => (s ? { ...s, names: s.names.filter(c => categories.includes(c)), said: false } : s))
		set({ categories })
	}
	const setStatus = status => set({
		status,
		...((status === 'Delivered' || status === 'Returned') && !draft.deliveredDate ? { deliveredDate: today() } : {}),
		...(status === 'Returned' && !draft.returnedDate ? { returnedDate: today() } : {})
	})

	/* ---- save ---- */

	// Discard throws a new order away on purpose; Cancel on a saved one asks first, as the other forms do
	const leave = () => {
		if (creating || lost) guard.release()
		if (onLeave) onLeave()
		else navigate(creating ? '/orders/new' : lost ? listAddress : `/orders/${orderId}`)
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
			return focusFirst('[data-details]', quietVendor)
		}
		const kept = current.filter(l => l.include !== false)
		const broken = kept.find(l => Object.keys(lineErrors(l)).length)
		if (broken) {
			setEditing({ key: broken.key, isNew: false, values: { ...broken }, tried: true })
			return focusFirst('.sp-line-editor')
		}
		if (!kept.length) return focusFirst('[data-add]')

		setSaving(true)
		let order
		try {
			const body = apiDraft(draft, kept)
			order = creating ? await createOrder(body) : await updateOrder(orderId, body)
		} catch (e) {
			setSaving(false)
			// a deleted order stays deleted: say so where it stays in view, and offer no second try
			if (e.gone && !creating) { setLost(e.message); return }
			const said = failureMessage(e, 'The order was not saved. Try again.')
			if (said) toast({ message: said, color: 'danger' })
			return
		}
		// the files follow one at a time, each kept or missed on its own (17b); a refusal's own
		// sentence says why, and one without (no connection) is worth trying again
		const missed = []
		const reasons = new Set()
		let retry = false
		const refused = (name, e) => {
			missed.push(name)
			const said = e && failureMessage(e, '')
			if (said) reasons.add(said)
			else if (!e?.signedOut) retry = true
			return null
		}
		let receiptMissed = false, notRemoved = 0
		if (scan) await attachScanDocument(scan.documentKey, order.id).catch(() => { receiptMissed = true })
		// the server keeps one file per name, so a removed one goes before its namesake arrives
		await Promise.all(gone.map(id => removeAttachment(order.id, id).catch(() => { notRemoved++ })))
		// a new photo is stored before the old one goes, so a failed upload leaves the old one (17a)
		await Promise.all(kept.map(async (line, i) => {
			const saved = order.items[i], old = line.photo
			if (!saved) return
			if (line.newPhoto) {
				const file = line.newPhoto.file
				const twin = old && sameName(old.name, file.name)
				// the photo sent when it was chosen is filed from there; one that did not arrive is sent now
				const upload = await line.newPhoto.sent
				if (upload) {
					const put = await attachScanDocument(upload.key, order.id, { as: 'file', item: saved.id, name: twin ? renamed(file).name : file.name })
						.catch(e => refused(file.name, e))
					if (!put) return
				} else {
					const sent = await addItemAttachments(order.id, saved.id, [twin ? renamed(file) : file]).catch(e => refused(file.name, e))
					if (!sent) return
					if (!sent.added?.length) return refused(file.name)
				}
				if (old) await removeItemAttachment(order.id, saved.id, old.id).catch(() => { notRemoved++ })
			} else if (old && line.dropPhoto) await removeItemAttachment(order.id, saved.id, old.id).catch(() => { notRemoved++ })
		}))
		for (const f of files) {
			if (f.problem) { missed.push(f.name); reasons.add(refusalOf(f)); continue }
			// one still on its way is waited for; one that failed to send is missed, and can be added again
			const upload = f.upload ?? await sends.current.get(f.key)
			if (!upload) { refused(f.name); continue }
			await attachScanDocument(upload.key, order.id, { as: 'file', name: f.name }).catch(e => refused(f.name, e))
		}
		if (scan) learnAlias(scan.vendor, order)
		invalidateOrderData()
		guard.release()
		const lapses = [
			missed.length ? `${names(missed)} ${missed.length === 1 ? 'was' : 'were'} not added` : null,
			receiptMissed ? 'the receipt was not kept with it' : null,
			notRemoved ? `${plural(notRemoved, 'file')} ${notRemoved === 1 ? 'was' : 'were'} not removed` : null
		].filter(Boolean)
		if (receiptMissed || notRemoved) retry = true
		if (lapses.length)
			toast({ message: [`The order was saved, but ${lapses.join(', and ')}.`, ...reasons, retry ? 'Try again from Edit order.' : null].filter(Boolean).join(' '), color: 'danger' })
		else if (!creating) toast({ message: 'Changes saved.' })
		// a new order lands on its saved page with the notice that can undo it (3a)
		const created = creating
			? { id: order.id, file: scan?.file.name ?? null, documentKey: scan?.documentKey ?? null, reference: draft.reference }
			: undefined
		navigate(`/orders/${order.id}`, { replace: creating, state: created && { created } })
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

	// what the viewer walks (17b): the attachments, saved then staged, then the lines' photos
	const receipt = scan ? receiptOf(scan.file) : null
	const viewable = [
		...(receipt ? [receipt] : []),
		...savedFiles.filter(f => !gone.includes(f.id)).map(f => ({
			key: f.id, name: f.name, kind: f.kind,
			src: f.kind === 'pdf' ? f.thumb : attachmentFileUrl(orderId, f.id),
			download: attachmentFileUrl(orderId, f.id),
			...pagesOf(orderId, f)
		})),
		...files.filter(f => !f.problem).map(f => ({ key: f.key, name: f.name, src: f.thumb })),
		...lines.flatMap(l => {
			const src = l.newPhoto?.url ?? (l.dropPhoto ? null : photoUrl(l))
			return src ? [{ key: `line:${l.key}`, name: l.title, src }] : []
		})
	]
	const open = key => setViewing(viewable.findIndex(f => f.key === key))
	const viewer = viewing != null && viewing > -1 && viewing < viewable.length
		? <Viewer items={viewable} at={viewing} onMove={setViewing} onClose={() => setViewing(null)} />
		: null

	const editor = editing
		? (
			<LineForm
				key={editing.key}
				editing={editing}
				sheet={touch}
				photoUrl={photoUrl}
				sendPhoto={sendPhoto}
				onChange={values => setEditing(e => ({ ...e, values }))}
				onCommit={() => commit(false)}
				onCommitNext={() => commit(true)}
				onCancel={cancelLine}
			/>
		)
		: null

	const lineRow = line => {
		const photo = line.newPhoto?.url ?? (line.dropPhoto ? null : photoUrl(line))
		// a phone's row is itself the button that opens the line, so its photo cannot be another
		const mark = <LinePhoto src={photo} name={line.title} onOpen={photo && !touch ? () => open(`line:${line.key}`) : undefined} />
		const warn = line.uncertain || (tried && Object.keys(lineErrors(line)).length)
		const named = line.title || 'the unnamed line'
		// a line as the receipt gave it says how well it was read (3a); once checked it reads as any line
		const asRead = scan && !touch && !line.checked && scan.lines.some(r => r.id === line.key)
		const subtitle = warn ? (line.uncertain ? UNCLEAR_LINE[line.unclearPart] ?? UNCLEAR_LINE.line : UNCLEAR_LINE.line)
			: asRead ? 'read clearly' : lineMetaWith(line, photo, scan || touch)
		const ink = warn ? 'sp-ink-warning' : asRead ? 'sp-ink-success' : null
		const words = (
			<span className="sp-stacked or-line">
				<span className="sp-title sp-truncate">{line.title || 'Unnamed line'}</span>
				<span className={['sp-subtitle', touch ? null : 'sp-truncate', ink].filter(Boolean).join(' ')}>{subtitle}</span>
			</span>
		)
		const text = (
			<>
				{words}
				{asRead && !touch && line.price != null ? <span className="sp-subtitle sp-nowrap">{lineMeta(line, true)}</span> : null}
				{line.price == null ? <span className="sp-subtitle sp-nowrap">No price</span> : <LineAmount line={line} compact />}
			</>
		)
		const pencil = <IconButton variant="outline" icon="pencil" aria-label={`Edit ${named}`} data-edit="" onClick={() => openLine(line)} />
		// a phone's scan review is a list to tick (7b): what was read, and a pencil to correct it
		if (touch && scan)
			return (
				<ListItem key={line.key} data-line={line.key} color={warn ? 'warning' : 'default'}
					mark={<Include line={line} setLines={setLines} />} actions={pencil}>
					{words}
				</ListItem>
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
				variant={carried === line.key || held?.key === line.key ? 'carried' : 'default'}
				color={warn ? 'warning' : 'default'}
				opens={!touch && !reordering}
				// a phone moves a line with its two buttons, so it shows no handle to drag
				handle={scan || touch ? undefined : <Icon name="grip-vertical" size={14} />}
				handleLabel={`Reorder ${named}, currently position ${at + 1} of ${lines.length}`}
				mark={scan ? <><Include line={line} setLines={setLines} />{mark}</> : mark}
				actions={reordering
					? <>
						<IconButton variant="outline" icon="chevron-up" aria-label={`Move ${named} up`} disabled={at === 0} onClick={() => move(line.key, -1)} />
						<IconButton variant="outline" icon="chevron-down" aria-label={`Move ${named} down`} disabled={at === lines.length - 1} onClick={() => move(line.key, 1)} />
					</>
					: <>
						{pencil}
						{scan ? null : <IconButton variant="outline" icon="copy" aria-label={`Duplicate ${named}`} onClick={() => duplicateLine(line)} />}
						{scan ? null : <IconButton variant="outline" danger icon="trash" aria-label={`Delete ${named}`} onClick={() => removeLine(line)} />}
					</>}
			>
				{/* on a phone the two move buttons need the row's width, so the amount steps aside while reordering */}
				{touch ? words : text}
			</ListItem>
		)
	}

	const brokenCount = tried ? lines.filter(l => l.include !== false && Object.keys(lineErrors(l)).length).length : 0
	const itemsHead = (
		<div className="sp-row-flex sp-wrap sp-gap-8">
			<span className="sp-section-label">{scan ? 'Lines found' : 'Items'}{dot}{lines.length}</span>
			<span className="sp-grow" />
			{brokenCount
				? <span className="sp-subtitle sp-ink-danger">{brokenCount === 1 ? '1 line needs attention' : `${brokenCount} lines need attention`}</span>
				: scan
					? (lines.length ? <span className="sp-meta">Untick a line to leave it out</span> : null)
					: touch
						? (lines.length > 1 ? <Button variant="outline" size="small" onClick={() => setReordering(r => !r)}>{reordering ? 'Done' : 'Reorder'}</Button> : null)
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
				<Announce>{said}</Announce>
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
							<ListItem variant="add" onClick={openNew} data-add="" handle={!touch}
								mark={<Mark size="medium" fill="add" aria-label="Add" aria-hidden="true"><Icon name="plus" /></Mark>}>
								<span className="sp-title">{scan ? 'Add a line the scan missed' : 'Add item'}</span>
							</ListItem>
						)}
			</div>
			{scan && !touch
				? (
					<div className="sp-row-flex sp-gap-12">
						{editing?.isNew ? null : <Button variant="outline" size="small" iconStart="plus" data-add="" onClick={openNew}>Add a line the scan missed</Button>}
						<span className="sp-grow" />
						<span className="sp-subtitle">Lines {money(sums.paid)}{dot}shipping {money(draft.shipping || 0)}</span>
					</div>
				)
				: null}
			{mismatch
				? (
					<ListItem color="warning" count="!"
						actions={<Button variant="outline" size="small" onClick={() => open('receipt')}>Compare</Button>}>
						<span className="sp-data sp-ink-warning">
							The order comes to <strong className="sp-strong">{money(sums.total)}</strong> but the receipt says <strong className="sp-strong">{money(printed)}</strong> - a line may be missing.
						</span>
					</ListItem>
				)
				: null}
		</Card>
	)

	const shownFiles = savedFiles.filter(f => !gone.includes(f.id))
	// before the save the receipt is an upload, not an attachment (3a): shown to read the lines against
	const receiptPages = receipt?.pages > 1 ? `${receipt.pages} pages` : null
	const attachmentsCard = scan
		? touch
			? (
				<Card>
					<ListItem onClick={() => open('receipt')} aria-label={`Open the receipt, ${scan.file.name}`}
						mark={<Mark size="medium" fill={scan.file.hasThumbnail ? 'photo' : 'none'} text={scan.file.kind === 'pdf' && scan.file.hasThumbnail ? 'PDF' : undefined} aria-hidden="true" aria-label="Receipt">
							{scan.file.hasThumbnail ? <img src={scanThumbnailUrl(scan.file.key)} alt="" /> : <span>{scan.file.kind === 'pdf' ? 'PDF' : 'IMG'}</span>}
						</Mark>}>
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{receiptPages ? `Receipt, ${receiptPages}` : 'Receipt'}</span>
							<span className="sp-subtitle">Tap to see it at full size</span>
						</span>
					</ListItem>
				</Card>
			)
			: (
				<Card>
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-section-label">Receipt</span>
						<span className="sp-meta sp-truncate">{[scan.file.name, receiptPages].filter(Boolean).join(dot)}</span>
					</div>
					<button type="button" className="or-receipt" onClick={() => open('receipt')} aria-label={`Open the receipt, ${scan.file.name}, at full size`}>
						<ReceiptPage src={receipt.src} />
					</button>
				</Card>
			)
		: (
			<Card>
				<span className="sp-section-label">Attachments{dot}{shownFiles.length + files.length}</span>
				<Strip>
					{shownFiles.map(f => (
						<AttachmentTile key={f.id} name={f.name} kind={f.kind} thumb={f.thumb} bare={touch}
							onOpen={() => open(f.id)} onRemove={() => setGone(g => [...g, f.id])} />
					))}
					{files.map(f => (
						<AttachmentTile key={f.key} name={f.name} kind={f.kind} bare={touch}
							thumb={f.thumb ?? (f.upload?.hasThumbnail ? scanThumbnailUrl(f.upload.key) : null)}
							problem={f.problem ?? (f.failed ? 'Upload failed' : undefined)}
							sending={f.sending ? f.sent : undefined}
							twin={!f.problem && !f.failed && twinOf(f)}
							onOpen={f.problem || f.sending ? undefined : f.failed ? () => resend(f) : () => open(f.key)}
							onRemove={() => dropFile(f)} />
					))}
					<AttachmentAdd onFiles={addFiles} />
				</Strip>
			</Card>
		)

	const fixCount = Object.keys(shown).length
	// a note beside a value the receipt gave, while it is still the value read (3a)
	const lookAt = field => (scan?.unclear?.includes(field) && draft[field] === start[field] ? { note: field === 'vendor' ? 'needs a look' : 'check', noteType: 'warning' } : {})
	const vendorNote = !scan || !scan.vendor || draft.vendor !== start.vendor ? {}
		: scan.unclear?.includes('vendor') ? lookAt('vendor')
			: scan.vendorMatched ? { note: 'matched existing vendor', noteType: 'success' } : { note: 'new vendor, created on save' }
	const fields = (
		<>
			<Field label="Vendor" {...vendorNote} {...problem(shown.vendor)}>
				<VendorPicker vendors={(vendors.data ?? []).filter(v => !v.archived)} recent={recentVendors(latest.data?.orders)} value={draft.vendor} onPick={pickVendor} quiet={quietVendor} />
			</Field>
			{scan && creating && vendors.data && draft.vendor && !vendorByAnyName(vendors.data, draft.vendor)
				? <NewVendorFromScan onSetUp={setUpVendor} />
				: null}
			<div className="sp-fields">
				<Field label="Date" {...lookAt('date')} {...(shown.date ? problem(shown.date) : ahead(draft.date))}>
					<DateField value={draft.date} danger={!!shown.date} locale={activeLocaleCode()}
						onChange={date => set({ date })} />
				</Field>
				<Field label="Kind" {...problem(shown.kind)}>
					<KindPicker value={draft.kind} onPick={kind => set({ kind })} />
				</Field>
			</div>
			<Field label="Status">
				{statuses.length <= 4
					? <Segmented name={statusName} variant="facet" options={statuses.map(s => ({ value: s.key, label: s.name }))} value={draft.status} onChange={setStatus} />
					: (
						<Combobox value={statuses.find(s => s.key === draft.status)?.name ?? draft.status} aria-label="Status">
							{statuses.map(s => (
								<ComboboxOption key={s.key} dot={DOT[s.tone]} selected={s.key === draft.status} onSelect={() => setStatus(s.key)}>{s.name}</ComboboxOption>
							))}
						</Combobox>
					)}
			</Field>
			<Field label="Categories" message={suggested?.said ? `Filled from ${suggested.vendor}. Remove any that do not fit.` : undefined}>
				<TokensField value={draft.categories} onChange={setCategories} placeholder="Add category…" aria-label="Add a category" />
			</Field>
			{offer
				? (
					<>
						<Alert mark="!" title={`${offer.vendor} usually gets ${names(offer.names)}`} />
						<div className="sp-row-flex sp-gap-12">
							<span className="sp-grow" />
							<Button variant="outline" size="small" onClick={() => { setOffer(null); set({ categories: [...draft.categories, ...offer.names] }) }}>
								{offer.names.length === 1 ? `Add ${offer.names[0]}` : offer.names.length === 2 ? 'Add both' : `Add all ${offer.names.length}`}
							</Button>
						</div>
					</>
				)
				: null}
			<div className="sp-fields">
				<Field label="Discount" unit={currencySymbol()} {...lookAt('discount')}>
					<NumberField value={draft.discount} min={0} locale={NUMBER_LOCALE} placeholder="0,00" onChange={discount => set({ discount })} />
				</Field>
				<Field label="Shipping fee" unit={currencySymbol()} {...lookAt('shipping')}>
					<NumberField value={draft.shipping} min={0} locale={NUMBER_LOCALE} placeholder="0,00" onChange={shipping => set({ shipping })} />
				</Field>
			</div>
			<div className="sp-fields">
				<Field label="Reference">
					{/* an order saved without one is given the next order number */}
					<TextField value={draft.reference} placeholder={creating ? 'Given on save' : undefined} onChange={reference => set({ reference })} />
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
				<Toolbar variant="toggle" expanded={!folded} onClick={() => setFolded(f => !f)} chevron={<Icon name="chevron-down" />}>
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">Order details</span>
						<span className="sp-meta">{detailsLine(draft)}</span>
					</span>
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

	/* A monthly limit this order takes its category past (8b): said where the save is, amber, and
	   never in the way of the save. The order's total is shared between its categories. */
	const dated = /^\d{4}-\d{2}-\d{2}$/.test(draft.date ?? '')
	const limits = useApi(getOrderLimits, [draft.date, draft.categories, orderId ?? ''], { enabled: dated && draft.categories.length > 0 })
	const share = draft.categories.length ? sums.total / draft.categories.length : 0
	const crossed = dated && draft.categories.length && limits.data
		? limits.data.limits.filter(l => l.spend + share > l.budget + 0.005)
		: []
	const monthName = dated ? monthNames('long')[Number(draft.date.slice(5, 7)) - 1] : ''
	const limitNotice = crossed.length
		? crossed.map(l => (
			<ListItem key={l.name} color="warning" count="!">
				<span className="sp-stack sp-gap-6">
					<span className="sp-title sp-ink-warning">
						{l.spend > l.budget ? `${l.name} is already over its limit` : `This order puts ${l.name} over its limit`}
					</span>
					<span className="sp-meta sp-ink-warning">
						{currency(l.spend + share, 0)} of {currency(l.budget, 0)} for {monthName}. You can still save. Nothing is blocked.
					</span>
				</span>
			</ListItem>
		))
		: null

	const leaveWord = creating ? 'Discard' : 'Cancel'
	const commitWord = saving ? 'Saving…' : crossed.length ? (creating ? 'Create anyway' : 'Save anyway') : creating ? 'Create' : 'Save'
	const leaveButton = <Button key="leave" variant="outline" onClick={discard}>{leaveWord}</Button>
	const commitButton = lost ? null : <Button key="save" disabled={saving} onClick={save}>{commitWord}</Button>
	const state = lost ? 'Not saved' : dirty ? 'Unsaved changes' : creating ? 'Nothing saved yet' : null
	const totalsCard = (
		<Card
			// once the split folds the commits move to the bar that stays in view (1d)
			footer={stacked || touch ? [] : [leaveButton, commitButton]}
			footerLayout="split"
			footerCommits
		>
			{scan ? <span className="sp-section-label">Totals</span> : null}
			{touch ? null : limitNotice}
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
					<span className="sp-meta">{itemsWord(included.length)}{dot}discount {amount(draft.discount || 0)}{dot}shipping {amount(draft.shipping || 0)}</span>
					<Saving value={sums.saved} variant="stat" />
				</>}
		</Card>
	)

	// on a phone the bar takes the tab bar's place (1c, 5b)
	const touchBar = (
		<SaveBar>
			<span className="sp-subtitle sp-grow">{state}</span>
			{leaveButton}
			{commitButton}
		</SaveBar>
	)
	const stickyBar = (
		<ListItem variant="sticky">
			<span className="sp-subtitle sp-grow">{state}</span>
			{leaveButton}
			{commitButton}
		</ListItem>
	)

	const lostNotice = lost ? <Alert color="danger" mark="!">{lost}</Alert> : null

	const notice = notices({ origin, scan, lines, leave, touch })

	// on a phone the sheet's line is copied as it stands in the sheet, once it reads as a whole line
	const copyEditing = () => {
		if (Object.keys(lineErrors(editing.values)).length) return setEditing(e => ({ ...e, tried: true }))
		const line = lines.find(l => l.key === editing.key)
		commitInto(editing)
		setEditing(null)
		duplicateLine(line, editing.values)
	}
	const sheet = touch && editing
		? createPortal(
			<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) cancelLine() }}>
				<Sheet role="dialog" aria-modal="true" aria-label={editing.isNew ? 'Add a line' : 'Edit line'} ref={sheetBox}>
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-heading">{editing.isNew ? 'Add a line' : 'Edit line'}</span>
						<span className="sp-grow" />
						{editing.isNew || scan ? null : <IconButton variant="outline" icon="copy" aria-label={`Duplicate ${editing.values.title || 'the unnamed line'}`}
							onClick={copyEditing} />}
						{editing.isNew ? null : <IconButton variant="outline" danger icon="trash" aria-label={`Delete ${editing.values.title || 'the unnamed line'}`}
							onClick={() => removeLine(lines.find(l => l.key === editing.key))} />}
					</div>
					{editor}
				</Sheet>
			</Scrim>,
			document.body
		)
		: null

	// the lines the receipt gave, apart from any typed in since: only those were read
	const read = scan ? lines.filter(l => scan.lines.some(r => r.id === l.key)).length : 0
	const typed = lines.length - read
	const lineWord = n => plural(n, 'line')
	const dialog = asking
		? (
			<Dialog onCancel={() => setAsking(false)} aria-label="Discard this scan?">
				<div className="sp-stack sp-gap-12">
					<DialogTitle>Discard this scan?</DialogTitle>
					<DialogBody>
						{read
							? `The receipt was read and ${lineWord(read)} ${read === 1 ? 'is' : 'are'} waiting to be checked${typed ? `, with ${lineWord(typed)} you added` : ''}. Nothing is saved if you discard.`
							: `If you discard, nothing is saved, and ${typed === 1 ? 'the line you added is' : `the ${typed} lines you added are`} lost.`}
					</DialogBody>
					<DialogActions>
						<Button variant="outline" fullWidth onClick={() => setAsking(false)}>Keep checking</Button>
						<Button color="danger" fullWidth onClick={leave}>Discard</Button>
					</DialogActions>
				</div>
			</Dialog>
		)
		: null

	if (touch) return (
		<div className="sp-stack sp-gap-12" ref={column}>
			{lostNotice}{notice}{itemsCard}{attachmentsCard}{detailsCard}{scan ? totalsCard : null}{limitNotice}{touchBar}{sheet}{dialog}{viewer}{guard.prompt}
		</div>
	)
	// folded, one column holds everything so the bar can stay at the bottom of the whole page (c27)
	const main = stacked
		? <div className="sp-stack sp-gap-12" ref={column}>{lostNotice}{itemsCard}{attachmentsCard}{detailsCard}{totalsCard}{stickyBar}{dialog}{viewer}{guard.prompt}</div>
		: <div className="sp-stack sp-gap-12" ref={column}>{lostNotice}{itemsCard}{attachmentsCard}</div>
	const rail = stacked ? null : <Panel>{detailsCard}{totalsCard}{dialog}{viewer}{guard.prompt}</Panel>
	if (!region) return <>{main}{rail}</>
	return <>{notice}<div className="sp-shell__body--split">{main}{rail}</div></>
}

const INVALID = '[aria-invalid="true"] input, input[aria-invalid="true"], [aria-invalid="true"] button, button[aria-invalid="true"]'

/** Focus the first field to fix inside `selector`. `quiet` is held while it takes focus, so a
    picker that opens on focus stays closed over its own message. */
const focusFirst = (selector, quiet) => requestAnimationFrame(() => {
	const box = document.querySelector(selector)
	const target = box?.querySelector(INVALID) ?? box?.querySelector('input, button') ?? box
	if (quiet) quiet.current = true
	target?.focus?.()
	if (quiet) quiet.current = false
	box?.scrollIntoView?.({ block: 'nearest' })
})

// the server's own words for the two refusals, for a file the form refused before sending it
const refusalOf = f => (f.problem === 'Too large' ? `A file is too large. Each file can be up to ${MAX_FILE_MB} MB.` : `The file "${f.name}" is not an image or a PDF.`)

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()
// the server keeps one file per name on a line, so a replacement with the old one's name is sent under another
const renamed = file => new File([file], file.name.replace(/(\.[^.]*)?$/, ' (2)$1'), { type: file.type })
/** "a.pdf", "a.pdf and b.jpg", "a.pdf, b.jpg and c.png" */
const names = list => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`)

/** Whether the order's split has folded into one column (components.css folds it at 900). */
function useStacked(ref) {
	const [stacked, setStacked] = useState(false)
	useLayoutEffect(() => {
		const body = ref.current?.closest('.sp-shell__body')
		if (!body) return
		const watch = new ResizeObserver(([entry]) => setStacked(entry.contentRect.width <= 900))
		watch.observe(body)
		return () => watch.disconnect()
	}, [ref])
	return stacked
}

/** The uploaded receipt as the viewer shows it, every page of it (17d: receipt preview). */
const receiptOf = file => ({
	key: 'receipt', name: file.name, kind: file.kind, download: scanFileUrl(file.key),
	src: file.kind === 'pdf' ? scanPageUrl(file.key, 0) : scanFileUrl(file.key),
	...(file.kind === 'pdf'
		? { pages: file.pages ?? null, pageSrc: i => scanPageUrl(file.key, i), countPages: () => getScanPages(file.key).then(r => r.pages) }
		: {})
})

const UNCLEAR_FIELD = { vendor: 'the vendor name', date: 'the date', shipping: 'the shipping fee', discount: 'the discount', total: 'the printed total' }
// what was hard to read on a line of a scanned receipt, by the part the reading named (3a)
const UNCLEAR_LINE = {
	price: 'price unclear - check against the receipt',
	title: 'name was partly readable - check the spelling',
	quantity: 'quantity unclear - check against the receipt',
	line: 'Check this line against the receipt'
}

const lineMetaWith = (line, photo, plain) => (plain || photo ? lineMeta(line, plain) : `${lineMeta(line)}${dot}no photo`)

const detailsLine = d => [d.categories.join(', '), d.kind, d.reference].filter(Boolean).join(dot)

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
			<Alert mark="!" title={scan.failure === 'empty' ? 'No lines were read from this receipt.' : 'Nothing was read from this receipt.'}>
				{scan.failure === 'empty' ? 'Add the lines yourself.' : 'Add the lines and the details yourself.'} The receipt is kept with the order when you create it.
			</Alert>
		)
	const unclear = lines.filter(l => l.uncertain).length
	const hard = [unclear ? plural(unclear, 'line') : null, ...(scan.unclear ?? []).map(f => UNCLEAR_FIELD[f])].filter(Boolean)
	const looks = [
		...(scan.vendorMatched ? [] : ['the vendor is new and will be created']),
		...(scan.total == null ? ['no printed total was found'] : []),
		...(scan.checks?.some(c => c.id === 'vat' && c.warning) ? ['it was not clear if the prices include VAT'] : [])
	]
	const count = looks.length + unclear + (scan.unclear?.length ?? 0)
	if (!count) return null
	const one = hard.length === 1 && unclear < 2
	const said = [hard.length ? `${names(hard)} ${one ? 'was' : 'were'} hard to read` : null, ...looks].filter(Boolean)
	return (
		<Alert mark="!" title={count === 1 ? '1 value needs a look.' : `${count} values need a look.`}
			action={unclear && !touch ? <Button variant="outline" size="small" onClick={() => focusFirst('.sp-list-item[data-color="warning"]')}>Jump to first</Button> : null}>
			{said.join(', ').replace(/^./, c => c.toUpperCase())}.
		</Alert>
	)
}

/** The line being edited or added (1b), in place on a desktop and in a sheet on a phone. */
function LineForm({ editing, sheet, photoUrl, sendPhoto, onChange, onCommit, onCommitNext, onCancel }) {
	const v = editing.values
	const errors = editing.tried ? lineErrors(v) : {}
	const set = patch => onChange({ ...v, ...patch })
	const photo = v.newPhoto?.url ?? (v.dropPhoto ? null : photoUrl(v))
	// the new photo is sent at once (17a); one that did not arrive keeps its failure and a Retry (17b)
	const [sending, setSending] = useState(null)
	useEffect(() => {
		const sent = v.newPhoto?.sent
		setSending(sent ? 'busy' : null)
		if (!sent) return
		let live = true
		sent.then(upload => { if (live) setSending(upload ? null : 'failed') })
		return () => { live = false }
	}, [v.newPhoto?.sent])
	// a file the line cannot take leaves the photo as it was and says why on the slot (17b)
	const take = file => {
		const refused = fileProblem(file, PHOTO_TYPES)
		if (refused) return set({ photoProblem: refused })
		if (v.newPhoto) URL.revokeObjectURL(v.newPhoto.url)
		set({ newPhoto: { file, url: URL.createObjectURL(file), sent: sendPhoto(file) }, dropPhoto: false, photoProblem: null })
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
			hint={`Enter saves${dot}Escape cancels${dot}${MAC ? '⌘↵' : 'Ctrl ↵'} saves and opens the next line`}
			commit={editing.isNew ? 'Add line' : 'Save line'}
			photo={
				<Slot
					size="medium"
					name="the line's photo"
					src={photo}
					problem={v.photoProblem ?? (sending === 'failed' ? 'Failed' : undefined)}
					busy={sending === 'busy'}
					onRetry={sending === 'failed' ? () => set({ newPhoto: { ...v.newPhoto, sent: sendPhoto(v.newPhoto.file) } }) : undefined}
					onFile={take}
					onRemove={() => set({ newPhoto: null, dropPhoto: Boolean(v.photo), photoProblem: null })}
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
					{/* the smallest quantity the server keeps: more than 0, two decimals */}
					<Stepper value={Number(v.quantity) || 0} min={0.01} step={1} decimals={2} locale={NUMBER_LOCALE} aria-label="Quantity" onChange={quantity => set({ quantity })} />
				</Field>
				<Field label="Unit price" unit={currencySymbol()} {...problem(errors.price)}>
					<NumberField value={v.price} min={0} locale={NUMBER_LOCALE} placeholder="0,00" onChange={price => set({ price })} />
				</Field>
				<Field label="Retail price" unit={currencySymbol()}>
					<NumberField value={v.retail} min={0} locale={NUMBER_LOCALE} placeholder="0,00" onChange={retail => set({ retail })} />
				</Field>
				<Computed label="Line total">{v.price == null ? '-' : money(lineTotal(v))}</Computed>
			</div>
		</LineEditor>
	)
}

/** The vendors of the latest orders, newest first: the picker's Recent group. */
const recentVendors = orders => [...new Set((orders ?? []).map(o => o.vendor?.name).filter(Boolean))].slice(0, 5)

/** The typed text in bold where it falls in a name (c5). */
const bolded = (name, typed) => {
	const at = typed ? name.toLowerCase().indexOf(typed.toLowerCase()) : -1
	if (at < 0) return name
	return <>{name.slice(0, at)}<b>{name.slice(at, at + typed.length)}</b>{name.slice(at + typed.length)}</>
}

/** Vendors as you type their name or an alias, in Favourites, Recent and the rest (c5, 14a); a
    name that is none of them becomes a new one. `quiet` keeps the list shut while it is held. */
function VendorPicker({ vendors, recent, value, onPick, quiet, ...rest }) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const typed = query.trim()
	const found = vendors.map(v => ({ v, hit: vendorTextMatch(v, typed) })).filter(x => x.hit.matches)
	const favourites = found.filter(x => x.v.favourite)
	const recents = recent.map(name => found.find(x => x.v.name === name && !x.v.favourite)).filter(Boolean)
	const others = found.filter(x => !favourites.includes(x) && !recents.includes(x)).sort((a, b) => a.v.name.localeCompare(b.v.name))
	const groups = [['Favourites', favourites], ['Recent', recents], ['Other vendors', others]].filter(([, xs]) => xs.length)
	const known = typed && vendorByAnyName(vendors, typed)
	return (
		<Combobox searchable value={value} placeholder="Choose a vendor" open={open}
			onOpenChange={next => {
				if (next && quiet?.current) return
				setOpen(next)
				if (!next) setQuery('')
			}}
			onSearch={setQuery} noun="vendors" aria-label="Vendor" {...rest}>
			{groups.map(([name, xs], i) => (
				<Fragment key={name}>
					{i ? <ComboboxSeparator /> : null}
					{groups.length > 1 ? <ComboboxGroup>{name}</ComboboxGroup> : null}
					{xs.map(({ v, hit }) => (
						<ComboboxOption key={v.id} selected={v.name === value} onSelect={() => onPick(v.name)}
							meta={hit.alias ?? undefined}>{bolded(v.name, typed)}</ComboboxOption>
					))}
				</Fragment>
			))}
			{typed && !known
				? <>{groups.length ? <ComboboxSeparator /> : null}<ComboboxOption create onSelect={() => onPick(typed)}>Create "{typed}"</ComboboxOption></>
				: null}
		</Combobox>
	)
}

/** A receipt's vendor the account does not know yet: set it up first, and come back to the receipt
    with it chosen and the order as it was left (Vendors 5b). The field's note says saving adds it. */
function NewVendorFromScan({ onSetUp }) {
	return (
		<div className="sp-row-flex sp-gap-8">
			<span className="sp-note sp-grow">Want to add its details now?</span>
			<Button variant="outline" size="small" onClick={onSetUp}>Set it up first</Button>
		</div>
	)
}

/** A receipt page drawn the first time it is opened: the spinner holds its place until it arrives. */
function ReceiptPage({ src }) {
	const [shown, setShown] = useState(null)
	return (
		<>
			{shown === src ? null : <Spinner />}
			<img src={src} alt="" onLoad={() => setShown(src)} />
		</>
	)
}

function KindPicker({ value, onPick, ...rest }) {
	return (
		<Combobox value={value} aria-label="Kind" {...rest}>
			{spendKinds.map(kind => (
				<ComboboxOption key={kind} selected={kind === value} onSelect={() => onPick(kind)}>{kind}</ComboboxOption>
			))}
		</Combobox>
	)
}
