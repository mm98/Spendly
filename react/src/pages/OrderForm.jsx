import { httpUrl } from '../api/rules.js'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { Card, CardBody, CardHeader, Panel, Toolbar } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Announce, ListItem } from '../components/ListItem.jsx'
import { ReorderList } from '../components/Reorder.jsx'
import { LineEditor } from '../components/LineEditor.jsx'
import { Field } from '../components/Field.jsx'
import { NumberField, TextField } from '../components/Inputs.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { DateField } from '../components/DatePickers.jsx'
import { Check, Switch } from '../components/Choice.jsx'
import { Sum } from '../components/Data.jsx'
import { Pill } from '../components/Pill.jsx'
import { FILE_TYPES, PHOTO_TYPES, Slot, sniffedProblem } from '../components/FileDrop.jsx'
import { AttachmentAdd, Strip, Viewer } from '../components/Attachments.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, Toast, useToast, Leaving } from '../components/Overlays.jsx'
import { Empty, Spinner, useFocusTrap } from '../components/Utilities.jsx'
import { Scrim } from '../components/Shell.jsx'
import { SaveBar, Sheet } from '../components/Touch.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { useApi } from '../api/useApi.js'
import {
	attachmentDownloadUrl, attachScanDocument, attachmentFileUrl, attachmentPageUrl, attachmentThumbnailUrl, createCategory, deleteOrder, failureMessage, getCategorySuggestions, getOrder, getOrderLimits, getOrderLookalike, makeScanDraft, getVendorOrdersCarrying, getOverLimitCategories, getScanPages, getSettings,
	getVendorPage, discardDraft, discardScanDocument, invalidateCategoryData, invalidateDraftData, invalidateOrderData, keepDraft, makeDraft, onOrderSavedElsewhere, scanDownloadUrl, scanFileUrl, scanPageUrl, scanThumbnailUrl, kindName, sendFile, spendKinds
} from '../api/client.js'
import {
	NUMBER_LOCALE, activeLocaleCode, amount, currency, currencySymbol, dayShortMonth, dot, monthNames, plural, quantity, shortDate, today
} from '../api/format.js'
import { useListReturn } from '../app/listMemory.js'
import { OverLimitDot } from '../app/orderRow.jsx'
import { useRecent } from '../app/pickList.jsx'
import { VendorPicker } from '../app/vendorPicker.jsx'
import { MAC, useShellShape } from '../app/useMedia.js'
import { Saving } from '../app/saving.jsx'
import { useStatuses, useStatusTypes } from '../app/statuses.js'
import { useFolded } from '../app/folded.js'
import {
	AttachmentTile, LineAmount, LinePhoto, isPdf, itemsWord, lineMeta, lineTotal, money, pagesOf, totalsOf
} from './OrderParts.jsx'
import { CategoryTokens, useLeaveGuard } from './vendorsCategories.jsx'
import { OrderRepeats } from './OrderRepeats.jsx'
import { dropSave, flushOutbox, names, newSaveKey, ownSave, queueSave, shortened, stuckSaveFor, waitingSaves, watchOutbox, writeOrder } from './orderSave.js'
import { useAfterDraw } from '../app/afterDraw.js'
import { phrase, usePhrase } from '../language/phrases.js'

/* The order as a form (1d): editing and every way to create one are this screen in another
   state (3a, 3b). Save or Create writes the order, then its files; a draft keeps the form as it is edited. */

const DOT = { success: 'done', progress: 'progress', danger: 'returned', neutral: 'draft' }

/** What blocks a save. Every one of these blocks a Draft status too: it is what the order is filed by. */
const orderErrors = (d, dated) => {
	const e = {}
	if (!d.vendor.trim()) e.vendor = phrase('form.vendorRequired')
	else if (d.vendor.trim().length > 80) e.vendor = phrase('form.atMost', { most: 80 })
	if (!d.date) e.date = phrase('form.dateRequired')
	if (!spendKinds.includes(d.kind)) e.kind = phrase('form.kindRequired')
	const own = dated ? d.statusDates?.[d.status] : null
	if (own && d.date && own < d.date) e.statusDate = phrase('form.statusDateEarly', { date: shortDate(d.date) })
	return e
}

/** A message that blocks the save, or nothing: a danger type alone marks the field invalid. */
const problem = message => (message ? { message, messageType: 'danger' } : {})

/** A date after today is kept, since an order can be booked ahead; amber says so (6c). */
const ahead = date => (date > today() ? { message: phrase('form.future'), messageType: 'warning' } : {})

/** A new line nothing was typed into, which leaving or saving drops rather than checks. */
const untouchedNew = e => Boolean(e?.isNew && !e.values.title.trim() && e.values.price == null && !e.values.newPhoto)

const lineErrors = v => {
	const e = {}
	if (!String(v.title ?? '').trim()) e.title = phrase('form.titleRequired')
	else if (v.title.trim().length > 120) e.title = phrase('form.atMost', { most: 120 })
	if (!(Number(v.quantity) > 0)) e.quantity = phrase('form.quantityZero')
	else if (Number(v.quantity) > 9999) e.quantity = phrase('form.atMost', { most: 9999 })
	if (v.price == null) e.price = phrase('form.priceRequired')
	if (String(v.url ?? '').trim() && !httpUrl(v.url)) e.url = phrase('form.notLink')
	return e
}

/** A saved order as the form's draft. Its lines keep their ids, so a save edits them in place. */
export function draftOf(order) {
	const last = status => order.statusHistory.findLast(s => s.status === status)?.date ?? ''
	return {
		vendor: order.vendor?.name ?? '', date: order.date, status: order.status, kind: order.kind,
		statusDates: Object.fromEntries(order.statusHistory.map(s => [s.status, last(s.status)])),
		categories: order.categories.map(c => c.name),
		shipping: order.shipping || null, discount: order.discount || null,
		reference: order.reference ?? '', note: order.note ?? '', refunded: order.refunded, excludeFromStats: order.excludeFromStats,
		lines: order.items.map(item => ({
			key: item.id, id: item.id, title: item.title, quantity: item.quantity, price: item.price,
			retail: item.retail ?? null, note: item.note ?? '', url: item.url ?? '',
			photo: item.attachments?.[0] ?? null
		}))
	}
}

/** The draft as the API takes it. A status date the form does not show follows the order's. */
export function apiDraft(d, lines, dated) {
	return {
		vendor: d.vendor.trim(), date: d.date, status: d.status, kind: d.kind,
		statusDates: Object.fromEntries(Object.entries(d.statusDates ?? {}).filter(([key, date]) => date && dated.has(key))),
		categories: d.categories, shipping: d.shipping ? amount(d.shipping) : '', discount: d.discount ? amount(d.discount) : '',
		reference: d.reference, note: d.note, refunded: d.refunded, excludeFromStats: d.excludeFromStats,
		items: lines.map(l => ({ ...(l.id ? { id: l.id } : {}), title: l.title.trim(), quantity: l.quantity, price: l.price, retail: l.retail, note: l.note, url: l.url ?? '' }))
	}
}

/** A scan's form as the reading starts it (3a). */
export function readSeed(answer) {
	return {
		vendor: answer.vendor ?? '', date: answer.date, status: answer.status, kind: answer.kind,
		statusDates: { Delivered: answer.deliveredDate, Returned: answer.returnedDate }, categories: [],
		shipping: answer.shipping || null, discount: answer.discount || null,
		reference: answer.reference ?? '', note: '', refunded: false, excludeFromStats: false,
		lines: answer.lines.map(l => ({
			key: l.id, title: l.title ?? '', quantity: l.quantity ?? 1, price: l.price ?? null,
			retail: l.retail ?? null, note: '', uncertain: Boolean(l.uncertain), unclearPart: l.unclearPart ?? null, include: true
		}))
	}
}

/** A scan's form as its draft kept it, else as the reading starts it (3a). */
export const scanSeed = answer => (answer.form
	? { ...readSeed(answer), ...answer.form.values, lines: answer.form.lines, files: answer.form.files ?? [] }
	: readSeed(answer))

let made = 0
const freshKey = () => `new-${++made}`

// a draft is written this long after the last change, so typing sends it once
const KEEP_MS = 600
/** A file a draft kept, as the form holds a file that has arrived. */
const keptFile = f => ({ key: freshKey(), name: f.name, kind: f.kind, upload: { key: f.key, hasThumbnail: f.hasThumbnail, sha256: f.sha256 ?? null }, sending: false, sent: 1 })
/** Whether a line's photo is one a draft kept: sent, and not on an order yet. */
const keptPhoto = l => Boolean(!l.newPhoto && !l.dropPhoto && l.photo?.key && !l.photo.id)

/* A new order left to set up its vendor first (Vendors 5b), kept in memory with its files and
   photos until the form at the same address opens again. Taken once: any other visit drops it. */
let away = null
const takeAway = address => {
	const kept = away
	away = null
	return kept?.address === address ? kept : null
}

/** `origin` is `{ copy, draftId }` or `{ scan, draftId, shownOrders }`, the last the records the dialog in 3c showed for the scan;
    `region` draws the split for a route whose body is not one; `revision` is the copy this form edits (6d); `onDraft(id)` hears when an order made here becomes a draft. */
