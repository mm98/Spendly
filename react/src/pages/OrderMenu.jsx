import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { IconButton } from '../components/Button.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Anchor, Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Record } from '../components/List.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { useDismiss } from '../components/Utilities.jsx'
import { attachmentFileUrl, changeOrders, failureMessage, getCategories, invalidateOrderData, itemAttachmentThumbnailUrl } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { currency, dot, plural, shortDate } from '../api/format.js'
import { StatusPill, orderLine } from '../app/orderRow.jsx'
import { useStatuses } from '../app/statuses.js'
import { Saving } from '../app/saving.jsx'

// the dot a status carries in a pick list, by its tone (2e)
const DOT = { success: 'done', progress: 'progress', danger: 'returned', neutral: 'draft' }

// a category search appears once there are more than this many (2e)
const SEARCH_FROM = 7

export const orderName = order => [order.vendor?.name ?? 'No vendor', order.reference, shortDate(order.date)].filter(Boolean).join(', ')

/** Saves a file the server already holds, under the name it was stored with. */
export function download(href) {
	const link = document.createElement('a')
	link.href = href
	link.download = ''
	document.body.append(link)
	link.click()
	link.remove()
}

/** One order's menu (2e), the same in a row and on a card (2c). A status or category applies at
    once and offers Undo. On touch the menu is a sheet, so a flyout opens in its place. */
function OrderMenuItems({ order, touch, close, onDelete }) {
	const navigate = useNavigate()
	const toast = useToast()
	const statuses = useStatuses()
	const categories = useApi(getCategories)
	const [level, setLevel] = useState('main')
	const [find, setFind] = useState('')
	// what the category ticks have changed since the menu opened, so one toast undoes them all
	const changes = useRef({ added: [], removed: [] })
	const [has, setHas] = useState(() => new Set(order.categories.map(c => c.id)))

	const go = to => () => { close(); navigate(to) }
	const fail = (e, what) => toast({ message: failureMessage(e, what), color: 'danger' })

	const setStatus = status => {
		close()
		if (status === order.status) return
		const before = order.status
		const name = statuses.find(s => s.key === status)?.name ?? status
		changeOrders({ ids: [order.id], status })
			.then(() => {
				invalidateOrderData()
				toast({
					message: `Status set to ${name}.`,
					undo: { onClick: () => changeOrders({ ids: [order.id], status: before }).then(invalidateOrderData, e => fail(e, 'The status was not changed back. Try again.')) }
				})
			})
			.catch(e => fail(e, 'The status was not changed. Try again.'))
	}

	const tick = (category, on) => {
		const next = new Set(has)
		if (on) next.add(category.id); else next.delete(category.id)
		setHas(next)
		const c = changes.current
		if (on) { c.removed = c.removed.filter(x => x.id !== category.id); if (!order.categories.some(x => x.id === category.id)) c.added.push(category) }
		else { c.added = c.added.filter(x => x.id !== category.id); if (order.categories.some(x => x.id === category.id)) c.removed.push(category) }
		const added = [...c.added], removed = [...c.removed]
		changeOrders(on ? { ids: [order.id], addCategories: [category.name] } : { ids: [order.id], removeCategories: [category.id] })
			.then(() => {
				invalidateOrderData()
				const words = [added.length ? `Added ${added.map(x => x.name).join(', ')}.` : '', removed.length ? `Removed ${removed.map(x => x.name).join(', ')}.` : ''].filter(Boolean).join(' ')
				if (!words) return
				toast({
					message: words,
					undo: {
						onClick: () => changeOrders({ ids: [order.id], addCategories: removed.map(x => x.name), removeCategories: added.map(x => x.id) })
							.then(invalidateOrderData, e => fail(e, 'The categories were not changed back. Try again.'))
					}
				})
			})
			.catch(e => fail(e, 'The category was not changed. Try again.'))
	}

	const statusItems = statuses.map(s => (
		<MenuItem key={s.key} dot={DOT[s.tone] ?? 'draft'} onClick={() => setStatus(s.key)} {...(s.key === order.status ? { 'aria-current': 'true' } : {})}>
			<span>{s.name}</span>
			{s.key === order.status
				? <><span className="sp-grow" /><span className="sp-meta">current</span><span className="sp-combobox__check"><Icon name="check" size={13} /></span></>
				: null}
		</MenuItem>
	))

	const all = categories.data ?? []
	const shown = find ? all.filter(c => c.name.toLowerCase().includes(find.toLowerCase())) : all
	const categoryItems = (
		<>
			{all.length >= SEARCH_FROM
				? <li role="none"><SearchInput value={find} onChange={setFind} placeholder="Find a category…" aria-label="Find a category" /></li>
				: null}
			{/* the search and Create stay put; only the categories between them scroll, as 2a's picker does */}
			<li role="none" className="sp-popover__list">
				{shown.map(c => (
					<Choice key={c.id} variant="row" control={<Check checked={has.has(c.id)} onChange={ev => tick(c, ev.target.checked)} />}>
						<span className="sp-truncate">{c.name}</span>
						<span className="sp-grow" />
						<span className="sp-meta sp-nowrap">{plural(c.orders ?? 0, 'order')}</span>
					</Choice>
				))}
			</li>
			<MenuSeparator />
			<MenuItem icon="plus" onClick={go(`/categories/new${find ? `?name=${encodeURIComponent(find)}` : ''}`)}>Create a category</MenuItem>
		</>
	)

	if (touch && level === 'status')
		return <Menu position="floating" aria-label="Set status"><MenuItem icon="chevron-left" onClick={() => setLevel('main')}>Back</MenuItem><MenuSeparator />{statusItems}</Menu>
	if (touch && level === 'category')
		return <Menu position="floating" aria-label="Add category"><MenuItem icon="chevron-left" onClick={() => setLevel('main')}>Back</MenuItem><MenuSeparator />{categoryItems}</Menu>

	return (
		<Menu position="floating" aria-label="Order">
			<MenuItem icon="external-link" onClick={go(`/orders/${order.id}`)}>Open order</MenuItem>
			<MenuItem icon="file" onClick={go(`/orders/new?duplicate=${order.id}`)}>Duplicate</MenuItem>
			<MenuItem icon="download" disabled={!order.receipt} onClick={() => { close(); download(attachmentFileUrl(order.id, order.receipt)) }}>Download receipt</MenuItem>
			<MenuSeparator />
			{touch
				? <MenuItem icon="clock" onClick={() => setLevel('status')}><span>Set status</span><span className="sp-grow" /><ChevronRight /></MenuItem>
				: (
					<MenuItem icon="clock">
						<span>Set status</span><span className="sp-grow" /><ChevronRight />
						<Menu position="sub" aria-label="Set status">{statusItems}</Menu>
					</MenuItem>
				)}
			{touch
				? <MenuItem icon="tag" onClick={() => setLevel('category')}><span>Add category</span><span className="sp-grow" /><ChevronRight /></MenuItem>
				: (
					<MenuItem icon="tag">
						<span>Add category</span><span className="sp-grow" /><ChevronRight />
						<Menu position="sub" aria-label="Add category">{categoryItems}</Menu>
					</MenuItem>
				)}
			<MenuSeparator />
			<MenuItem icon="trash" danger onClick={() => { close(); onDelete(order) }}>Delete order</MenuItem>
		</Menu>
	)
}

