import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { itemAttachmentThumbnailUrl } from '../api/client.js'
import { dot, plural } from '../api/format.js'
import { TONES, useStatuses } from './statuses.js'

/** An order row's picture (2b): its first line photo with the rest counted over it, or the
    dashed box of an order with none. Hidden from a screen reader: the row's vendor names it. */
export function OrderPhoto({ order }) {
	if (!order.photo) return <Mark size="medium" fill="empty" aria-label="No photo" aria-hidden="true" />
	const more = order.photoCount > 1 ? `+${order.photoCount - 1}` : null
	return (
		<Mark size="medium" fill="photo" count={more} aria-label={`Photo from ${order.vendor?.name ?? 'this order'}`} aria-hidden="true">
			<img src={itemAttachmentThumbnailUrl(order.id, order.photo.itemId, order.photo.attachmentId)} alt="" />
		</Mark>
	)
}

/** The paperclip after a row's reference line (2b): only when a file is on the order itself. */
export function OrderFiles({ count }) {
	if (!count) return null
	const label = plural(count, 'attachment')
	return <Mark size="small" role="img" aria-label={label} title={label}><Icon name="paperclip" size={12} /></Mark>
}

/** The line under an order's vendor: its reference and its note (2b). */
export const orderLine = order => [order.reference || 'No reference yet', order.note].filter(Boolean).join(dot)

/** A status as the account names and colours it, or the stored word when it is not known yet. */
export function useStatus(key) {
	const statuses = useStatuses()
	return statuses.find(s => s.key === key) ?? { key, name: key, tone: 'neutral' }
}

/** An order's status (2b). */
export function StatusPill({ status }) {
	const { name, tone } = useStatus(status)
	const look = TONES[tone] ?? {}
	return <Pill color={look.color} state={look.state}>{name}</Pill>
}

/** The columns an order table keeps at its own width (2i): Items goes at 1040 and under, Categories at 880. */
export const columnsFor = width => ({ items: width > 1040, categories: width > 880 })

/* Two categories fit a row; past two the first stands for the rest, with their count (2b).
   One line always: a long name truncates inside its chip rather than wrapping the row (2i). */
export function CategoryChips({ categories }) {
	if (!categories.length) return <div className="sp-row-flex sp-gap-6"><Chip variant="dashed">No category</Chip></div>
	const shown = categories.length > 2 ? categories.slice(0, 1) : categories
	return (
		<div className="sp-row-flex sp-gap-6">
			{shown.map(c => <span key={c.id} className="ol-chip-slot"><Chip><span className="sp-truncate">{c.name}</span></Chip></span>)}
			{categories.length > 2 ? <span className="sp-flex-none"><Chip>{`+${categories.length - 1}`}</Chip></span> : null}
		</div>
	)
}