export function OrderForm({ mode, orderId, seed, revision = null, origin = {}, files: savedFiles = [], photoUrl = () => null, region = false, onLeave, onDraft }) {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const toast = useToast()
	const afterDraw = useAfterDraw()
	const listAddress = useListReturn('orders')
	const touch = useShellShape() === 'touch'
	const recentVendors = useRecent('vendor')
	const creating = mode === 'new'
	const scan = origin.scan ?? null
	// the values as the receipt gave them, which a note stays beside until they are changed (3a)
	const [asRead] = useState(() => (scan ? readSeed(scan) : null))
	// a draft keeps the form as it is edited, until Create or Discard (3a): a scan or an order made here is one
	// from its first change
	const [draftId, setDraftId] = useState(creating ? origin.draftId ?? null : null)
	const draftNow = useRef(draftId)
	const here = useLocation()
	const address = here.pathname + here.search
	const [back] = useState(() => (creating ? takeAway(address) : null))

	// a change that waited for the connection and found the order changed meanwhile, brought back to choose (6d)
	const [stuck] = useState(() => (creating ? null : stuckSaveFor(orderId)))
	const mine = stuck?.plan.form ?? null
	const [draft, setDraft] = useState(() => back?.draft ?? (mine ? { ...mine.draft, lines: undefined } : { ...seed, lines: undefined }))
	// the categories a vendor filled in, so another vendor takes back only those (5l); and the
	// defaults offered as an add when the field already had some
	const [suggested, setSuggested] = useState(back?.suggested ?? null)
	const [offer, setOffer] = useState(null)
	// the order was deleted elsewhere, in the sentence that says so: nothing here can be saved any more
	const [lost, setLost] = useState(null)
	const [lines, setLines] = useState(back?.lines ?? mine?.lines ?? seed.lines)
	const [editing, setEditing] = useState(() => {
		if (back) return back.editing
		// a copy is nearly always changed in its first line, so that line opens ready to type in; on a
		// phone that editor would cover the copy, which opens with no line open (3b, what you land on · phone)
		if (creating && origin.copy && !origin.draftId && seed.lines.length && !touch) return { key: seed.lines[0].key, isNew: false, values: { ...seed.lines[0] } }
		return creating && !seed.lines.length && !scan ? newEditing() : null
	})
	// the vendor is the first field, unless a line opened with the form and holds the cursor
	const [vendorFirst] = useState(() => !editing)
	// on touch a line that opened with the form waits for a tap before its field takes focus
	const [openedLine] = useState(() => editing?.key ?? null)
	const lineFocus = !touch || editing?.key !== openedLine
	const [tried, setTried] = useState(false)
	const [saving, setSaving] = useState(false)
	const [files, setFiles] = useState(back?.files ?? (seed.files ?? []).map(keptFile))
	const [gone, setGone] = useState([])
	// the files the saved order holds, as this form last read them
	const [saved, setSaved] = useState(savedFiles)
	// the copy of the order this form edits, and another copy saved since, until the reader picks one (6d)
	const base = useRef(revision)
	const [conflict, setConflict] = useState(() => (mine ? { where: 'waited', fromSave: false } : null))
	// a save that found no connection and waits to be sent (6d), and the form as it was then
	const [waiting, setWaiting] = useState(null)
	// a new order whose save went through while the form stayed open: later saves change it
	const [createdAs, setCreatedAs] = useState(null)
	const [folded, setFolded] = useFolded(creating ? 'order-new' : 'order-edit', 'details', true)
	const [reordering, setReordering] = useState(false)
	const [asking, setAsking] = useState(false)
	const [viewing, setViewing] = useState(null)
	const [said, setSaid] = useState('')
	// what the create screen handed over (3a), taken once so a reload or a return does not offer Undo again
	const [created] = useState(() => (!creating && here.state?.created?.id === orderId ? here.state.created : null))
	useEffect(() => {
		if (here.state?.created) navigate(here.pathname, { replace: true, state: null })
	}, [])
	// a save that kept the reader here ends the task: on a phone the tab bar is back until the next change (9h)
	const [rested, setRested] = useState(Boolean(created))
	// a line moved by hand marks the order changed and waits for the save bar (c1)
	const moveLines = next => setLines(ls => {
		const now = new Map(ls.map(l => [l.key, l]))
		const moved = next.map(l => now.get(l.key)).filter(Boolean)
		return [...moved, ...ls.filter(l => !moved.includes(l))]
	})
	const list = useRef(null)
	const column = useRef(null)
	const stacked = useStacked(column)
	// below 900 the line opens in a sheet, as on a phone (1d)
	const sheeted = touch || stacked
	const quietVendor = useRef(false)
	const sheetBox = useRef(null)
	// the heading takes no focus, so a line that waits for a tap opens its sheet with nothing focused
	useFocusTrap(sheetBox, Boolean(sheeted && editing), lineFocus ? '.sp-line-editor__form input' : '.sp-heading')
	// the line or add control whose editor is open, which takes focus back when it closes
	const reopen = useRef(editing?.isNew ? 'add' : editing?.key ?? null)
	const [start, setStart] = useState(seed)
	const staged = useRef(files)
	staged.current = files
	const editingNow = useRef(editing)
	editingNow.current = editing
	const statuses = useStatuses()

	const set = patch => setDraft(d => ({ ...d, ...patch }))
	// an order with status Draft keeps its lines as they are so far (16a): none yet, or one not filled in, waits for later
	const { typeOf } = useStatusTypes()
	const relaxed = typeOf(draft.status) === 'draft'
	const statusDated = statuses.find(s => s.key === draft.status)?.ownDate
	const errors = orderErrors(draft, statusDated)
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
	const refusedPhotos = useRef(new WeakSet())
	// what each photo became once it arrived, for the draft to keep
	const arrived = useRef(new WeakMap())
	const sendPhoto = file => {
		const sent = sendFile(file).catch(e => { if (e?.status === 415) refusedPhotos.current.add(sent); return null })
		setPhotosSending(p => new Set(p).add(sent))
		sent.then(upload => {
			if (upload) arrived.current.set(sent, upload)
			setPhotosSending(p => { const next = new Set(p); next.delete(sent); return next })
		})
		return sent
	}
	const photosOnTheirWay = [...lines.map(l => l.newPhoto), editing?.values.newPhoto].filter(p => p && photosSending.has(p.sent)).length
	// a change kept to send when the connection returns is not lost by leaving (6d), so it does not ask
	const kept = waiting?.at === JSON.stringify({ draft, lines, files: files.map(f => f.key), gone })
	// a new order's steps differ only in the query, so a step away asks as a page away does
	// a copy is unsaved from the start (8a), so leaving it asks until it is saved
	// a new order is kept as a draft, so only a created one asks before its changes are left (3a)
	const guard = useLeaveGuard(dirty && !kept && !(creating && !createdAs), { search: creating, uploading: files.filter(f => f.sending).length + photosOnTheirWay })

	/* ---- lines ---- */

	function newEditing() {
		return { key: freshKey(), isNew: true, values: { title: '', quantity: 1, price: null, retail: null, note: '', url: '', photo: null, newPhoto: null, dropPhoto: false } }
	}
	// the open line is kept as the save keeps it: an untouched new one is dropped, one with errors stays open
	const openLine = line => {
		const untouched = untouchedNew(editing)
		if (editing && !untouched && Object.keys(lineErrors(editing.values)).length) return setEditing(e => ({ ...e, tried: true }))
		if (editing && !untouched) commitInto(editing)
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
			message: phrase('form.removed', { name: shortened(line.title) || phrase('form.theLine') }),
			undo: {
				label: phrase('action.undo'),
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
		setSaid(phrase('form.lineCopied', { name: values.title || phrase('form.theLine') }))
	}
	const moveTo = (key, to) => setLines(ls => {
		const at = ls.findIndex(l => l.key === key)
		if (at < 0 || to < 0 || to >= ls.length || to === at) return ls
		const next = [...ls]
		next.splice(to, 0, next.splice(at, 1)[0])
		return next
	})
	const move = (key, by) => moveTo(key, lines.findIndex(l => l.key === key) + by)

	// a click on a row opens it, as its pencil does (c15)
	const rowClick = ev => {
		const row = ev.target.closest?.('[data-line]')
		if (!row || ev.target.closest('button, input, label, a')) return
		const line = lines.find(l => l.key === row.dataset.line)
		if (line) openLine(line)
	}

	/* ---- attachments, staged until the save ---- */

	// a file is sent when added and filed by the save (17a); a refused or failed one says so on its tile (17b)
	const sends = useRef(back?.sends ?? new Map())
	const patchFile = (key, patch) => setFiles(fs => fs.map(f => (f.key === key ? { ...f, ...patch } : f)))
	const send = record => {
		const sent = sendFile(record.file, { onSent: part => patchFile(record.key, { sent: part }) })
			.then(upload => { patchFile(record.key, { upload, sending: false }); return upload })
			// a file the server cannot open is refused for good, so it says why rather than offering Retry (17b)
			.catch(e => { patchFile(record.key, e?.status === 415 ? { sending: false, problem: phrase('file.unsupported') } : { sending: false, failed: failureMessage(e, '') || phrase('file.uploadFailed') }); return null })
		sends.current.set(record.key, sent)
	}
	const addFiles = (picked, problems) => {
		const records = picked.map((file, i) => ({
			key: freshKey(), file, name: file.name, problem: problems[i], sending: !problems[i], sent: 0,
			// a receipt added to a saved order is asked about once it has arrived (3d)
			ask: !creating && !scan && !problems[i],
			kind: isPdf(file) ? 'pdf' : 'image',
			thumb: /^image\//.test(file.type) ? URL.createObjectURL(file) : null
		}))
		setFiles(fs => [...fs, ...records])
		for (const r of records) if (!r.problem) send(r)
	}
	const [receiptAsked, setReceiptAsked] = useState(null)
	const [comparing, setComparing] = useState(false)
	useEffect(() => {
		if (receiptAsked) return
		const next = files.find(f => f.ask && (f.upload || f.problem || f.failed))
		if (!next) return
		patchFile(next.key, { ask: false })
		if (next.upload) setReceiptAsked(next.key)
	}, [files, receiptAsked])
	const resend = record => {
		patchFile(record.key, { sending: true, sent: 0, failed: null })
		send(record)
	}
	/* Removing only drops a file from what the save files, so Undo always works (17a): one the reader
	   added goes with a toast, one a scan brought asks first, being evidence they cannot take again. */
	const [removing, setRemoving] = useState(null)
	const dropped = useRef([])
	const dropFile = file => {
		setFiles(fs => fs.filter(f => f.key !== file.key))
		if (file.problem || file.failed) {
			if (file.thumb) URL.revokeObjectURL(file.thumb)
			sends.current.delete(file.key)
			return
		}
		dropped.current.push(file)
		const at = files.findIndex(f => f.key === file.key)
		toast({ message: phrase('form.removed', { name: shortened(file.name) }), undo: { label: phrase('action.undo'), onClick: () => setFiles(fs => [...fs.slice(0, at), file, ...fs.slice(at)]) } })
	}
	const removeSaved = file => {
		if (file.fromScan) return setRemoving({ file })
		setGone(g => [...g, file.id])
		toast({ message: phrase('form.removed', { name: shortened(file.name) }), undo: { label: phrase('action.undo'), onClick: () => setGone(g => g.filter(id => id !== file.id)) } })
	}
	// a line's photo, while its line is open or after: the patch lands on whichever holds the line
	const patchLine = (key, patch) => {
		setEditing(e => (e?.key === key ? { ...e, values: { ...e.values, ...patch } } : e))
		setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))
	}
	const removePhoto = (key, values) => {
		const before = { newPhoto: values.newPhoto ?? null, dropPhoto: Boolean(values.dropPhoto), photoProblem: values.photoProblem ?? null }
		const without = { newPhoto: null, dropPhoto: Boolean(values.photo), photoProblem: null }
		if (!values.newPhoto && values.photo?.fromScan) return setRemoving({ photo: { key, name: values.title, without } })
		patchLine(key, without)
		toast({ message: phrase('form.photoRemoved', { name: shortened(values.title) || phrase('form.theLineLower') }), undo: { label: phrase('action.undo'), onClick: () => patchLine(key, before) } })
	}
	// the same bytes already on the order or added just before, or one with the same name and size:
	// warned on its tile, never refused, since two photos of one thing are fine (17b)
	const twinOf = f => {
		const hash = f.upload?.sha256
		if (hash && saved.some(s => !gone.includes(s.id) && s.sha256 === hash)) return true
		const earlier = files.slice(0, files.indexOf(f))
		return earlier.some(o => !o.problem && ((hash && o.upload?.sha256 === hash) || (o.file && f.file && o.file.name === f.file.name && o.file.size === f.file.size)))
	}
	const keptAway = useRef(false)
	useEffect(() => () => {
		if (keptAway.current) return
		for (const f of [...staged.current, ...dropped.current]) if (f.thumb) URL.revokeObjectURL(f.thumb)
	}, [])
	// everything typed and added goes with the reader to set up the vendor, and comes back with them
	const setUpVendor = () => {
		away = { address, draft, lines, editing, files, suggested, sends: sends.current }
		keptAway.current = true
		guard.release()
		navigate('/vendors/new', { state: { fromScan: { name: draft.vendor, to: address } } })
	}

	/* ---- the vendor ---- */

	// `known` is the vendor the name files under, or null for a name no vendor has yet
	const suggest = (known, vendor, current) => {
		const defaults = known?.defaultCategories ?? []
		const kept = current.filter(c => !suggested?.names.includes(c))
		const missing = defaults.filter(c => !kept.includes(c))
		setSuggested(!kept.length && defaults.length ? { vendor, names: defaults, said: true } : null)
		setOffer(kept.length && missing.length ? { vendor, names: missing } : null)
		return kept.length ? kept : defaults
	}
	// a new order's switch follows its vendor's default until the reader sets it, and a copy keeps its source's (5l)
	const follow = known => (origin.copy || draft.excludeFromStatsSetByHand ? {} : { excludeFromStats: Boolean(known?.defaultExcludeFromStats) })
	// a new order's vendor fills empty categories with its defaults or offers them, and another vendor
	// takes back only what the last one filled in; a saved order is never refilled (5l)
	const pickVendor = async name => {
		// set at once, so a save pressed straight after the field closes already carries it
		if (name.trim() !== draft.vendor) set({ vendor: name.trim() })
		const known = await resolveVendor(name)
		const vendor = known?.name ?? name.trim()
		set({ vendor, ...(creating && vendor !== draft.vendor ? { categories: suggest(known, vendor, draft.categories), ...follow(known) } : {}) })
	}
	// a vendor just set up from this receipt comes back chosen (Vendors 5b)
	const returned = here.state?.pickedVendor
	// a receipt or a link that names the vendor is the first vendor choice
	const seeded = useRef(false)
	useEffect(() => {
		if (seeded.current || !creating || origin.copy) return
		if (returned) { seeded.current = true; pickVendor(returned); return }
		// a form brought back, or kept by its draft, is as the reader left it
		if (back || scan?.form) { seeded.current = true; return }
		if (!draft.vendor) return
		seeded.current = true
		resolveVendor(draft.vendor).then(known => {
			const filled = { categories: suggest(known, draft.vendor, draft.categories), ...follow(known) }
			// filled in before the reader did anything, so it is where the form starts, not a change
			setStart(s => ({ ...s, ...filled }))
			set(filled)
		})
	}, [])
	// how many of the vendor's latest orders carry every category offered, newest first (5l)
	// a receipt's vendor no vendor files under yet can be set up first (5b)
	const scannedVendor = useApi(getVendorPage, [{ name: draft.vendor, pageSize: 0 }], { enabled: Boolean(scan && creating && draft.vendor) })
	const offeredFrom = useApi(getVendorPage, [{ name: offer?.vendor, pageSize: 1, shape: 'brief' }], { enabled: Boolean(offer) }).data?.vendors[0]?.id ?? null
	const carrying = useApi(getVendorOrdersCarrying, [offeredFrom ?? '', offer?.names ?? []], { enabled: Boolean(offer && offeredFrom) }).data?.orders ?? 0
	// a category over its limit carries its dot on an order of this month, or of this year for a yearly limit (8b)
	const overNames = (useApi(getOverLimitCategories).data ?? [])
		.filter(c => draft.date?.slice(0, c.budgetPeriod === 'year' ? 4 : 7) === today().slice(0, c.budgetPeriod === 'year' ? 4 : 7)).map(c => c.name.toLowerCase())
	const trails = Object.fromEntries(draft.categories.filter(n => overNames.includes(n.toLowerCase())).map(n => [n, <OverLimitDot key={n} />]))
	// a category taken out of the field is not offered again on this order
	const [dismissed, setDismissed] = useState([])
	const setCategories = categories => {
		setSuggested(s => (s ? { ...s, names: s.names.filter(c => categories.includes(c)), said: false } : s))
		setDismissed(d => [...new Set([...d, ...draft.categories.filter(n => !categories.includes(n))])])
		set({ categories })
	}

	/* ---- category suggestions: from earlier orders by themselves, from a model when asked (3a, 1d) ---- */
	const [fromItems, setFromItems] = useState([])
	// null, 'looking', or the model's answer: { suggestions, failure }
	const [asked, setAsked] = useState(null)
	const titles = lines.map(l => String(l.title ?? '').trim()).filter(Boolean)
	const titlesKey = JSON.stringify(titles)
	const taken = [...draft.categories, ...dismissed]
	const takenKey = JSON.stringify(taken)
	useEffect(() => { setAsked(null) }, [titlesKey])
	useEffect(() => {
		if (!titles.length) { setFromItems([]); return undefined }
		let live = true
		const timer = setTimeout(() => {
			getCategorySuggestions({ items: titles, vendor: draft.vendor, exclude: taken })
				.then(r => { if (live) setFromItems(r.suggestions) }).catch(() => { if (live) setFromItems([]) })
		}, 500)
		return () => { live = false; clearTimeout(timer) }
	}, [titlesKey, takenKey, draft.vendor])
	const fresh = list => list.filter(sg => !taken.some(n => n.toLowerCase() === sg.name.toLowerCase()))
	const scanFound = fresh(scan?.suggestions ?? []).length > 0
	const suggestions = (asked && asked !== 'looking' ? fresh(asked.suggestions)
		: [...fresh(scan?.suggestions ?? []), ...fresh(fromItems)]).filter((sg, i, all) => all.findIndex(o => o.name.toLowerCase() === sg.name.toLowerCase()) === i).slice(0, 3)
	const askModel = () => {
		if (asked === 'looking') return
		if (!titles.length) { setAsked({ suggestions: [], failure: null }); return }
		setAsked('looking')
		getCategorySuggestions({ items: titles, vendor: draft.vendor, exclude: taken, model: true })
			.then(r => setAsked(r)).catch(() => setAsked({ suggestions: [], failure: 'failed' }))
	}
	const takeSuggestion = sg => {
		if (!sg.isNew) { setCategories([...draft.categories, sg.name]); return }
		createCategory(sg.name)
			.then(made => { invalidateCategoryData(); setCategories([...draft.categories, made.name]) })
			.catch(e => {
				// a category made meanwhile is the one meant
				if (e?.status === 409) setCategories([...draft.categories, sg.name])
				else toast({ message: failureMessage(e, phrase('form.categoryNotCreated')), color: 'danger' })
			})
	}
	const bulb = scanFound ? undefined : (
		<IconButton variant="bare" size="field" icon={asked === 'looking' ? <Spinner /> : 'bulb'} aria-label={phrase('form.suggest')} title={phrase('form.suggest')}
			{...(asked === 'looking' ? { 'aria-busy': 'true' } : {})} onClick={askModel} />
	)
	const suggestionRow = asked === 'looking' ? <span className="sp-meta">{phrase('form.looking')}</span>
		: asked?.failure ? <span className="sp-meta">{phrase('form.noSuggestService')}</span>
			: asked && !suggestions.length ? <span className="sp-meta">{phrase('form.noSuggestions')}</span>
				: suggestions.length
					? (
						<div className="sp-row-flex sp-wrap sp-gap-6">
							<span className="sp-meta">{phrase('form.suggested')}</span>
							{suggestions.map(sg => (
								<Chip key={sg.name} variant="suggestion" onClick={() => takeSuggestion(sg)}>{sg.isNew ? phrase('form.suggestNew', { name: sg.name }) : `+ ${sg.name}`}</Chip>
							))}
						</div>
					)
					: null
	// the date a pick filled in, until it is changed: the help line says it was not typed
	const [filled, setFilled] = useState(null)
	const setStatus = status => {
		const fills = statuses.find(s => s.key === status)?.ownDate && !draft.statusDates?.[status]
		setFilled(fills ? status : null)
		set({ status, ...(fills ? { statusDates: { ...draft.statusDates, [status]: today() } } : {}) })
	}

	/* ---- save ---- */

	// Discard throws a new order away on purpose; Cancel on a saved one asks first, as the other forms do
	const leave = () => {
		if (creating || lost) guard.release()
		if (onLeave) onLeave()
		else navigate(creating ? '/orders/new' : lost ? listAddress : `/orders/${orderId}`)
	}

	// what a waiting save is measured against: the form as it was when the save was asked for
	const now = useRef(null)
	now.current = { draft, lines, files, gone }
	const snapshot = () => JSON.stringify({ draft: now.current.draft, lines: now.current.lines, files: now.current.files.map(f => f.key), gone: now.current.gone })
	const creatingNow = creating && !createdAs

	/** The save as a plan `writeOrder` carries out, now or once the connection returns. */
	const planOf = (target, kept) => ({
		key: newSaveKey(), creating: creatingNow, orderId: createdAs ?? orderId, revision: creatingNow ? null : base.current,
		body: { ...apiDraft(target, kept, new Set(statuses.filter(s => s.ownDate).map(s => s.key))), ...(draftNow.current && creatingNow ? { draftId: draftNow.current } : {}) },
		scan: scan && creatingNow ? { documentKey: scan.documentKey, vendor: scan.vendor } : null,
		gone,
		photos: kept.map((l, index) => ({
			index, name: l.newPhoto?.file.name ?? (keptPhoto(l) ? l.photo.name : null), file: l.newPhoto?.file ?? null, sent: l.newPhoto?.sent ?? null,
			upload: keptPhoto(l) ? { key: l.photo.key } : null,
			// a copied line's photo belongs to the order it came from: it is copied in, never changed there
			oldId: l.copiedFrom ? null : l.photo?.id ?? null, oldName: l.copiedFrom ? null : l.photo?.name ?? null, drop: Boolean(l.dropPhoto),
			copy: creatingNow && l.copiedFrom && !l.newPhoto && !l.dropPhoto && !keptPhoto(l) ? { fromOrderId: l.copiedFrom.orderId, attachmentId: l.copiedFrom.attachmentId, name: l.photo?.name ?? phrase('form.aPhoto') } : null
		})),
		files: files.map(f => ({
			name: f.name, problem: f.problem ?? null, file: f.file, upload: f.upload ?? null,
			sending: f.upload ? null : sends.current.get(f.key) ?? null
		})),
		label: target.vendor.trim(),
		// what reopens the form if the save, sent later, finds the order changed meanwhile
		form: { orderId: createdAs ?? orderId, draft: { ...target, lines: undefined }, lines: kept.map(({ newPhoto, ...l }) => l) }
	})

	// the orders the dialog in 3c already showed for this scan or form
	const answered = useRef(new Set(origin.shownOrders ?? []))
	const [repeats, setRepeats] = useState(null)
	const save = async () => {
		const target = draft
		const loose = typeOf(target.status) === 'draft'
		setTried(true)
		let current = lines
		const untouched = untouchedNew(editing)
		reopen.current = null
		if (untouched) setEditing(null)
		else if (editing) {
			if (!loose && Object.keys(lineErrors(editing.values)).length) {
				setEditing(e => ({ ...e, tried: true }))
				return afterDraw(() => focusFirst('.sp-line-editor'))
			}
			current = editing.isNew
				? [...lines, { ...editing.values, key: editing.key, include: true }]
				: lines.map(l => (l.key === editing.key ? { ...editing.values, uncertain: false } : l))
			setLines(current)
			setEditing(null)
		}
		if (Object.keys(orderErrors(target, statuses.find(s => s.key === target.status)?.ownDate)).length) {
			setFolded(false, { keep: false })
			return afterDraw(() => focusFirst('[data-details]', quietVendor))
		}
		const kept = current.filter(l => l.include !== false)
		if (!loose) {
			const broken = kept.find(l => Object.keys(lineErrors(l)).length)
			if (broken) {
				setEditing({ key: broken.key, isNew: false, values: { ...broken }, tried: true })
				return afterDraw(() => focusFirst('.sp-line-editor'))
			}
			if (!kept.length) return afterDraw(() => focusFirst('[data-add]'))
		}
		// an order that looks like one you have asks first, and once for the same orders (3c)
		const vendorNow = target.vendor.trim()
		const totalNow = Math.round(totalsOf(kept, target.shipping, target.discount).total * 100) / 100
		if (vendorNow && /^\d{4}-\d{2}-\d{2}$/.test(target.date ?? '') && totalNow > 0) {
			const alike = await getOrderLookalike(vendorNow, target.date, totalNow, createdAs ?? orderId ?? '').catch(() => null)
			const fresh = alike?.orders.filter(o => !answered.current.has(o.id)) ?? []
			if (fresh.length) return setRepeats({ count: alike.count - (alike.orders.length - fresh.length), orders: fresh, self: { vendor: vendorNow, date: target.date, total: totalNow } })
		}
		// a draft still being made is the one this order is created from
		clearTimeout(keepSoon.current)
		if (making.current) await making.current
		const plan = planOf(target, kept)
		// the form as this save takes it, which leaving can then keep (see `kept` above)
		const at = JSON.stringify({ draft, lines: current, files: files.map(f => f.key), gone })
		// saving again while an earlier save waits sends this one in its place
		if (waiting) dropSave(waiting.plan.key)
		setWaiting(null)
		setSaving(true)
		const outcome = await writeOrder(plan)
		setSaving(false)
		settle(plan, outcome, at)
	}

	const offline = () => ({
		title: phrase(navigator.onLine === false ? 'form.offline' : 'form.connectionFailed'),
		message: phrase('form.keptForLater'),
		color: 'danger',
		undo: { label: phrase('form.retryNow'), onClick: retryNow }
	})
	// Retry now that still finds no connection says so again; one that works answers through settle
	const retryNow = () => flushOutbox().then(() => { if (waitingSaves().some(w => w.state === 'waiting' && owned.current === w.key)) toast(offline()) })
	const owned = useRef(null)

	/** Where one save ends: on the saved order, or still here with what stopped it. */
	const settle = (plan, outcome, at) => {
		if (outcome.kind === 'offline') {
			queueSave(plan)
			owned.current = plan.key
			setWaiting({ plan, at })
			toast(offline())
			return
		}
		owned.current = null
		setWaiting(null)
		if (outcome.kind === 'conflict') return setConflict({ theirs: outcome.theirs, where: 'elsewhere', fromSave: true })
		if (outcome.kind === 'gone') return setLost(outcome.message)
		if (outcome.kind === 'refused') return outcome.message ? toast({ message: outcome.message, color: 'danger' }) : undefined
		landed(plan, outcome)
	}
	const settleNow = useRef(settle)
	settleNow.current = settle

	const landed = (plan, { order, lapse }) => {
		base.current = order.revision ?? null
		// the form changed while its save waited: what was sent is saved, and the rest stays here to save
		if (waiting?.plan.key === plan.key && waiting.at !== snapshot()) {
			if (plan.creating) setCreatedAs(order.id)
			setStart({ ...plan.form.draft, lines: now.current.lines })
			toast({ message: phrase('form.waitedSaved') })
			return
		}
		if (lapse) toast({ message: lapse, color: 'danger' })
		else if (!plan.creating) toast({ message: phrase('form.saved') })
		if (plan.creating) {
			// a new order becomes this screen saved, at its own address, with the notice that can undo it (3a)
			guard.release()
			finished.current = true
			const made = { id: order.id, file: scan?.file.name ?? null, documentKey: scan?.documentKey ?? null, reference: draft.reference }
			return navigate(`/orders/${order.id}/edit`, { replace: true, state: { created: made } })
		}
		// a save keeps the reader here (16a), on the order as the server now holds it, files included
		setSaving(true)
		getOrder(order.id).catch(() => order).then(fresh => {
			setSaving(false)
			base.current = fresh.revision ?? null
			const seen = draftOf(fresh)
			for (const f of files) if (f.thumb) URL.revokeObjectURL(f.thumb)
			setStart(seen)
			setDraft({ ...seen, lines: undefined })
			setLines(seen.lines)
			setGone([])
			setFiles([])
			setSaved(savedFilesOf(fresh))
			setTried(false)
			setRested(true)
		})
	}

	// the waiting save's outcome comes back here while the form is open, and to the shell once it is not
	useEffect(() => (waiting ? ownSave(waiting.plan.key, outcome => settleNow.current(waiting.plan, outcome)) : undefined), [waiting])
	// a waiting save shows as being sent while it is
	useEffect(() => (waiting
		? watchOutbox(() => setSaving(waitingSaves().some(w => w.key === waiting.plan.key && w.state === 'sending')))
		: undefined), [waiting])

	/* ---- a draft, kept as it is edited (3a) ---- */

	// created or discarded: nothing is left to keep
	const finished = useRef(false)
	const keptAs = useRef(null)
	const keepSoon = useRef(0)
	// the draft an order made here is becoming, while it is asked for
	const making = useRef(null)
	const alive = useRef(true)
	const goneSoon = useRef(0)
	// the form as on screen: an open line as it stands once changed, and the files and photos that have arrived
	const keptForm = () => {
		const { draft: values, lines: rows, files: added } = now.current
		const open = editingNow.current
		const changed = open && !untouchedNew(open) && (open.isNew || JSON.stringify(open.values) !== JSON.stringify(rows.find(l => l.key === open.key)))
		const all = !changed ? rows
			: open.isNew ? [...rows, { ...open.values, key: open.key, include: true, uncertain: false }]
				: rows.map(l => (l.key === open.key ? { ...open.values, uncertain: false, checked: true } : l))
		return {
			values: { ...values, lines: undefined },
			lines: all.map(({ newPhoto, dropPhoto, photoProblem, ...l }) => {
				const upload = newPhoto?.sent && arrived.current.get(newPhoto.sent)
				return { ...l, photo: upload ? { key: upload.key, name: newPhoto.file.name, hasThumbnail: Boolean(upload.hasThumbnail) } : dropPhoto ? null : l.photo ?? null }
			}),
			files: added.flatMap(f => {
				const upload = f.upload ?? arrived.current.get(sends.current.get(f.key))
				return upload ? [{ key: upload.key, name: f.name, kind: f.kind, hasThumbnail: Boolean(upload.hasThumbnail), sha256: upload.sha256 ?? null }] : []
			}),
			...(origin.copy ? { origin: { copy: origin.copy } } : {})
		}
	}
	// an order made here, or a scan, becomes a draft at its first change, and not before (3a); answers its id, or null
	const becomeDraft = ({ keepalive = false } = {}) => {
		if (draftNow.current) return Promise.resolve(draftNow.current)
		if (!making.current) {
			if (!creating || !dirtyNow.current) return Promise.resolve(null)
			const form = keptForm()
			// a scan's draft starts empty and is given the form by keep()
			making.current = (scan ? makeScanDraft(scan.documentKey) : makeDraft(form, { keepalive })).then(made => {
				draftNow.current = made.id
				if (!scan) keptAs.current = JSON.stringify(form)
				if (alive.current) { setDraftId(made.id); onDraft?.(made.id) }
				return made.id
			}, () => { making.current = null; return null })
		}
		return making.current
	}
	// answers whether the draft holds the form now: true, false, or null when there is no draft to keep it in
	const keep = async ({ keepalive = false } = {}) => {
		if (finished.current) return null
		const id = await becomeDraft({ keepalive })
		if (!id || finished.current) return null
		const form = keptForm()
		const text = JSON.stringify(form)
		if (text === keptAs.current) return true
		return keepDraft(id, form, { keepalive }).then(() => { keptAs.current = text; return true }, e => (e?.status === 404 ? null : false))
	}
	useEffect(() => { keptAs.current = JSON.stringify(keptForm()) }, [])
	useEffect(() => {
		if (!creating) return
		clearTimeout(keepSoon.current)
		keepSoon.current = setTimeout(keep, KEEP_MS)
	}, [draft, lines, files, editing, photosSending])
	useEffect(() => {
		if (!creating) return undefined
		const hide = () => { keep({ keepalive: true }) }
		window.addEventListener('pagehide', hide)
		return () => window.removeEventListener('pagehide', hide)
	}, [])
	// leaving keeps the draft as it is, files still on their way included, and says so (3a); a page
	// that comes straight back (a remount, not a visit away) has not left
	useEffect(() => {
		alive.current = true
		clearTimeout(goneSoon.current)
		return () => {
			alive.current = false
			goneSoon.current = setTimeout(() => {
				if (!creating || finished.current) return
				clearTimeout(keepSoon.current)
				const pending = [...sends.current.values(), ...[...now.current.lines, editingNow.current?.values ?? {}].map(l => l.newPhoto?.sent)].filter(Boolean)
				Promise.all(pending).then(() => keep()).then(held => {
					if (held === null) return
					invalidateDraftData()
					if (!keptAway.current) toast(held ? { message: phrase('form.keptDraft') } : { message: phrase('form.draftNotKept'), color: 'danger' })
				})
			}, 0)
		}
	}, [])
	// Discard (6d): the draft and what it holds go, then the form closes
	const throwAway = async () => {
		finished.current = true
		clearTimeout(keepSoon.current)
		const id = draftNow.current ?? await making.current
		if (id) await discardDraft(id).catch(() => {})
		// a scan that was never changed has no draft yet, only its file
		else if (scan) await discardScanDocument(scan.documentKey).catch(() => {})
		leave()
	}
	// the files and photos an order made here would take with it, by the names the reader knows them by
	const ownFiles = () => [
		...files.filter(f => !f.problem).map(f => f.name),
		...lines.filter(l => (l.newPhoto && !l.dropPhoto) || keptPhoto(l)).map(l => phrase('form.photoOf', { name: shortened(l.title) || phrase('form.aLine') }))
	]
	// a draft with nothing but its form goes at once, and Undo brings it back as it was (6d, 6f)
	const dropDraft = async () => {
		const form = keptForm()
		await throwAway()
		toast({ message: phrase('form.draftDiscarded'), undo: { label: phrase('action.undo'), onClick: () => makeDraft(form).then(made => navigate(`/orders/new?draft=${made.id}`)) } })
	}

	/* ---- another copy of the order (6d) ---- */

	// the reader's own copy, set aside by See theirs so Undo can bring it back
	const adopt = (theirs, said) => {
		const seen = draftOf(theirs)
		const kept = { draft, lines, gone, files }
		base.current = theirs.revision ?? null
		const ownLines = editing && !Object.keys(lineErrors(editing.values)).length
			? (editing.isNew ? [...lines, { ...editing.values, key: editing.key, include: true }] : lines.map(l => (l.key === editing.key ? { ...editing.values } : l)))
			: lines
		setStart(seen)
		setDraft({ ...seen, lines: undefined })
		setLines(withOwnLines(seen.lines, start.lines, ownLines))
		setGone([])
		setFiles([])
		setEditing(null)
		setSaved(savedFilesOf(theirs))
		setConflict(null)
		if (said) toast({
			message: said,
			undo: { label: phrase('action.undo'), onClick: () => { setDraft(kept.draft); setLines(kept.lines); setGone(kept.gone); setFiles(kept.files) } }
		})
	}
	const seeTheirs = () => {
		if (stuck) dropSave(stuck.key)
		if (conflict.theirs) return adopt(conflict.theirs, phrase(conflict.where === 'tab' ? 'form.showingTab' : 'form.showingElsewhere'))
		// brought back from a waiting save: theirs is what the form opened on
		setDraft({ ...start, lines: undefined })
		setLines(start.lines)
		setConflict(null)
	}
	const keepMine = () => {
		if (stuck) dropSave(stuck.key)
		if (conflict.theirs) base.current = conflict.theirs.revision ?? null
		setConflict(null)
		save()
	}
	// a save in flight or waiting is the form's own change, not another copy's
	const busy = useRef(false)
	busy.current = saving || Boolean(waiting)
	const dirtyNow = useRef(dirty)
	dirtyNow.current = dirty
	useEffect(() => {
		if (creating || !orderId) return
		let asked = 0
		const check = async where => {
			if (busy.current) return
			asked = Date.now()
			const theirs = await getOrder(orderId).catch(e => { if (e.gone) setLost(e.message); return null })
			if (!theirs || theirs.revision == null || theirs.revision === base.current || busy.current) return
			// nothing here to keep: the form simply shows the newer copy
			if (!dirtyNow.current) return adopt(theirs, null)
			setConflict(c => (c?.fromSave ? { ...c, theirs } : { theirs, where: c?.where === 'tab' || c?.where === 'waited' ? c.where : where, fromSave: false }))
		}
		// a change brought back from waiting is weighed against the order as it is now, not as last read here
		if (stuck) check('waited')
		const off = onOrderSavedElsewhere(news => {
			if (!news.ids?.includes(orderId)) return
			if (news.gone) return setLost(phrase('form.deletedInTab'))
			if (news.revision !== base.current) check('tab')
		})
		// another device says nothing, so the form asks when the reader comes back to it, at most every 10 seconds
		const back = () => { if (document.visibilityState === 'visible' && Date.now() - asked > 10000) check('elsewhere') }
		window.addEventListener('focus', back)
		document.addEventListener('visibilitychange', back)
		return () => {
			off()
			window.removeEventListener('focus', back)
			document.removeEventListener('visibilitychange', back)
		}
	}, [orderId])

	// a scan's Discard always asks, since its file goes with it; an order made here asks only when files or
	// photos go too, and closes as it is before its first change (6d)
	const discard = () => {
		if (!creating) return leave()
		if (scan) return setAsking(true)
		if (!draftNow.current && !making.current && !dirty) return leave()
		return ownFiles().length ? setAsking(true) : dropDraft()
	}

	/* ---- the parts ---- */

	// what the viewer walks (17b): the attachments, saved then staged, then the lines' photos
	const receipt = scan ? receiptOf(scan.file) : null
	const viewable = [
		...(receipt ? [receipt] : []),
		...saved.filter(f => !gone.includes(f.id)).map(f => ({
			key: f.id, name: f.name, kind: f.kind,
			src: f.kind === 'pdf' ? attachmentPageUrl(orderId, f.id, 0) : attachmentFileUrl(orderId, f.id),
			zoomSrc: f.kind === 'pdf' ? undefined : attachmentDownloadUrl(orderId, f.id),
			download: attachmentDownloadUrl(orderId, f.id),
			...pagesOf(orderId, f)
		})),
		...files.filter(f => !f.problem).map(f => ({ key: f.key, name: f.name, kind: f.kind, src: f.thumb ?? (f.upload ? (f.kind === 'pdf' ? scanPageUrl(f.upload.key, 0) : scanFileUrl(f.upload.key)) : null) })),
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
				focus={lineFocus}
				sheet={sheeted}
				photoUrl={photoUrl}
				sendPhoto={sendPhoto}
				refused={sent => refusedPhotos.current.has(sent)}
				onRemovePhoto={values => removePhoto(editing.key, values)}
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
		// a name read only in part asks for a spelling check, not a value check (3a)
		const spelling = line.uncertain && line.unclearPart === 'title'
		const warn = (line.uncertain && !spelling) || (tried && !relaxed && Object.keys(lineErrors(line)).length)
		const named = line.title || phrase('form.unnamedLower')
		// a line as the receipt gave it says how well it was read (3a); once checked it reads as any line
		const asRead = scan && !touch && !line.checked && scan.lines.some(r => r.id === line.key)
		const subtitle = warn ? phrase(line.uncertain ? UNCLEAR_LINE[line.unclearPart] ?? UNCLEAR_LINE.line : UNCLEAR_LINE.line)
			: spelling ? phrase(UNCLEAR_LINE.title) : asRead ? phrase('form.readClearly') : lineMetaWith(line, photo, scan || touch)
		const ink = warn ? 'sp-ink-warning' : asRead && !spelling ? 'sp-ink-success' : null
		// a price read badly is typed over in the row itself (3a); the field stays while it has focus
		const priceField = scan && !touch && line.unclearPart === 'price' && scan.lines.some(r => r.id === line.key)
		const words = (
			<span className="sp-stacked or-line">
				<span className="sp-title sp-truncate">{line.title || phrase('form.unnamed')}</span>
				<span className={['sp-subtitle', touch ? null : 'sp-truncate', ink].filter(Boolean).join(' ')}>{subtitle}</span>
			</span>
		)
		const text = (
			<>
				{words}
				{priceField
					? <>
						<span className="sp-subtitle sp-nowrap">{quantity(Number(line.quantity) || 0)} ×</span>
						<span className="sp-stacked sp-cell-amount">
							<span className="sp-field__wrap oc-amount-field">
								<NumberField unit value={line.price} min={0} locale={NUMBER_LOCALE} placeholder={amount(0)} aria-label={phrase('form.priceOf', { name: named })}
									{...(warn ? { 'data-color': 'warning' } : {})}
									onChange={price => setLines(ls => ls.map(l => (l.key === line.key ? { ...l, price, uncertain: false, checked: true } : l)))} />
								<span className="sp-field__unit">{currencySymbol()}</span>
							</span>
						</span>
					</>
					: <>
						{asRead && !touch && line.price != null ? <span className="sp-subtitle sp-nowrap">{lineMeta(line, true)}</span> : null}
						{line.price == null ? <span className="sp-subtitle sp-nowrap">{phrase('form.noPrice')}</span> : <LineAmount line={line} compact />}
					</>}
			</>
		)
		const pencil = <IconButton variant="outline" icon="pencil" aria-label={phrase('form.edit', { name: named })} data-edit="" onClick={() => openLine(line)} />
		// a phone's scan review is a list to tick (7b); the row itself opens the line, as every phone row does (1c)
		if (touch && scan)
			return (
				<ListItem key={line.key} data-line={line.key} color={warn ? 'warning' : 'default'} opens
					mark={<Include line={line} setLines={setLines} />}>
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
				color={warn ? 'warning' : 'default'}
				opens={!touch && !reordering}
				// a phone's Reorder mode has the handle and the two buttons, both (1c)
				handle={scan ? undefined : <Icon name="grip-vertical" size={14} />}
				handleLabel={phrase('form.reorderLine', { name: named, at: at + 1, count: lines.length })}
				mark={scan ? <><Include line={line} setLines={setLines} />{mark}</> : mark}
				actions={reordering
					? <>
						<IconButton variant="outline" icon="chevron-up" aria-label={phrase('form.moveLineUp', { name: named })} disabled={at === 0} onClick={() => move(line.key, -1)} />
						<IconButton variant="outline" icon="chevron-down" aria-label={phrase('form.moveLineDown', { name: named })} disabled={at === lines.length - 1} onClick={() => move(line.key, 1)} />
					</>
					: <>
						{pencil}
						{scan ? null : <IconButton variant="outline" icon="copy" aria-label={phrase('form.duplicateLine', { name: named })} onClick={() => duplicateLine(line)} />}
						{scan ? null : <IconButton variant="outline" danger icon="trash" aria-label={phrase('form.deleteLine', { name: named })} onClick={() => removeLine(line)} />}
					</>}
			>
				{/* on a phone the two move buttons need the row's width, so the amount steps aside while reordering */}
				{touch ? words : text}
			</ListItem>
		)
	}

	const brokenCount = tried && !relaxed ? lines.filter(l => l.include !== false && Object.keys(lineErrors(l)).length).length : 0
	// what the head says beside the lines: what needs attention first, then how to use the list
	const itemsAside = brokenCount
		? phrase('form.attention', { count: brokenCount })
		: scan
			? (lines.length ? phrase('form.untick') : undefined)
			: touch
				? undefined
				: origin.copy
					? phrase('form.copyAside', { date: shortDate(draft.date), dot, status: statuses.find(s => s.key === draft.status)?.name ?? draft.status })
					: (lines.length > 1 ? phrase('form.dragHint') : undefined)
	const itemsHead = (
		<CardHeader name={phrase(scan ? 'form.linesFound' : 'order.items') + dot + lines.length} aside={itemsAside} asideTone={brokenCount ? 'danger' : 'default'}
			actions={!brokenCount && !scan && touch && lines.length > 1 ? [{ label: phrase(reordering ? 'action.done' : 'form.reorder'), onClick: () => setReordering(r => !r) }] : undefined} />
	)

	const printed = scan?.total ?? null
	const mismatch = printed != null && Math.abs(printed - sums.total) >= 0.005
	const itemsCard = (
		<Card>
			{itemsHead}
			<div className="sp-stack sp-gap-8" ref={list} onClick={touch && !scan ? undefined : rowClick}>
				<Announce>{said}</Announce>
				<ReorderList items={lines} keyOf={line => line.key} nameOf={line => line.title || phrase('form.unnamed')} onMove={moveLines}>
					{line => (editing && !sheeted && editing.key === line.key ? editor : lineRow(line))}
				</ReorderList>
				{!lines.length && !(editing?.isNew) && tried
					? (
						<Empty dashed>
							<span className="sp-heading sp-ink-accent">{phrase('form.firstItem')}</span>
							<span className="sp-meta">{phrase('form.needsLine')}</span>
						</Empty>
					)
					: null}
				{editing?.isNew && !sheeted
					? editor
					: scan && !touch
						? null
						: (
							<ListItem variant="add" onClick={openNew} data-add="" handle={!touch}
								mark={<Mark size="medium" fill="add" aria-label={phrase('action.add')} aria-hidden="true"><Icon name="plus" /></Mark>}>
								<span className="sp-title">{phrase(scan ? 'form.addMissed' : 'form.addItem')}</span>
							</ListItem>
						)}
			</div>
			{scan && !touch
				? (
					<div className="sp-row-flex sp-gap-12">
						{editing?.isNew ? null : <Button variant="outline" size="small" iconStart="plus" data-add="" onClick={openNew}>{phrase('form.addMissed')}</Button>}
						<span className="sp-grow" />
						<span className="sp-subtitle">{phrase('form.linesShipping', { lines: money(sums.paid), dot, shipping: money(draft.shipping || 0) })}</span>
					</div>
				)
				: null}
			{mismatch
				? (
					<ListItem color="warning" count="!"
						actions={<Button variant="outline" size="small" onClick={() => open('receipt')}>{phrase('form.compare')}</Button>}>
						<span className="sp-data sp-ink-warning">
							{phrase('form.mismatch', { total: money(sums.total), printed: money(printed), b: words => <strong className="sp-strong">{words}</strong> })}
						</span>
					</ListItem>
				)
				: null}
		</Card>
	)

	const shownFiles = saved.filter(f => !gone.includes(f.id))
	const picker = useRef(null)
	const receiptPages = receipt?.pages > 1 ? plural(receipt.pages, 'page') : null
	// on a phone the receipt is its own card above the details (7b); elsewhere it is the first attachment (3a)
	const attachmentsCard = scan && touch
		? (
			<Card>
				<ListItem onClick={() => open('receipt')} aria-label={phrase('form.openReceipt', { name: scan.file.name })}
					mark={<Mark size="medium" fill={scan.file.hasThumbnail ? 'photo' : 'none'} text={scan.file.kind === 'pdf' && scan.file.hasThumbnail ? 'PDF' : undefined} aria-hidden="true" aria-label={phrase('repeats.receipt')}>
						{scan.file.hasThumbnail ? <img src={scanThumbnailUrl(scan.file.key)} alt="" /> : <span>{scan.file.kind === 'pdf' ? 'PDF' : 'IMG'}</span>}
					</Mark>}>
					<span className="sp-stacked sp-grow">
						<span className="sp-title sp-truncate">{receiptPages ? phrase('form.receiptPages', { pages: receiptPages }) : phrase('repeats.receipt')}</span>
						<span className="sp-subtitle">{phrase('form.tapFull')}</span>
					</span>
				</ListItem>
			</Card>
		)
		: (
			<Card>
				<CardHeader name={phrase('order.attachments') + dot + ((receipt ? 1 : 0) + shownFiles.length + files.length)} />
				{/* a copy of an order with files starts with none (8a): the row offers them until one is added */}
				{origin.copy?.files && !shownFiles.length && !files.length
					? (
						<ListItem variant="outline" actions={<>
							<Button variant="outline" size="small" onClick={() => picker.current?.click()}>{phrase('form.addFiles')}</Button>
							<input ref={picker} type="file" name="attachments" accept={FILE_TYPES} multiple hidden tabIndex={-1}
								onChange={async ev => { const picked = [...ev.target.files]; ev.target.value = ''; addFiles(picked, await Promise.all(picked.map(f => sniffedProblem(f)))) }} />
						</>}>
							<span className="sp-data">{phrase('form.receiptNotCopied')}</span>
						</ListItem>
					)
					: <Strip>
						{receipt
							? <AttachmentTile key="receipt" name={scan.file.name} kind={scan.file.kind} bare={touch}
								thumb={scan.file.hasThumbnail ? scanThumbnailUrl(scan.file.key) : null} onOpen={() => open('receipt')} />
							: null}
						{shownFiles.map(f => (
							<AttachmentTile key={f.id} name={f.name} kind={f.kind} thumb={f.thumb} bare={touch}
								onOpen={() => open(f.id)} onRemove={() => removeSaved(f)} />
						))}
						{files.map(f => (
							<AttachmentTile key={f.key} name={f.name} kind={f.kind} bare={touch}
								thumb={f.thumb ?? (f.upload?.hasThumbnail ? scanThumbnailUrl(f.upload.key) : null)}
								problem={f.problem ?? (f.failed ? phrase('file.uploadFailed') : undefined)}
								sending={f.sending ? f.sent : undefined}
								twin={!f.problem && !f.failed && twinOf(f)}
								onOpen={f.problem || f.sending ? undefined : f.failed ? () => resend(f) : () => open(f.key)}
								onRemove={() => dropFile(f)} />
						))}
						<AttachmentAdd onFiles={addFiles} />
					</Strip>}
			</Card>
		)

	const fixCount = Object.keys(shown).length
	// a note beside a value the receipt gave, while it is still the value read (3a)
	const lookAt = field => (scan?.unclear?.includes(field) && draft[field] === asRead[field] ? { note: phrase('form.note.look'), noteType: 'warning' } : {})
	const vendorNote = !scan || !scan.vendor || draft.vendor !== asRead.vendor ? {}
		: scan.unclear?.includes('vendor') ? lookAt('vendor')
			: scan.vendorMatched ? { note: phrase('form.note.matched'), noteType: 'success' } : { note: phrase('form.note.newVendor') }
	const statsSwitch = useId()
	const fields = (
		<>
			<Field label={phrase('field.vendor')} {...vendorNote} {...problem(shown.vendor)}>
				<VendorPicker recent={recentVendors} value={draft.vendor} onPick={pickVendor} quiet={quietVendor} autoFocus={vendorFirst && !touch} />
			</Field>
			{scan && creating && draft.vendor && scannedVendor.data && !scannedVendor.loading && !scannedVendor.data.matched
				? <NewVendorFromScan onSetUp={setUpVendor} />
				: null}
			<div className="sp-fields">
				<Field label={phrase('field.date')} {...lookAt('date')} {...(shown.date ? problem(shown.date) : ahead(draft.date))}>
					<DateField value={draft.date} danger={!!shown.date} locale={activeLocaleCode()}
						onChange={date => set({ date })} />
				</Field>
				<Field label={phrase('field.kind')} {...problem(shown.kind)}>
					<KindPicker value={draft.kind} onPick={kind => set({ kind })} />
				</Field>
			</div>
			<Field label={phrase('field.status')}>
				<Combobox value={statuses.find(s => s.key === draft.status)?.name ?? draft.status}>
					{statuses.map(s => (
						<ComboboxOption key={s.key} dot={DOT[s.tone]} selected={s.key === draft.status} onSelect={() => setStatus(s.key)}>{s.name}</ComboboxOption>
					))}
				</Combobox>
			</Field>
			{statusDated
				? (
					<Field label={statuses.find(s => s.key === draft.status)?.name ?? draft.status}
						{...(errors.statusDate ? problem(errors.statusDate) : filled === draft.status ? { message: phrase('form.statusToday') } : ahead(draft.statusDates?.[draft.status] ?? ''))}>
						<DateField value={draft.statusDates?.[draft.status] ?? ''} danger={!!errors.statusDate} locale={activeLocaleCode()}
							onChange={date => { setFilled(null); set({ statusDates: { ...draft.statusDates, [draft.status]: date } }) }} />
					</Field>
				)
				: null}
			<Field label={phrase('field.categories')} message={suggested?.said ? phrase('form.filledFrom', { vendor: suggested.vendor }) : undefined}>
				<CategoryTokens value={draft.categories} onChange={setCategories} trails={trails} end={bulb} placeholder={phrase('form.addCategory')} />
			</Field>
			{suggestionRow}
			{offer
				? (
					<>
						<Alert mark="!" title={phrase('form.offer.title', { vendor: offer.vendor, names: names(offer.names) })}>
							{carrying ? phrase('form.offer.carry', { carrying, count: offer.names.length }) : null}
						</Alert>
						<div className="sp-row-flex sp-gap-12">
							<span className="sp-grow" />
							<Button variant="outline" size="small" onClick={() => { setOffer(null); set({ categories: [...draft.categories, ...offer.names.filter(n => !draft.categories.some(c => c.toLowerCase() === n.toLowerCase()))] }) }}>
								{phrase('form.offer.add', { count: offer.names.length, name: offer.names[0] })}
							</Button>
						</div>
					</>
				)
				: null}
			<div className="sp-fields">
				<Field label={phrase('field.reference')}>
					<TextField value={draft.reference} onChange={reference => set({ reference })} />
				</Field>
				<Field label={phrase('field.note')}>
					<TextField value={draft.note} onChange={note => set({ note })} />
				</Field>
			</div>
			<div className="sp-fields">
				<Field label={phrase('field.discount')} unit={currencySymbol()} {...lookAt('discount')}>
					<NumberField value={draft.discount} min={0} locale={NUMBER_LOCALE} placeholder={amount(0)} onChange={discount => set({ discount })} />
				</Field>
				<Field label={phrase('form.shippingFee')} unit={currencySymbol()} {...lookAt('shipping')}>
					<NumberField value={draft.shipping} min={0} locale={NUMBER_LOCALE} placeholder={amount(0)} onChange={shipping => set({ shipping })} />
				</Field>
			</div>
			<div className="sp-field">
				<label className="sp-row-flex sp-gap-12">
					<Switch id={statsSwitch} aria-describedby={`${statsSwitch}-help`} checked={!!draft.excludeFromStats}
						onChange={ev => set({ excludeFromStats: ev.target.checked, excludeFromStatsSetByHand: true })} />
					<span className="sp-data">{phrase('form.leaveOut')}</span>
				</label>
				<span className="sp-field__help" id={`${statsSwitch}-help`}>{phrase('form.leaveOutHelp')}</span>
			</div>
		</>
	)

	const detailsCard = touch || stacked
		? (
			<Card variant="flush" data-details="">
				<Toolbar variant="toggle" expanded={!folded} onClick={() => setFolded(f => !f)} chevron={<Icon name="chevron-down" />}>
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">{phrase('order.details')}</span>
						<span className="sp-meta sp-truncate">{detailsLine(draft)}</span>
					</span>
				</Toolbar>
				<CardBody open={!folded}>
					<div className="sp-stack sp-gap-12">{fields}</div>
				</CardBody>
			</Card>
		)
		: (
			<Card data-details="">
				<CardHeader name={phrase('order.details')} aside={!fixCount && creating ? phrase('form.allChangeable') : undefined}
					status={fixCount ? <Pill color="danger">{phrase('form.toFix', { count: fixCount })}</Pill> : undefined} />
				{fields}
			</Card>
		)

	/* A limit this order takes its category past, or near from the share chosen in Settings (8b):
	   amber where the save is, never in its way. The total is shared between the categories. */
	const loud = useApi(getSettings).data ?? {}
	const warns = loud.notifyWhileSaving ?? true
	const early = [75, 90, 100].includes(loud.notifyEarly) ? loud.notifyEarly : 90
	const dated = /^\d{4}-\d{2}-\d{2}$/.test(draft.date ?? '')
	const limits = useApi(getOrderLimits, [draft.date, draft.categories, orderId ?? ''], { enabled: warns && dated && draft.categories.length > 0 })
	// a draft, a cancelled order or one left out of statistics spends nothing, so it takes no category anywhere
	const counts = !['draft', 'cancelled'].includes(useStatusTypes().typeOf(draft.status)) && !draft.excludeFromStats
	const share = draft.categories.length ? sums.total / draft.categories.length : 0
	const flagged = warns && counts && dated && draft.categories.length && limits.data
		? limits.data.limits
			.map(l => ({ ...l, after: l.spend + share }))
			.filter(l => l.after > l.budget + 0.005 || (early < 100 && l.after >= l.budget * early / 100 - 0.005))
		: []
	const crossed = flagged.filter(l => l.after > l.budget + 0.005)
	const monthName = dated ? monthNames('long')[Number(draft.date.slice(5, 7)) - 1] : ''
	const limitTitle = l => {
		if (l.after > l.budget + 0.005)
			return phrase(l.spend > l.budget ? 'form.limit.alreadyOver' : 'form.limit.puts', { name: shortened(l.name) })
		const part = Math.floor(l.after / l.budget * 100)
		return phrase(l.spend >= l.budget * early / 100 ? 'form.limit.alreadyAt' : 'form.limit.takes', { name: shortened(l.name), part })
	}
	const limitNotice = flagged.length
		? flagged.map(l => (
			<ListItem key={l.name} color="warning" count="!">
				<span className="sp-stack sp-gap-6">
					<span className="sp-title sp-ink-warning">{limitTitle(l)}</span>
					<span className="sp-meta sp-ink-warning">
						{phrase('form.limit.body', { spent: amount(l.after, 0), budget: currency(l.budget, 0), period: l.budgetPeriod === 'year' ? draft.date.slice(0, 4) : monthName })}
					</span>
				</span>
			</ListItem>
		))
		: null

	const leaveWord = phrase(creating || touch ? 'action.discard' : 'action.cancel')
	const commitWord = phrase(saving ? 'action.saving' : crossed.length ? (creating ? 'form.createAnyway' : 'form.saveAnyway') : creating ? 'action.create' : 'action.save')
	const leaveButton = <Button key="leave" variant="outline" onClick={discard}>{leaveWord}</Button>
	const commitButton = lost ? null : <Button key="save" disabled={saving} onClick={() => save()}>{commitWord}</Button>
	// a draft holds every change as it is made, so it has nothing unsaved to say (3a)
	const state = lost ? phrase('form.state.notSaved') : waiting ? phrase('form.state.waiting') : draftId ? null
		: creatingNow ? (dirty ? null : phrase('form.state.nothingYet')) : dirty ? phrase('form.state.unsaved') : null
	const totalsCard = (
		<Card
			// once the split folds the commits move to the bar that stays in view (1d)
			footer={stacked || touch ? [] : [leaveButton, commitButton]}
			footerLayout="split"
			footerCommits
			after={crossed.length && !stacked && !touch ? <span className="sp-meta">{phrase('form.stillSave')}</span> : null}
		>
			{scan ? <CardHeader name={phrase('order.totals')} /> : null}
			{touch ? null : limitNotice}
			<div className="sp-stack">
				{scan
					? <>
						<Sum value={money(sums.total)}>{phrase('form.orderTotal')}</Sum>
						{printed != null ? <Sum value={money(printed)}>{phrase('compare.onReceipt')}</Sum> : null}
					</>
					: <Sum variant="total" value={money(sums.total)}>{phrase('order.total')}</Sum>}
			</div>
			{scan
				? (printed != null && !mismatch ? <Pill color="success">{phrase('compare.totalsMatch')}</Pill> : null)
				: <>
					<span className="sp-meta">{phrase('form.totalsLine', { items: itemsWord(included.length), dot, discount: amount(draft.discount || 0), shipping: amount(draft.shipping || 0) })}</span>
					<Saving value={sums.saved} variant="stat" />
				</>}
			{/* the bar that says so on a phone and a narrow window is not drawn here, so the card does */}
			{waiting && !stacked && !touch ? <span className="sp-meta sp-ink-warning">{phrase('form.state.waiting')}</span> : null}
		</Card>
	)

	// on a phone the bar takes the tab bar's place (1c, 5b)
	const touchBar = rested && !dirty && !saving && !waiting && !lost ? null : (
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

	const lostNotice = lost
		? <Alert color="danger" mark="!">{lost}</Alert>
		: conflict
			? (
				<Toast asks mark="!" title={phrase(conflict.where === 'tab' ? 'form.conflict.tab' : 'form.conflict.elsewhere')}
					actions={<>
						<Button variant="outline" size="small" onClick={seeTheirs}>{phrase('form.conflict.seeTheirs')}</Button>
						<Button size="small" color="warning" onClick={keepMine}>{phrase('form.conflict.keepMine')}</Button>
					</>}>
					{conflict.theirs ? changedThere(start, draftOf(conflict.theirs), statuses) : phrase('form.conflict.waited')}
					{' '}{phrase(onlyLines(start, draft, lines) ? 'form.conflict.linesSafe' : 'form.conflict.safe')}
				</Toast>
			)
			: null

	// the first warning, a line or a field note, in the order the page shows them (3a)
	const looking = lines.some(l => l.uncertain && l.unclearPart !== 'title') || vendorNote.noteType === 'warning' || ['date', 'discount', 'shipping'].some(f => lookAt(f).note)
	const jumpFirst = () => {
		const mark = document.querySelector(LOOK)
		const row = mark?.closest('[data-line]')
		const field = row ? null : mark?.closest('.sp-field')
		const target = row ? (row.matches('button') ? row : row.querySelector('[data-edit]')) : document.getElementById(field?.querySelector('label')?.htmlFor)
		quietVendor.current = true
		target?.focus()
		quietVendor.current = false
		;(row ?? field)?.scrollIntoView?.({ block: 'center' })
	}
	// a field read badly counts until it is changed, the printed total always (as Home counts it)
	const unclear = (scan?.unclear ?? []).filter(f => !UNCLEAR_EDITABLE.includes(f) || lookAt(f).note)
	const notice = notices({ origin, scan, unclear, lines, leave: discard, touch, jump: looking ? jumpFirst : null })

	// on a phone the sheet's line is copied as it stands in the sheet, once it reads as a whole line
	const copyEditing = () => {
		if (Object.keys(lineErrors(editing.values)).length) return setEditing(e => ({ ...e, tried: true }))
		const line = lines.find(l => l.key === editing.key)
		commitInto(editing)
		setEditing(null)
		duplicateLine(line, editing.values)
	}
	const sheet = sheeted && editing
		? createPortal(
			<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) cancelLine() }}>
				<Sheet role="dialog" aria-modal="true" aria-label={phrase(editing.isNew ? 'form.addALine' : 'form.editLine')} ref={sheetBox}>
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-heading">{phrase(editing.isNew ? 'form.addALine' : 'form.editLine')}</span>
						<span className="sp-grow" />
						{editing.isNew || scan ? null : <IconButton variant="outline" icon="copy" aria-label={phrase('form.duplicateLine', { name: editing.values.title || phrase('form.unnamedLower') })}
							onClick={copyEditing} />}
						{editing.isNew ? null : <IconButton variant="outline" danger icon="trash" aria-label={phrase('form.deleteLine', { name: editing.values.title || phrase('form.unnamedLower') })}
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
	const confirmRemoval = removing
		? (
			<Dialog onCancel={() => setRemoving(null)} aria-label={phrase(removing.file ? 'form.removeScan.receiptTitle' : 'form.removeScan.photoTitle')}>
				<div className="sp-stack sp-gap-12">
					<DialogTitle>{phrase(removing.file ? 'form.removeScan.receiptTitle' : 'form.removeScan.photoTitle')}</DialogTitle>
					<DialogBody>
						{removing.file
							? phrase('form.removeScan.receiptBody', { name: shortened(removing.file.name, 40) })
							: phrase('form.removeScan.photoBody', { name: removing.photo.name || phrase('form.thisLine') })}
					</DialogBody>
					<DialogActions>
						<Button variant="outline" fullWidth onClick={() => setRemoving(null)}>{phrase('action.keepIt')}</Button>
						<Button color="danger" fullWidth onClick={() => {
							if (removing.file) setGone(g => [...g, removing.file.id])
							else patchLine(removing.photo.key, removing.photo.without)
							setRemoving(null)
						}}>{phrase(removing.file ? 'form.removeScan.receipt' : 'form.removeScan.photo')}</Button>
					</DialogActions>
				</div>
			</Dialog>
		)
		: null
	/* A receipt added to a saved order (3d): a file the order already holds is asked about as such, and any
	   other is offered the comparison. It needs the order as saved, so it waits for a form with no changes. */
	const askedFile = files.find(f => f.key === receiptAsked) ?? null
	const askedTwin = Boolean(askedFile?.upload && saved.some(f => !gone.includes(f.id) && f.sha256 === askedFile.upload.sha256))
	const unsavedBesides = Boolean(lineChanged) || gone.length > 0 || files.length > 1
		|| JSON.stringify(draft) !== JSON.stringify({ ...start, lines: undefined })
		|| JSON.stringify(lines) !== JSON.stringify(start.lines)
	const closeAsk = () => setReceiptAsked(null)
	const dropAsked = () => {
		setFiles(fs => fs.filter(f => f.key !== askedFile.key))
		if (askedFile.thumb) URL.revokeObjectURL(askedFile.thumb)
		sends.current.delete(askedFile.key)
		closeAsk()
	}
	// the file becomes one of the order's own now, so Cancel on the comparison leaves it there
	const compare = async () => {
		setComparing(true)
		try {
			const { attached } = await attachScanDocument(askedFile.upload.key, orderId, { as: 'file', name: askedFile.name })
			invalidateOrderData()
			guard.release()
			navigate(`/orders/${orderId}/compare?doc=${askedFile.upload.key}&file=${attached}`)
		} catch (e) {
			setComparing(false)
			toast({ message: failureMessage(e, phrase('form.compareFailed')), color: 'danger' })
		}
	}
	const compareAsk = !askedFile
		? null
		: askedTwin
			? (
				<Dialog onCancel={dropAsked} aria-label={phrase('form.twin.title')}>
					<div className="sp-stack sp-gap-12">
						<DialogTitle>{phrase('form.twin.title')}</DialogTitle>
						<DialogBody>{phrase('form.twin.body', { name: shortened(askedFile.name, 40) })}</DialogBody>
						<DialogActions>
							<Button variant="outline" fullWidth onClick={closeAsk}>{phrase('form.twin.add')}</Button>
							<Button fullWidth onClick={dropAsked}>{phrase('form.twin.skip')}</Button>
						</DialogActions>
					</div>
				</Dialog>
			)
			: (
				<Dialog onCancel={closeAsk} aria-label={phrase('form.compareAsk.title')}>
					<div className="sp-stack sp-gap-12">
						<DialogTitle>{phrase('form.compareAsk.title')}</DialogTitle>
						<DialogBody>
							{phrase('form.compareAsk.body', { name: shortened(askedFile.name, 40), vendor: start.vendor, date: shortDate(start.date) })}
						</DialogBody>
						{unsavedBesides ? <span className="sp-field__help">{phrase('form.saveFirst')}</span> : null}
						<DialogActions>
							<Button variant="outline" fullWidth disabled={comparing} onClick={closeAsk}>{phrase('compare.attachOnly')}</Button>
							<Button fullWidth disabled={unsavedBesides || comparing} onClick={compare}>{phrase('form.compare')}</Button>
						</DialogActions>
					</div>
				</Dialog>
			)
	const dialog = asking
		? (
			<Dialog onCancel={() => setAsking(false)} aria-label={phrase(scan ? 'form.discardScan' : 'form.discardDraft')}>
				<div className="sp-stack sp-gap-12">
					<DialogTitle>{phrase(scan ? 'form.discardScan' : 'form.discardDraft')}</DialogTitle>
					<DialogBody>{scan ? discardWords(scan, read, typed) : phrase('form.discardFile', { file: names(ownFiles()) })}</DialogBody>
					<DialogActions>
						<Button variant="outline" fullWidth onClick={() => setAsking(false)}>{phrase(scan ? 'form.keepChecking' : 'form.keepEditing')}</Button>
						<Button color="danger" fullWidth onClick={() => { setAsking(false); throwAway() }}>{phrase('action.discard')}</Button>
					</DialogActions>
				</div>
			</Dialog>
		)
		: null

	const answerRepeats = then => () => {
		for (const o of repeats.orders) answered.current.add(o.id)
		setRepeats(null)
		then()
	}
	const repeatsAsk = repeats
		? <OrderRepeats alike={repeats} self={repeats.self} editing={!creatingNow} onCreate={answerRepeats(save)} onDiscard={answerRepeats(discard)} onCancel={() => setRepeats(null)} />
		: null

	const createdNotice = created
		? (
			<Created created={created} touch={touch} orderId={orderId}
				files={saved.length + lines.filter(l => l.photo).length - (created.documentKey ? 1 : 0)}
				typed={{ ...draft, reference: created.reference, lines: lines.map(l => ({ key: `undo-${l.key}`, title: l.title, quantity: l.quantity, price: l.price, retail: l.retail ?? null, note: l.note ?? '', url: l.url ?? '' })) }}
				onGone={guard.release} />
		)
		: null

	if (touch) return (
		<div className="sp-stack sp-gap-12" ref={column}>
			{createdNotice}{lostNotice}{notice}{detailsCard}{itemsCard}{attachmentsCard}{scan ? totalsCard : null}{limitNotice}{touchBar}<Leaving>{sheet}</Leaving><Leaving>{dialog}</Leaving><Leaving>{repeatsAsk}</Leaving><Leaving>{confirmRemoval}</Leaving><Leaving>{compareAsk}</Leaving>{viewer}<Leaving>{guard.prompt}</Leaving>
		</div>
	)
	// folded, one column holds everything so the bar can stay at the bottom of the whole page (c27)
	const main = stacked
		? <div className="sp-stack sp-gap-12" ref={column}>{createdNotice}{lostNotice}{detailsCard}{itemsCard}{attachmentsCard}{totalsCard}{stickyBar}<Leaving>{sheet}</Leaving><Leaving>{dialog}</Leaving><Leaving>{repeatsAsk}</Leaving><Leaving>{confirmRemoval}</Leaving><Leaving>{compareAsk}</Leaving>{viewer}<Leaving>{guard.prompt}</Leaving></div>
		: <div className="sp-stack sp-gap-12" ref={column}>{lostNotice}{itemsCard}{attachmentsCard}</div>
	const rail = stacked ? null : <Panel>{detailsCard}{totalsCard}<Leaving>{dialog}</Leaving><Leaving>{repeatsAsk}</Leaving><Leaving>{confirmRemoval}</Leaving><Leaving>{compareAsk}</Leaving>{viewer}<Leaving>{guard.prompt}</Leaving></Panel>
	if (!region) return <>{stacked ? null : createdNotice}{main}{rail}</>
	return <>{notice}<div className="sp-shell__body--split">{main}{rail}</div></>
}

