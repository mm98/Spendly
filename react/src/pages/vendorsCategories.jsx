import { useCallback, useEffect, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, Panel } from '../components/Card.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Icon } from '../components/Icon.jsx'
import { TokensField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked, useDismiss } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import { failureMessage, getCategories, getOrders } from '../api/client.js'
import { currency, plural, shortDate } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'

/* What the Library's lists (Vendors, Categories, Bookmarks) and their forms share: the colour a
   record stores, the mark it is drawn with, the bars above and around a list, and the parts of a record's form. */

export const DOT = ' · '

export { SWATCHES, swatchOf, storedColour, CategoryMark } from '../app/categoryMark.jsx'
/** A stored colour as the colour picker's value: one of the eight by name, or the colour itself. */
export { swatchOf as pickedColour } from '../app/categoryMark.jsx'

/** Where the month stands today, as a share of it: the gauge's pace marker. */
export function monthPace(now = new Date()) {
	const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	return { day: now.getDate(), days, at: (now.getDate() / days) * 100 }
}

/** The bar's sort, a Combobox that only picks (c8). */
export function SortControl({ sorts, value, onChange }) {
	const [open, setOpen] = useState(false)
	const current = sorts.find(s => s.id === value) ?? sorts[0]
	return (
		<Combobox variant="sort" aria-label="Sort" lead={<span className="sp-combobox__chevron">Sort</span>}
			value={current.label} open={open} onOpenChange={setOpen}>
			{sorts.map(s => (
				<ComboboxOption key={s.id} selected={s.id === current.id}
					onSelect={() => { setOpen(false); onChange(s.id) }}>
					{s.label}
				</ComboboxOption>
			))}
		</Combobox>
	)
}

/** A row's kebab and its menu. A click inside stays out of the row, which opens the record. The
    button names its row (c9), so a list of the page's buttons tells the rows apart. */
export function RowMenu({ noun, label, open, onToggle, onClose, children }) {
	const box = useRef(null)
	useDismiss(box, open, onClose)
	return (
		<Anchor ref={box} open={open} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={`${noun} menu, ${label}`} aria-haspopup="menu"
				aria-expanded={open ? 'true' : 'false'} onClick={onToggle} />
			<Menu position="floating" aria-label={label}>{children}</Menu>
		</Anchor>
	)
}

/** A list still on its way: the loading card of c13, a row per record. */
export function ListLoading() {
	return (
		<Card aria-busy="true">
			<div className="sp-stack sp-gap-12">
				{[0, 1, 2].map(n => (
					<div className="sp-row-flex sp-gap-12" key={n}>
						<Skeleton shape="mark" />
						<span className="sp-stack sp-gap-8 sp-grow">
							<Skeleton shape="title" />
							<Skeleton shape="short" />
						</span>
					</div>
				))}
			</div>
		</Card>
	)
}

/** A read that failed, with the one action that can fix it: asking again, or for a record that
    is gone, going back to the list it was in. */
export function Failed({ title, error, onRetry, list }) {
	const gone = error?.status === 404 && list
	return (
		<Card>
			<Empty>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyBody>{gone ? 'It may have been deleted.' : failureMessage(error, 'The connection failed. Check it and try again.')}</EmptyBody>
				{gone
					? <Button variant="outline" size="small" to={list.to}>{list.label}</Button>
					: <Button variant="outline" size="small" onClick={onRetry}>Try again</Button>}
			</Empty>
		</Card>
	)
}

/** A record's form while the record is on its way: the form's column and the rail. */
export function FormLoading() {
	const touch = useShellShape() === 'touch'
	return (
		<>
			<div className="sp-stack sp-gap-12">
				<Card aria-busy="true">
					<Skeleton shape="short" />
					<Skeleton shape="line" />
				</Card>
			</div>
			{touch ? null : <Panel>
				<Card aria-busy="true">
					<div className="sp-row-flex sp-gap-12">
						<Skeleton shape="mark" />
						<span className="sp-stack sp-gap-8 sp-grow">
							<Skeleton shape="title" />
							<Skeleton shape="short" />
						</span>
					</div>
				</Card>
			</Panel>}
		</>
	)
}