function ChevronRight() {
	return <Icon name="chevron-right" size={13} />
}

/** The row's own menu (2b, 2e). */
export function RowMenu({ order, touch, onDelete }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={`Order menu, ${orderName(order)}`}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open ? <OrderMenuItems order={order} touch={touch} close={close} onDelete={onDelete} /> : null}
		</Anchor>
	)
}

/** One order as a card (2c): its first three line photos, then the row's facts; the card's menu
    is the row's menu, and its box picks it as a row's does. */
export function OrderCard({ order, touch, picked, onPick, menuOpen, onMenu, onOpen, onDelete, onCategory }) {
	const photos = order.photos ?? []
	const more = order.photoCount > photos.length ? `+${order.photoCount - photos.length}` : null
	return (
		<Record
			onClick={() => onOpen(order)}
			photos={photos.map(p => <img key={p.attachmentId} src={itemAttachmentThumbnailUrl(order.id, p.itemId, p.attachmentId)} alt="" />)}
			empty="No photos"
			more={more}
			pick={<Check checked={picked} aria-label={`Select ${orderName(order)}`} onClick={ev => ev.stopPropagation()} onChange={ev => onPick(ev.nativeEvent?.shiftKey)} />}
			title={order.vendor?.name ?? 'No vendor'}
			subtitle={orderLine(order)}
			status={<StatusPill status={order.status} />}
			chips={order.categories.length
				? order.categories.map(c => <Chip key={c.id} onClick={() => onCategory(c.id)}>{c.name}</Chip>)
				: <Chip variant="dashed">No category</Chip>}
			meta={[
				<span key="when" className="sp-subtitle">{shortDate(order.date)}{dot}{plural(order.itemCount, 'item')}</span>,
				<Saving key="saved" value={order.saved} />
			]}
			amount={currency(order.total)}
			menu={{
				open: menuOpen,
				label: `Order menu, ${orderName(order)}`,
				onToggle: () => onMenu(menuOpen ? null : order.id),
				onClose: () => onMenu(null),
				children: menuOpen ? <OrderMenuItems order={order} touch={touch} close={() => onMenu(null)} onDelete={onDelete} /> : null
			}}
		/>
	)
}