/** The saved state's notice (3a): where the order came from, and Undo, which deletes it and goes
    back to the screen it was created from with what was typed. */
function Created({ created, touch, orderId, files, typed, onGone }) {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	// the lists forget the order once this page has gone, so the page does not ask for it again
	const deleted = useRef(false)
	useEffect(() => () => { if (deleted.current) invalidateOrderData() }, [])
	const undo = () => {
		setBusy(true)
		deleteOrder(orderId)
			.then(() => {
				onGone()
				deleted.current = true
				if (created.documentKey) navigate(`/orders/new?source=scan&doc=${created.documentKey}`, { replace: true })
				else navigate('/orders/new?source=empty', { replace: true, state: { seed: typed } })
				toast({ message: phrase(created.documentKey ? 'form.undoneScan' : 'form.undoneTyped') })
			})
			.catch(e => {
				setBusy(false)
				toast({ message: failureMessage(e, phrase('form.notRemoved')), color: 'danger' })
			})
	}
	const said = [
		created.file ? phrase('form.receiptKept') : null,
		files > 0 ? phrase('form.undoFiles', { files: plural(files, 'file') }) : null
	].filter(Boolean).join(' ') || null
	const undoButton = <Button variant="outline" size="small" disabled={busy} onClick={undo}>{phrase('action.undo')}</Button>
	// after a scan the next receipt is one click away (16a: open the order or scan another)
	const actions = created.documentKey
		? <span className="sp-row-flex sp-gap-8">{undoButton}<Button variant="outline" size="small" to="/orders/new?source=scan">{phrase('form.scanAnother')}</Button></span>
		: undoButton
	// a phone's notice is too narrow for words and two buttons side by side, so the buttons go under the words
	const under = touch && created.documentKey
	return (
		<div className="or-span">
			<Alert color="success" mark={<Icon name="check" size={12} />}
				title={created.file ? phrase('form.createdFrom', { file: created.file }) : phrase('form.created')}
				action={actions} below={under}>
				{said}
			</Alert>
		</div>
	)
}

