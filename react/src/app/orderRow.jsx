import { createContext, useContext, useMemo } from 'react'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { getOverLimitCategories, itemAttachmentThumbnailUrl, scanThumbnailUrl, vendorImageUrl } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { currency, morePhotos, plural, today } from '../api/format.js'
import { Saving } from './saving.jsx'
import { TONES, useStatuses, useStatusTypes } from './statuses.js'

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
	// a draft's photo is one sent to it, or one a copy carried from its order
	const { key, orderId = order.id, itemId, attachmentId } = order.photo
	const src = key ? scanThumbnailUrl(key) : itemAttachmentThumbnailUrl(orderId, itemId, attachmentId)
	return (
		<Mark size="medium" fill="photo" goods count={more} aria-label={`Photo from ${order.vendor?.name ?? 'this order'}`} aria-hidden="true">
			<img src={src} alt="" />
		</Mark>
	)
}

/** The paperclip after a row's item line (2b): only when a file is on the order itself. */
export function OrderFiles({ count }) {
	if (!count) return null
	const label = plural(count, 'attachment')
	return <Mark size="small" role="img" aria-label={label} title={label}><Icon name="paperclip" size={12} /></Mark>
}

/** The note mark beside the paperclip: only when the order has a note, which it shows on hover. */
export function OrderNote({ note }) {
	if (!note) return null
	return <Mark size="small" role="img" aria-label={`Note: ${note}`} title={note}><Icon name="note" size={12} /></Mark>
}

/* A cancelled order did not happen, so its amount is struck and says it is not counted, where a
   saving would stand (2b). */
export function OrderAmount({ order }) {
	const { typeOf } = useStatusTypes()
	// a draft whose lines have no prices yet has no total, and its cell stays empty (10a)
	if (order.total == null) return null
	if (typeOf(order.status) === 'cancelled')
		return <><span className="sp-amount sp-void">{currency(order.total)}</span><span className="sp-amount-secondary">not counted</span></>
	return <><span className="sp-amount">{currency(order.total)}</span><Saving value={order.saved} /></>
}

/** What a row is called: its vendor, or for a draft its file, or "New order" while it has neither (10a). */
export const vendorName = order => order.vendor?.name || order.draft?.file?.name || (order.draft ? 'New order' : 'No vendor')

/** The line under an order's vendor: how many items it has. */
export const orderLine = order => plural(order.itemCount, 'item')

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

/** The columns an order table keeps at its own width (2i): Categories goes at 880 and under. */
export const columnsFor = width => ({ categories: width > 880 })

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
export function useOverLimitIds(date) {
	const given = useContext(OverLimitList)
	const own = useOverLimit(given === null)
	// the dot speaks of this month, so an order of another month carries none
	return date && date.slice(0, 7) !== today().slice(0, 7) ? NONE : given ?? own
}

/** The mark a category over its limit carries wherever it is named (8b, c19). */
export function OverLimitDot() {
	return <span className="sp-combobox__dot" data-dot="problem" role="img" aria-label="over its limit this month" title="Over its limit this month" />
}

/* Two categories fit a row; past two the first stands for the rest, its count carrying their mark (2b,
   8b). One line always: a long name truncates inside its chip rather than wrapping the row (2i). */
export function CategoryChips({ categories, date }) {
	const over = useOverLimitIds(date)
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
