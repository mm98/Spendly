import { createContext, useContext, useMemo } from 'react'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { getOverLimitCategories, itemAttachmentThumbnailUrl, vendorImageUrl } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { dot, morePhotos, plural } from '../api/format.js'
import { TONES, useStatuses } from './statuses.js'

/** An order row's picture (2b): its first line photo with the rest counted over it, the vendor's
    image faded, or the empty photo mark of c2. Hidden from a screen reader: the vendor names it. */
export function OrderPhoto({ order }) {
	// the vendor's image stands in as the photo, faded, and counts as no photo (17e)
	if (!order.photo && order.vendorImage) return (
		<Mark size="medium" fill="photo" goods faded aria-label={`Image of ${order.vendor?.name ?? 'the vendor'}`} aria-hidden="true">
			<img src={vendorImageUrl(order.vendorImage.vendorId, order.vendorImage.hash, 'square-256')} alt="" />
		</Mark>
	)
	if (!order.photo) return <Mark size="medium" fill="empty" aria-label="No photo" aria-hidden="true"><Icon name="photo" size={16} /></Mark>
	const more = order.photoCount > 1 ? morePhotos(order.photoCount - 1) : null
	return (
		<Mark size="medium" fill="photo" goods count={more} aria-label={`Photo from ${order.vendor?.name ?? 'this order'}`} aria-hidden="true">
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

const NONE = new Set()

/** The categories over their monthly limit this month (8b), as ids: none until the answer is in.
    The same read as the palette's Orders over limit, so the two share their answer. */
export function useOverLimit(enabled = true) {
	const over = useApi(getOverLimitCategories, [], { enabled }).data
	return useMemo(() => (over ? new Set(over.map(c => c.id)) : NONE), [over])
}

/* A list that names many categories asks once, here, for every chip in it; a chip with no list
   around it asks for itself. */
const OverLimitList = createContext(null)
export function OverLimitProvider({ children }) {
	return <OverLimitList.Provider value={useOverLimit()}>{children}</OverLimitList.Provider>
}
export function useOverLimitIds() {
	const given = useContext(OverLimitList)
	const own = useOverLimit(given === null)
	return given ?? own
}

/** The mark a category over its limit carries wherever it is named (8b, c19). */
export function OverLimitDot() {
	return <span className="sp-combobox__dot" data-dot="problem" role="img" aria-label="over its limit this month" title="Over its limit this month" />
}

/* Two categories fit a row; past two the first stands for the rest, its count carrying their mark (2b,
   8b). One line always: a long name truncates inside its chip rather than wrapping the row (2i). */
export function CategoryChips({ categories }) {
	const over = useOverLimitIds()
	if (!categories.length) return <div className="sp-row-flex sp-gap-6"><Chip variant="dashed">No category</Chip></div>
	const shown = categories.length > 2 ? categories.slice(0, 1) : categories
	const rest = categories.slice(shown.length)
	return (
		<div className="sp-row-flex sp-gap-6">
			{shown.map(c => (
				<span key={c.id} className="ol-chip-slot">
					<Chip trail={over.has(c.id) ? <OverLimitDot /> : undefined}>{c.name}</Chip>
				</span>
			))}
			{rest.length
				? <span className="sp-flex-none"><Chip trail={rest.some(c => over.has(c.id)) ? <OverLimitDot /> : undefined}>{`+${rest.length}`}</Chip></span>
				: null}
		</div>
	)
}