/** Discard's words for a draft (6d): what was read, and that its file goes with it. */
export function discardWords(scan, read = 0, typed = 0) {
	const file = shortened(scan?.file?.name ?? phrase('form.theFile'), 40)
	const lineWord = n => plural(n, 'line')
	if (read) return phrase(typed ? 'form.discardReadTyped' : 'form.discardRead', { count: read, lines: lineWord(read), typed: lineWord(typed), file })
	if (typed) return phrase('form.discardTyped', { count: typed, file })
	return phrase('form.discardFile', { file })
}

const LOOK = '[data-line][data-color="warning"], .sp-field__label + .sp-field__help[data-color="warning"]'
const INVALID = '[aria-invalid="true"] input, input[aria-invalid="true"], [aria-invalid="true"] button, button[aria-invalid="true"]'

/** Focus the first field to fix inside `selector`, as drawn now. `quiet` is held while it takes focus,
    so a picker that opens on focus stays closed over its own message. */
const focusFirst = (selector, quiet) => {
	const box = document.querySelector(selector)
	const target = box?.querySelector(INVALID) ?? box?.querySelector('input, button') ?? box
	if (quiet) quiet.current = true
	target?.focus?.()
	if (quiet) quiet.current = false
	box?.scrollIntoView?.({ block: 'nearest' })
}

