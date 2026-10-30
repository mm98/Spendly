import { useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Mark } from '../components/Mark.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Viewer } from '../components/Attachments.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../components/Overlays.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import { useShellShape } from '../app/useMedia.js'
import {
	attachmentFileUrl, attachmentPageUrl, attachmentThumbnailUrl, itemAttachmentFileUrl, scanFileUrl, scanPageUrl, scanThumbnailUrl
} from '../api/client.js'
import { activeLocaleCode, amount, currency, dayShortMonth, dot, plural, shortDate } from '../api/format.js'
import { pagesOf } from './OrderParts.jsx'

/* "You already have this order" (3c): the one dialog for the same file or a look-alike, over a scan or a form. */

// the dialog lists this many orders and counts the rest in its body (3c)
const SHOWN = 3

const timeFormat = () => new Intl.DateTimeFormat(activeLocaleCode(), { hour: '2-digit', minute: '2-digit' })
const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dayNumber = iso => Date.UTC(...String(iso).split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0))) / 86400000

/** The orders the dialog lists, in its order: those holding the same file, newest first, then the
    look-alikes, then a draft holding the file. An order that is both is listed once, as the same file. */
export function repeatsOf({ file = null, alike = null }) {
	const same = (file?.orders ?? []).map(o => ({ ...o, why: 'file' }))
	const sameIds = new Set(same.map(o => o.id))
	const looks = (alike?.orders ?? []).filter(o => !sameIds.has(o.id)).map(o => ({ ...o, why: 'alike' }))
	const orders = [...same, ...looks]
	const count = (file?.count ?? 0) + (alike?.count ?? 0) - ((alike?.orders?.length ?? 0) - looks.length)
	const draft = file?.draft ? { ...file.draft, why: 'draft' } : null
	return { orders: orders.slice(0, SHOWN), more: Math.max(0, count - SHOWN), draft }
}

/** The ids a dialog shows, so the same orders are not asked about twice on one scan or form (3c). */
export const repeatIds = repeats => [...repeats.orders.map(o => o.id), ...(repeats.draft ? [repeats.draft.id] : [])]

/** `file` is the upload's `seen` and `upload` the scan; `alike` is `{ count, orders }` from the look-alike
    search and `self` the order entered. `onReread` only where the file can be read again; `editing` for a saved order. */
