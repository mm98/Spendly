import { Failed } from '../components/Failed.jsx'
import { Card, Panel, Toolbar } from '../components/Card.jsx'
import { ListItem } from '../components/ListItem.jsx'

import { Skeleton, Spinner } from '../components/Utilities.jsx'
import { Mark, MarkRemove } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Attachment } from '../components/Attachments.jsx'
import { Sum } from '../components/Data.jsx'
import { Totals } from '../components/LineEditor.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { useShellShape } from '../app/useMedia.js'
import { Saving } from '../app/saving.jsx'
import {
	attachmentDownloadUrl, attachmentFileUrl, attachmentPageUrl, getAttachmentPages, itemAttachmentFileUrl, itemAttachmentThumbnailUrl
} from '../api/client.js'
import { currency, dot, quantity, plural } from '../api/format.js'

/* The parts the order's read view and its form share: one row, one tile and one set of sums,
   so reading an order and editing it draw the same things in the same places (1a, 1d). */

export const money = n => currency(Number(n) || 0)

export const lineTotal = line => (Number(line.price) || 0) * (Number(line.quantity) || 0)

/** What one line saved against its retail price, or null when it has none to compare. */
export const lineSaving = line =>
	line.retail == null ? null : Math.max(0, (Number(line.retail) - Number(line.price || 0)) * Number(line.quantity || 0))

/** The orders table's own three formulas, so a draft's figures are the ones the save stores. */
export function totalsOf(lines, shipping, discount) {
	const paid = lines.reduce((sum, l) => sum + lineTotal(l), 0)
	// a line's retail counts as at least its price, as the server stores it, so no line saves below zero
	const retail = lines.reduce((sum, l) => sum + Math.max(Number(l.retail ?? l.price) || 0, Number(l.price) || 0) * (Number(l.quantity) || 0), 0)
	const off = Number(discount) || 0
	return { paid, total: paid + (Number(shipping) || 0) - off, saved: retail - paid + off }
}

/** "1 × 330,00 kr. · retail 1.650,00 kr."; `compact` is the phone's, quantity and price only (1c). */
export const lineMeta = (line, compact = false) =>
	`${quantity(Number(line.quantity) || 0)} × ${line.price == null ? '-' : money(line.price)}`
	+ (line.retail != null && !compact ? `${dot}retail ${money(line.retail)}` : '')

export const itemsWord = n => plural(n, 'item')

export const isPdf = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

/** The line's total, with its saving under it; `compact` is the phone's, the total alone (1c). */
export function LineAmount({ line, compact = false }) {
	const saved = compact ? null : lineSaving(line)
	return (
		<span className="sp-stacked sp-cell-amount or-line-amount">
			<span className="sp-amount sp-truncate">{money(lineTotal(line))}</span>
			{saved == null ? null : <Saving value={saved} />}
		</span>
	)
}

/** A line's name and what it is made of; `compact` is the phone's, whose narrow widths wrap the
    quantity and price rather than cut them. */
export function LineText({ line, compact = false }) {
	return (
		<span className="sp-stacked or-line">
			{line.url
				? <a className="sp-title sp-truncate" href={line.url} target="_blank" rel="noopener">{line.title}</a>
				: <span className="sp-title sp-truncate">{line.title}</span>}
			<span className={compact ? 'sp-subtitle' : 'sp-subtitle sp-truncate'}>{lineMeta(line, compact)}</span>
		</span>
	)
}

/** A line's photo at the row's size, or c2's empty photo mark when it has none (17d). */
export function LinePhoto({ src, name, onOpen }) {
	if (!src) return <Mark size="medium" fill="empty" aria-label="No photo" aria-hidden="true"><Icon name="photo" size={16} /></Mark>
	if (onOpen) return <Mark size="medium" fill="photo" goods aria-label={`Open the photo of ${name}`} onClick={onOpen}><img src={src} alt="" /></Mark>
	return <Mark size="medium" fill="photo" goods aria-label={`Photo of ${name}`}><img src={src} alt="" /></Mark>
}

export const itemPhoto = (orderId, item) => {
	const photo = item.attachments?.[0]
	return photo?.hasThumbnail ? itemAttachmentThumbnailUrl(orderId, item.id, photo.id) : null
}

const kindOf = file => (file.kind === 'pdf' ? 'PDF' : String(file.name).split('.').pop().toUpperCase().slice(0, 4))

/** What the viewer needs to page through a stored PDF (12b): its pages, or how to count them. */
export const pagesOf = (orderId, file) => (file.kind === 'pdf'
	? {
		pages: file.pages ?? null,
		pageSrc: i => attachmentPageUrl(orderId, file.id, i),
		countPages: () => getAttachmentPages(orderId, file.id).then(r => r.pages)
	}
	: {})