/** An irreversible delete, confirmed in a dialog that names what goes (6d). */
export function ConfirmDelete({ title, action, busy, onConfirm, onCancel, children }) {
	return (
		<Dialog onCancel={onCancel}>
			<DialogTitle>{title}</DialogTitle>
			<DialogBody>{children}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={onConfirm}>{action}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** What deleting a vendor takes with it. Only a vendor with no orders can be deleted. */
export const deleteNote = vendor => {
	const n = vendor.aliases?.length ?? 0
	if (!n) return 'It has no orders.'
	return n === 1
		? 'It has no orders. The other name it matches on receipts goes with it.'
		: `It has no orders. The ${n} other names it matches on receipts go with it.`
}

/** What deleting a category takes with it. Only one no order or bookmark carries can be deleted. */
export const categoryDeleteNote = budget => (budget > 0
	? `No order or bookmark carries it. Its limit of ${currency(budget, 0)} goes with it.`
	: 'No order or bookmark carries it.')

/** What deleting a bookmark takes with it, and the way to keep it instead. */
export const bookmarkDeleteNote = 'The bookmark and its picture are removed. To keep it off the list without losing it, archive it instead.'

/** Holds the page while the form has changes: in-app navigation asks first, and a reload or a
    closed tab gets the browser's own question. `release` lets a finished save leave. */
export function useLeaveGuard(dirty, within) {
	const released = useRef(false)
	const live = useRef(dirty)
	live.current = dirty
	// pages under `within` share the changes, so moving among them does not ask
	const stays = path => within != null && (path === within || path.startsWith(within + '/'))
	const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) =>
		live.current && !released.current && currentLocation.pathname !== nextLocation.pathname && !stays(nextLocation.pathname), [within]))
	useBeforeUnload(useCallback(ev => {
		if (live.current && !released.current) { ev.preventDefault(); ev.returnValue = '' }
	}, []))
	const prompt = blocker.state === 'blocked'
		? (
			<Dialog onCancel={() => blocker.reset()}>
				<DialogTitle>Leave without saving?</DialogTitle>
				<DialogBody>Your changes on this page are not saved. If you leave now, they are lost.</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => blocker.reset()}>Keep editing</Button>
					<span className="sp-grow" />
					<Button color="danger" onClick={() => blocker.proceed()}>Leave</Button>
				</DialogActions>
			</Dialog>
		)
		: null
	return { prompt, release: () => { released.current = true } }
}

/** Moves focus to the first field the save refused, so pressing Save always does something. */
export function focusFirst(ids) {
	for (const id of ids) {
		const el = id && document.getElementById(id)
		if (el) { el.focus(); return }
	}
}

/** The two newest orders behind a record, and the way to all of them (5c, 5f). */
export function RecentOrders({ filter, to, total }) {
	const recent = useApi(getOrders, [{ ...filter, pageSize: 2 }])
	const orders = recent.data?.orders ?? []
	if (!total || !orders.length) return null
	return (
		<Card>
			<span className="sp-section-label">Recent orders</span>
			{orders.map(order => <RecentOrder key={order.id} order={order} />)}
			<Button variant="outline" size="small" to={to}>See all {plural(total, 'order')}</Button>
		</Card>
	)
}

function RecentOrder({ order }) {
	return (
		<ListItem to={`/orders/${order.id}`}>
			<Stacked>
				<span className="sp-title sp-truncate">{order.reference || 'No reference yet'}</span>
				<span className="sp-meta">{shortDate(order.date)}{DOT}{plural(order.itemCount, 'item')}</span>
			</Stacked>
			<span className="sp-title sp-nowrap">{currency(order.total)}</span>
		</ListItem>
	)
}

/** Categories typed as tokens and picked from the one set; a name it does not hold is offered as
    Create "…" and becomes a category when the form is saved (22c). */
export function CategoryTokens({ value, onChange, ...rest }) {
	const categories = useApi(getCategories)
	const [typing, setTyping] = useState('')
	const known = categories.data ?? []
	const same = (a, b) => a.toLowerCase() === b.toLowerCase()
	// a typed name takes the spelling of the category it names, and names it once
	const change = next => {
		const out = []
		for (const typed of next) {
			const named = known.find(c => same(c.name, typed))?.name ?? typed
			if (!out.some(n => same(n, named))) out.push(named)
		}
		onChange(out)
	}
	const query = typing.trim()
	const matches = known.filter(c => !value.some(n => same(n, c.name)) && c.name.toLowerCase().includes(query.toLowerCase()))
	const exists = [...value, ...known.map(c => c.name)].some(n => same(n, query))
	return (
		<TokensField value={value} onChange={change} onSearch={setTyping} placeholder="Add…" aria-label="Add a category" {...rest}>
			{[
				...matches.map(c => <ComboboxOption key={c.id} onSelect={() => change([...value, c.name])}>{c.name}</ComboboxOption>),
				query && !exists
					? <ComboboxOption key="create" mark={<Icon name="plus" size={13} />} onSelect={() => change([...value, query])}>Create "{query}"</ComboboxOption>
					: null
			]}
		</TokensField>
	)
}

/** A list's own paging below 640, where the rows are cards: the loose footer under them. */
export function usePaged(rows, size, resetKey) {
	const [shown, setShown] = useState(size)
	useEffect(() => { setShown(size) }, [resetKey, size])
	return { page: rows.slice(0, shown), more: rows.length > shown, showMore: () => setShown(s => s + size) }
}