export function OrderRepeats({ file = null, upload = null, alike = null, self = null, editing = false, onCreate, onDiscard, onCancel, onReread }) {
	const touch = useShellShape() === 'touch'
	const [comparing, setComparing] = useState(null)
	const { orders, more, draft } = repeatsOf({ file, alike })
	const rows = [...orders, ...(draft ? [draft] : [])]
	// the matched file holds these same bytes, so the upload's own picture is a picture of it
	const uploadThumb = upload?.hasThumbnail ? scanThumbnailUrl(upload.key) : null
	const andMore = more ? `, and ${more} more` : ''
	const fileOrders = orders.filter(o => o.why === 'file').length
	const holders = [
		fileOrders ? (fileOrders === 1 && file.count === 1 ? 'on this order' : 'on these orders') : null,
		draft ? (fileOrders ? 'and in a draft' : 'in a draft') : null
	].filter(Boolean).join(', ')
	const said = holders
		? `${upload?.name ?? 'This file'} is already ${holders}${andMore}`
		: `This one is ${[self?.vendor, self?.date ? dayShortMonth(self.date) : null, self?.total != null ? currency(self.total) : null].filter(Boolean).join(', ')}${andMore}`
	// an amount can end in its currency's own full stop
	const body = said.endsWith('.') ? said : `${said}.`

	const compare = o => setComparing({
		key: 'new', name: upload.name, kind: upload.kind,
		src: upload.kind === 'pdf' ? scanPageUrl(upload.key, 0) : scanFileUrl(upload.key),
		...(upload.kind === 'pdf' ? { pages: upload.pages, pageSrc: i => scanPageUrl(upload.key, i) } : {}),
		beside: o.file.itemId
			? { key: o.file.id, name: o.file.name, kind: o.file.kind, src: itemAttachmentFileUrl(o.id, o.file.itemId, o.file.id) }
			: {
				key: o.file.id, name: o.file.name, kind: o.file.kind,
				src: o.file.kind === 'pdf' ? attachmentPageUrl(o.id, o.file.id, 0) : attachmentFileUrl(o.id, o.file.id),
				...pagesOf(o.id, { ...o.file, pages: null })
			}
	})

	const markOf = o => {
		const thumb = o.why === 'alike' ? (o.thumbnailId ? attachmentThumbnailUrl(o.id, o.thumbnailId) : null) : uploadThumb
		if (!thumb && o.why === 'alike') return <VendorMark name={o.vendor} colour={o.vendorColour} />
		return (
			<Mark size="medium" fill={thumb ? 'photo' : 'none'} aria-hidden="true" aria-label="Receipt">
				{thumb ? <img src={thumb} alt="" /> : <span>{(o.file?.kind ?? upload?.kind) === 'pdf' ? 'PDF' : 'IMG'}</span>}
			</Mark>
		)
	}
	const whyOf = o => {
		if (o.why === 'file') {
			const at = o.readAt ? new Date(o.readAt) : null
			return at ? `Same file${dot}scanned ${dayShortMonth(localDay(at))}, ${timeFormat().format(at)}` : 'Same file'
		}
		if (o.why !== 'alike' || !self?.date) return null
		const days = Math.round(dayNumber(self.date) - dayNumber(o.date))
		return `Same vendor${dot}${days === 0 ? 'the same day' : `${plural(Math.abs(days), 'day')} ${days > 0 ? 'earlier' : 'later'}`}`
	}
	// the draft is named by its vendor, or its file while no vendor was read
	const nameOf = o => (o.why === 'draft' ? o.vendor || o.file?.name || upload?.name : o.vendor)
	// Open opens in a new window, so the dialog and what is behind it stay as they are (3c)
	const open = (o, first) => (
		<Button key="open" variant={first ? 'solid' : 'outline'} size={touch ? undefined : 'small'} fullWidth={touch}
			to={`/orders/${o.id}`} target="_blank" rel="noopener">
			{o.why === 'draft' ? 'Open that draft' : 'Open that order'}
		</Button>
	)
	const compareButton = o => (o.why === 'file' && upload
		? <Button key="compare" variant="outline" size={touch ? undefined : 'small'} fullWidth={touch} onClick={() => compare(o)}>Compare the files</Button>
		: null)

	const row = (o, i) => {
		const total = o.total ?? null
		if (touch) {
			const facts = o.why === 'draft'
				? ['Draft', o.scanned ? `scanned ${dayShortMonth(o.scanned)}` : null, total == null ? null : currency(total)]
				: [o.reference, shortDate(o.date), plural(o.itemCount, 'line'), total == null ? null : currency(total)]
			return [
				<ListItem key={o.id} variant="top" mark={markOf(o)}>
					<span className="sp-stacked sp-grow">
						<span className="sp-title sp-truncate">{nameOf(o)}</span>
						<span className="sp-meta">{facts.filter(Boolean).join(dot)}</span>
					</span>
				</ListItem>,
				<div key={o.id + ':go'} className="sp-stack sp-gap-8">{open(o, i === 0)}{compareButton(o)}</div>
			]
		}
		const facts = o.why === 'draft'
			? ['Draft', o.scanned ? `scanned ${dayShortMonth(o.scanned)}` : null]
			: [o.reference, dayShortMonth(o.date), plural(o.itemCount, 'line'), o.status]
		const why = whyOf(o)
		return (
			<ListItem key={o.id} variant="top" mark={markOf(o)}>
				<span className="sp-stack sp-gap-8 sp-grow">
					<span className="sp-stacked">
						<span className="sp-title sp-truncate">{nameOf(o)}</span>
						<span className="sp-subtitle">{facts.filter(Boolean).join(dot)}</span>
					</span>
					{why ? <span className="sp-meta">{why}</span> : null}
					<span className="sp-row-flex sp-gap-8 sp-wrap">{open(o, i === 0)}{compareButton(o)}</span>
				</span>
				<span className="sp-stacked sp-cell-amount sp-flex-none">{total == null ? null : <span className="sp-amount">{amount(total)}</span>}</span>
			</ListItem>
		)
	}

	const createWord = editing ? 'Save anyway' : 'Create anyway'
	const discardWord = editing ? 'Discard changes' : 'Discard'
	const create = <Button key="create" variant="outline" fullWidth={touch} onClick={onCreate}>{createWord}</Button>
	const discard = <Button key="discard" variant="outline" fullWidth={touch} onClick={onDiscard}>{discardWord}</Button>
	const reread = onReread ? <Button key="reread" variant="outline" fullWidth={touch} onClick={onReread}>Read it again</Button> : null
	// a sheet stacks its buttons with the last one on top (app.css)
	const actions = touch
		? <DialogActions>{discard}{reread}{create}</DialogActions>
		: <DialogActions>{reread}{reread ? <span className="sp-grow" /> : null}{discard}{create}</DialogActions>
	const head = [<DialogTitle key="title">You already have this order</DialogTitle>, <DialogBody key="body">{body}</DialogBody>]
	// the files are compared in place of the dialog, which comes back when the viewer closes
	if (comparing) return <Viewer items={[comparing]} at={0} beside={comparing.beside} onMove={() => {}} onClose={() => setComparing(null)} />
	return (
		<Dialog onCancel={onCancel} aria-label="You already have this order">
			{touch ? head : <div className="sp-stack sp-gap-6">{head}</div>}
			{rows.flatMap(row)}
			{actions}
		</Dialog>
	)
}