/** The order's files as the viewer walks them: its attachments, then its lines' photos. */
export function filesOf(order) {
	const files = order.attachments.map(a => ({
		key: a.id,
		name: a.name,
		kind: a.kind,
		src: a.kind === 'pdf' ? attachmentPageUrl(order.id, a.id, 0) : attachmentFileUrl(order.id, a.id),
		zoomSrc: a.kind === 'pdf' ? undefined : attachmentDownloadUrl(order.id, a.id),
		download: attachmentDownloadUrl(order.id, a.id),
		...pagesOf(order.id, a)
	}))
	for (const item of order.items) {
		const photo = item.attachments?.[0]
		if (photo) files.push({
			key: photo.id,
			name: item.title,
			kind: photo.kind,
			src: photo.kind === 'pdf' ? attachmentPageUrl(order.id, photo.id, 0) : itemAttachmentFileUrl(order.id, item.id, photo.id),
			download: itemAttachmentFileUrl(order.id, item.id, photo.id),
			...pagesOf(order.id, photo)
		})
	}
	return files
}

/** One attachment in the strip: `problem` says why it cannot be kept (17b), `sending` is the part sent,
    0 to 1 (17a), and `twin` warns that the same file is already there. */
export function AttachmentTile({ name, kind, thumb, problem, sending, twin = false, onOpen, onRemove, bare = false }) {
	const label = kindOf({ name, kind })
	const remove = onRemove
		? <MarkRemove aria-label={`Remove ${name}`} onClick={onRemove}><Icon name="x" size={11} /></MarkRemove>
		: null
	const named = onOpen ? `Open ${name}` : name
	let mark
	if (sending !== undefined) {
		const part = `${Math.round(sending * 100)}%`
		mark = (
			<Mark size="xlarge" fill="photo" aria-label={`${name}, ${part} sent`} remove={remove}>
				{thumb ? <img src={thumb} alt="" /> : null}
				<Spinner />
			</Mark>
		)
		return bare ? mark : <Attachment name={part}>{mark}</Attachment>
	}
	if (problem === 'Upload failed')
		mark = (
			<Mark size="xlarge" fill="photo" danger="Retry" aria-label={`${name} was not sent. Send it again`} onClick={onOpen} remove={remove}>
				{thumb ? <img src={thumb} alt="" /> : null}
			</Mark>
		)
	else if (problem)
		mark = (
			<Mark size="xlarge" fill="photo" danger={problem} aria-label={`${name}: ${problem.toLowerCase()}`} remove={remove}>
				{thumb ? <img src={thumb} alt="" /> : null}
			</Mark>
		)
	else if (twin)
		mark = (
			<Mark size="xlarge" fill={thumb ? 'photo' : 'none'} text="Added twice" aria-label={`${named}. This file is already on the order`} onClick={onOpen} remove={remove}>
				{thumb ? <img src={thumb} alt="" /> : <span>{label}</span>}
			</Mark>
		)
	else if (thumb)
		mark = (
			<Mark size="xlarge" fill="photo" text={kind === 'pdf' ? 'PDF' : undefined} aria-label={named} onClick={onOpen} remove={remove}>
				<img src={thumb} alt="" />
			</Mark>
		)
	else
		mark = (
			<Mark size="xlarge" fill="none" aria-label={named} onClick={onOpen} remove={remove}>
				<span>{label}</span>
			</Mark>
		)
	// on a phone the tile stands alone, without its name under it (1c)
	return bare ? mark : <Attachment name={name}>{mark}</Attachment>
}

/* An empty text of the line's own type sizes a skeleton line to the real one exactly. */
const strut = role => <span className={role} aria-hidden="true">{'\u200b'}</span>
// a box a field or a button will fill, at its own height; `small` is a commit's
const control = (key, small = false) => <div key={key} className={small ? 'or-control or-control--small' : 'or-control'}><Skeleton shape="bar" /></div>

const rowsLoading = n => Array.from({ length: n }, (_, i) => (
	<ListItem key={i} mark={<Skeleton shape="mark" />}>
		<span className="sp-stacked sp-grow">
			<Skeleton shape="line" data-w="62pc" data-h="13" />
			<Skeleton shape="line" data-w="44pc" data-h="10" />
		</span>
		<Skeleton shape="end" data-w="88" data-h="13" />
	</ListItem>
))

/** The page while the order loads: its cards at their own size, so nothing jumps (6b). `form`
    is the edit and create screen's shape, else the read view's. */