/** The saved order's own files as the form shows them. */
export const savedFilesOf = order => order.attachments.map(a => ({
	id: a.id, name: a.name, kind: a.kind, pages: a.pages, sha256: a.sha256, fromScan: Boolean(a.fromScan),
	thumb: a.hasThumbnail ? attachmentThumbnailUrl(order.id, a.id) : null
}))

/** Whether the order's split has folded into one column (components.css folds it at 900). */
export function useStacked(ref) {
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
	key: 'receipt', name: file.name, kind: file.kind, download: scanDownloadUrl(file.key),
	zoomSrc: file.kind === 'pdf' ? undefined : scanDownloadUrl(file.key),
	src: file.kind === 'pdf' ? scanPageUrl(file.key, 0) : scanFileUrl(file.key),
	...(file.kind === 'pdf'
		? { pages: file.pages ?? null, pageSrc: i => scanPageUrl(file.key, i), countPages: () => getScanPages(file.key).then(r => r.pages) }
		: {})
})

const UNCLEAR_FIELD = { vendor: 'form.unclear.vendor', date: 'form.unclear.date', shipping: 'form.unclear.shipping', discount: 'form.unclear.discount', total: 'form.unclear.total' }
const UNCLEAR_EDITABLE = ['vendor', 'date', 'shipping', 'discount']
// what was hard to read on a line of a scanned receipt, by the part the reading named (3a)
const UNCLEAR_LINE = {
	price: 'form.unclearLine.price',
	title: 'form.unclearLine.title',
	quantity: 'form.unclearLine.quantity',
	line: 'form.unclearLine.line'
}

const lineMetaWith = (line, photo, plain) => (plain || photo ? lineMeta(line, plain) : `${lineMeta(line)}${dot}${phrase('form.noPhoto')}`)

const detailsLine = d => [d.categories.join(', '), d.kind ? kindName(d.kind) : null].filter(Boolean).join(dot)

const lineShape = l => JSON.stringify([l.title, Number(l.quantity), l.price, l.retail ?? null, String(l.url ?? '').trim()])
const FIELD_WORDS = {
	vendor: 'form.there.vendor', date: 'form.there.date', kind: 'form.there.kind', categories: 'form.there.categories', shipping: 'form.there.shipping',
	discount: 'form.there.discount', reference: 'form.there.reference', note: 'form.there.note', excludeFromStats: 'form.there.excludeFromStats'
}
/** What another copy of the order changed, against the one this form opened on (6d). */
function changedThere(was, now, statuses) {
	const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
	const fields = Object.keys(FIELD_WORDS).filter(k => !same(was[k], now[k]))
	const status = was.status !== now.status
	const lines = !same(was.lines.map(lineShape), now.lines.map(lineShape))
	if (status && !fields.length && !lines)
		return phrase('form.there.statusSet', { name: shortened(statuses.find(st => st.key === now.status)?.name ?? now.status) })
	const parts = [status ? 'form.there.status' : null, ...fields.map(k => FIELD_WORDS[k]), lines ? 'form.there.lines' : null].filter(Boolean)
	if (!parts.length) return phrase('form.there.savedAgain')
	const said = names(parts.map(p => phrase(p)))
	const one = parts.length === 1 && parts[0] !== 'form.there.lines' && parts[0] !== 'form.there.categories'
	return phrase('form.there.changed', { what: `${said.charAt(0).toUpperCase()}${said.slice(1)}`, one: String(one) })
}
/** Their lines with the reader's own on top: a changed line replaces theirs, a new one is added,
    a removed one stays removed (6d). A line they removed comes back as a new one. */