export function OrderLoading({ region = false, form = false }) {
	const touch = useShellShape() === 'touch'
	const fieldLoading = key => (
		<div key={key} className="sp-stack sp-gap-6">
			<Skeleton shape="line" data-w="60" data-h="18" />
			{control()}
		</div>
	)
	// a total's figure is an empty text at its own size, so the row keeps the figure's height
	const sum = (label, variant) => (
		<Sum key={label} variant={variant} value={variant ? '\u200b' : <Skeleton shape="line" data-w="88" data-h="13" />}>{label}</Sum>
	)
	const items = (
		<Card aria-busy="true" aria-label="Loading the order">
			{form
				? <div className="sp-row-flex sp-gap-8"><span className="sp-section-label">Items</span>{touch ? <><span className="sp-grow" />{control('reorder', true)}</> : null}</div>
				: <div className="sp-row-flex sp-gap-12"><span className="sp-section-label">Items</span><Skeleton shape="line" data-w="130" data-h="13" /><span className="sp-grow" /><Skeleton shape="line" data-w="74" data-h="22" /></div>}
			<div className="sp-stack sp-gap-8">
				{rowsLoading(3)}
				{form ? <ListItem mark={<Skeleton shape="mark" />}><Skeleton shape="line" data-w="88" data-h="13" /></ListItem> : null}
			</div>
			{form ? null : <Totals>{strut('sp-strong')}<Skeleton shape="line" data-w="130" data-h="13" /><span className="sp-grow" /><Skeleton shape="line" data-w="104" data-h="13" /></Totals>}
		</Card>
	)
	const attachments = form
		? (
			<Card aria-hidden="true">
				<span className="sp-section-label">Attachments</span>
				<div className="or-tiles">{control()}</div>
			</Card>
		)
		: null
	let rail
	if (form && touch)
		rail = (
			<Card variant="flush" aria-hidden="true">
				<Toolbar>
					<span className="sp-stacked sp-grow">
						<span className="sp-title">Order details</span>
						<Skeleton shape="line" data-w="130" data-h="13" />
					</span>
				</Toolbar>
			</Card>
		)
	else if (form)
		rail = (
			<>
				<Card aria-hidden="true">
					<div className="sp-row-flex sp-gap-8"><span className="sp-section-label">Order details</span></div>
					{fieldLoading('vendor')}
					<div className="sp-fields">{fieldLoading('date')}{fieldLoading('kind')}</div>
					{fieldLoading('status')}
					{fieldLoading('categories')}
					<div className="sp-fields">{fieldLoading('discount')}{fieldLoading('shipping')}</div>
					<div className="sp-fields">{fieldLoading('reference')}{fieldLoading('note')}</div>
				</Card>
				<Card aria-hidden="true" footer={[control('leave', true), control('save', true)]} footerLayout="split" footerCommits>
					<div className="sp-stack">{sum('Total', 'total')}</div>
					<span className="sp-row-flex">{strut('sp-meta')}<Skeleton shape="line" data-w="130" data-h="11" /></span>
					<span className="sp-row-flex">{strut('sp-stat__delta')}<Skeleton shape="line" data-w="104" data-h="11" /></span>
				</Card>
			</>
		)
	else
		rail = (
			<>
				<Card aria-hidden="true">
					<span className="sp-section-label">Order details</span>
					<div className="sp-stack">{['Vendor', 'Date', 'Kind', 'Categories', 'Reference'].map(k => sum(k))}</div>
				</Card>
				<Card aria-hidden="true" footer={[control('copy', true), control('edit', true)]} footerLayout="split" footerCommits
					after={control('delete', true)}>
					<span className="sp-section-label">Totals</span>
					<div className="sp-stack">{['Items', 'Discount', 'Shipping'].map(k => sum(k))}{sum('Total', 'total')}</div>
					<span className="sp-row-flex">{strut('sp-stat__delta')}<Skeleton shape="line" data-w="104" data-h="11" /></span>
				</Card>
			</>
		)
	const bar = form && touch ? <SaveBar aria-hidden="true">{control('leave')}{control('save')}</SaveBar> : null
	if (touch) return <div className="sp-stack sp-gap-12">{items}{attachments}{rail}{bar}</div>
	const split = <><div className="sp-stack sp-gap-12">{items}{attachments}</div><Panel>{rail}</Panel></>
	return region ? <div className="sp-shell__body--split">{split}</div> : split
}

export function OrderFailed({ what = 'This order', error, retry }) {
	return <Failed what={what} error={error} onRetry={retry} back={{ to: '/orders', label: 'Open the order list' }} />
}