function withOwnLines(theirs, was, mine) {
	const before = new Map(was.map(l => [l.key, l]))
	const own = new Map(mine.map(l => [l.key, l]))
	const changed = mine.filter(l => before.has(l.key) && JSON.stringify(l) !== JSON.stringify(before.get(l.key)))
	const merged = theirs
		.filter(l => !before.has(l.key) || own.has(l.key))
		.map(l => changed.find(c => c.key === l.key) ?? l)
	const missing = changed.filter(c => !merged.some(l => l.key === c.key)).map(({ id, ...l }) => ({ ...l, key: freshKey() }))
	return [...merged, ...missing, ...mine.filter(l => !before.has(l.key))]
}
/** Whether the reader's own changes are to the lines alone. */
const onlyLines = (was, draft, lines) => JSON.stringify({ ...was, lines: undefined }) === JSON.stringify({ ...draft, lines: undefined })
	&& JSON.stringify(was.lines.map(lineShape)) !== JSON.stringify(lines.map(lineShape))

function Include({ line, setLines }) {
	return (
		<Check checked={line.include !== false} aria-label={phrase('form.include', { name: line.title })}
			onChange={ev => setLines(ls => ls.map(l => (l.key === line.key ? { ...l, include: ev.target.checked } : l)))} />
	)
}

/** Where a copy came from, or what a scan could not read. On a phone the save bar is the way
    out, so there the copy notice has no Discard. */
function notices({ origin, scan, unclear: fields, lines, leave, touch, jump }) {
	if (origin.copy)
		return (
			<Alert color="success" mark={<Icon name="copy" size={13} />}
				action={touch ? null : <Button variant="outline" size="small" onClick={leave}>{phrase('action.discard')}</Button>}>
				{phrase('form.copiedFrom', { from: `${origin.copy.vendor}, ${dayShortMonth(origin.copy.date)}`, b: words => <b>{words}</b> })}
			</Alert>
		)
	if (!scan) return null
	if (!scan.linesRead)
		return (
			<Alert mark="!" title={phrase(scan.failure === 'empty' ? 'form.noLinesRead' : 'form.nothingRead')}>
				{phrase(scan.failure === 'empty' ? 'form.addLines' : 'form.addAll')} {phrase('form.receiptKeptOnCreate')}
			</Alert>
		)
	const unclear = lines.filter(l => l.uncertain && l.unclearPart !== 'title').length
	const hard = [unclear ? plural(unclear, 'line') : null, ...fields.map(f => phrase(UNCLEAR_FIELD[f]))].filter(Boolean)
	const looks = [
		...(scan.vendorMatched ? [] : [phrase('form.look.newVendor')]),
		...(scan.total == null ? [phrase('form.look.noTotal')] : []),
		...(scan.checks?.some(c => c.id === 'vat' && c.warning) ? [phrase('form.look.vat')] : []),
		...(scan.checks ?? []).filter(c => c.id === 'currency').map(c => phrase(c.warning ? 'form.look.currencyKept' : 'form.look.currencyChanged', { from: c.from, to: c.to }))
	]
	const count = looks.length + unclear + fields.length
	if (!count) return null
	const one = hard.length === 1 && unclear < 2
	const said = [hard.length ? phrase('form.look.hard', { names: names(hard), one: String(one) }) : null, ...looks].filter(Boolean)
	return (
		<Alert mark="!" title={phrase('form.look.title', { count })}
			action={jump ? <Button variant="outline" size="small" onClick={jump}>{phrase('compare.jump')}</Button> : null}>
			{said.join(', ').replace(/^./, c => c.toUpperCase())}.{looks.length ? null : ' ' + phrase('form.look.restClean')}
		</Alert>
	)
}

/** The line being edited or added (1b), in place on a desktop and in a sheet on a phone. */
function LineForm({ editing, focus, sheet, photoUrl, sendPhoto, refused, onRemovePhoto, onChange, onCommit, onCommitNext, onCancel }) {
	const phrase = usePhrase()
	const v = editing.values
	// the product link is judged as it is left, as every field is (c3)
	const [linkSeen, setLinkSeen] = useState(false)
	const found = lineErrors(v)
	const errors = editing.tried ? found : linkSeen && found.url ? { url: found.url } : {}
	const set = patch => onChange({ ...v, ...patch })
	// a line that has a link opens with its field showing; a field holding a link is never hidden
	const [linkOpen, setLinkOpen] = useState(Boolean(v.url))
	const [linkAsked, setLinkAsked] = useState(false)
	const linkInput = useRef(null)
	const hasLink = Boolean(String(v.url ?? '').trim())
	const toggleLink = () => {
		if (linkOpen && hasLink) return linkInput.current?.focus()
		setLinkSeen(false)
		setLinkAsked(!linkOpen)
		setLinkOpen(!linkOpen)
	}
	// the new photo is sent at once (17a); one that did not arrive keeps its failure and a Retry (17b)
	const [outcome, setOutcome] = useState(null)
	useEffect(() => {
		const sent = v.newPhoto?.sent
		if (!sent) return
		let live = true
		sent.then(upload => { if (live) setOutcome({ sent, ok: Boolean(upload) }) })
		return () => { live = false }
	}, [v.newPhoto?.sent])
	const settled = v.newPhoto?.sent && outcome?.sent === v.newPhoto.sent ? outcome : null
	const sending = !v.newPhoto?.sent ? null : !settled ? 'busy' : settled.ok ? null : refused(v.newPhoto.sent) ? 'refused' : 'failed'
	// a replace keeps the old photo in the slot until the new one has arrived (17a)
	const old = v.dropPhoto ? null : photoUrl(v)
	const photo = v.newPhoto && !(sending && old) ? v.newPhoto.url : old
	// a file the line cannot take leaves the photo as it was and says why on the slot (17b)
	const take = async file => {
		const refused = await sniffedProblem(file, PHOTO_TYPES)
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
			hint={phrase('form.lineHint', { dot, keys: MAC ? '⌘↵' : 'Ctrl ↵' })}
			commit={phrase(editing.isNew ? 'form.addLine' : 'form.saveLine')}
			photo={
				<Slot
					size="medium"
					word={phrase('form.addPhoto')}
					name={phrase('form.linePhoto')}
					src={photo}
					problem={v.photoProblem ?? (sending === 'refused' ? phrase('file.unsupported') : sending === 'failed' ? phrase('form.failed') : undefined)}
					busy={sending === 'busy'}
					onRetry={sending === 'failed' ? () => set({ newPhoto: { ...v.newPhoto, sent: sendPhoto(v.newPhoto.file) } }) : undefined}
					onFile={take}
					onRemove={() => onRemovePhoto(v)}
				/>
			}
			onCommit={onCommit}
			onCommitNext={onCommitNext}
			onCancel={onCancel}
		>
			<Field label={phrase('form.item')} {...problem(errors.title)}>
				<TextField value={v.title} placeholder={phrase('import.field.title')} autoFocus={focus} onChange={title => set({ title })}
					action={{ icon: 'link', label: phrase(hasLink ? 'form.editLink' : 'form.addLink'), expanded: linkOpen, onClick: toggleLink }} />
			</Field>
			{linkOpen
				? (
					<Field label={phrase('form.productPage')} {...problem(errors.url)}>
						<TextField type="url" inputMode="url" placeholder="https://" value={v.url ?? ''} inputRef={linkInput} autoFocus={linkAsked}
							onChange={url => set({ url })} onBlur={() => setLinkSeen(true)} />
					</Field>
				)
				: null}
			<div className="sp-line-editor__grid">
				<Field label={phrase('import.field.quantity')} {...problem(errors.quantity)}>
					{/* the smallest quantity the server keeps: more than 0, two decimals */}
					<Stepper value={Number(v.quantity) || 0} min={0.01} step={1} decimals={2} locale={NUMBER_LOCALE} onChange={quantity => set({ quantity })} />
				</Field>
				<Field label={phrase('import.field.price')} unit={currencySymbol()} {...problem(errors.price)}>
					<NumberField value={v.price} min={0} locale={NUMBER_LOCALE} placeholder={amount(0)} onChange={price => set({ price })} />
				</Field>
				<Field label={phrase('form.retailPrice')} unit={currencySymbol()}>
					<NumberField value={v.retail} min={0} locale={NUMBER_LOCALE} placeholder={amount(0)} onChange={retail => set({ retail })} />
				</Field>
				<Field label={phrase('form.lineTotal')} unit={currencySymbol()}>
					<NumberField readOnly value={v.price == null ? null : lineTotal(v)} locale={NUMBER_LOCALE} />
				</Field>
			</div>
		</LineEditor>
	)
}

/** The vendor a name files under, as the server matches it, or null. */
const resolveVendor = name => getVendorPage({ name, pageSize: 1 }).then(r => r.vendors[0] ?? null, () => null)

/** A receipt's vendor the account does not know yet: set it up first, and come back to the receipt
    with it chosen and the order as it was left (Vendors 5b). The field's note says saving adds it. */
function NewVendorFromScan({ onSetUp }) {
	const phrase = usePhrase()
	return (
		<div className="sp-row-flex sp-gap-8">
			<span className="sp-note sp-grow">{phrase('form.addDetailsNow')}</span>
			<Button variant="outline" size="small" onClick={onSetUp}>{phrase('form.setUpFirst')}</Button>
		</div>
	)
}

function KindPicker({ value, onPick, ...rest }) {
	return (
		<Combobox value={value ? kindName(value) : value} {...rest}>
			{spendKinds.map(kind => (
				<ComboboxOption key={kind} selected={kind === value} onSelect={() => onPick(kind)}>{kindName(kind)}</ComboboxOption>
			))}
		</Combobox>
	)
}
