import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Check, Choice, FieldGroup, FieldGroupMore, FieldGroupPanel } from '../components/Choice.jsx'
import { Chip } from '../components/Chip.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { DateField } from '../components/DatePickers.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { RangeSlider, SearchInput } from '../components/Inputs.jsx'
import { Caption, Controls, Crumb, Facets, Filters, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Announce, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Menu, MenuItem, MenuSeparator } from '../components/Overlays.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Empty, EmptyBody, EmptyTitle, Line, Skeleton, Stacked, useDismiss, useFocusTrap } from '../components/Utilities.jsx'
import { getCategories, getCurrentUser, getOrders, getSettings, getVendors, spendKinds } from '../api/client.js'
import { peek, useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, activeLocaleCode, amount, currency, dot, plural, shortDate, today } from '../api/format.js'
import { useListMemory } from '../app/listMemory.js'
import { useShellShape, useWidth } from '../app/useMedia.js'
import { OrderPhoto, StatusPill, columnsFor, orderLine } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import { DeleteOrder } from './DeleteOrder.jsx'

const SORTS = [
	{ id: 'date-desc', label: 'Newest first' },
	{ id: 'date-asc', label: 'Oldest first' },
	{ id: 'amount-desc', label: 'Highest total' },
	{ id: 'amount-asc', label: 'Lowest total' },
	{ id: 'vendor-asc', label: 'Vendor A - Z' }
]

const STATUSES = ['Delivered', 'Ordered', 'Returned']

const FACETS = ['vendor', 'category', 'status', 'from', 'to', 'kind', 'min', 'max']
const FILTERS = ['q', ...FACETS]

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const day = (y, m, d) => iso(new Date(y, m, d))

const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(new Date(s + 'T00:00')) === s
const isAmount = s => s !== '' && Number.isFinite(Number(s)) && Number(s) >= 0

/* What the address asks for. A date or an amount the page cannot read, or a range that ends
   before it starts, counts as not set, so a bad link shows the whole list instead of none. */
const readFilters = params => {
	const f = Object.fromEntries([...FILTERS, 'sort'].map(k => [k, params.get(k) ?? '']))
	for (const k of ['from', 'to']) if (!isDay(f[k])) f[k] = ''
	for (const k of ['min', 'max']) if (!isAmount(f[k])) f[k] = ''
	if (f.from && f.to && f.to < f.from) f.from = f.to = ''
	if (f.min && f.max && Number(f.max) < Number(f.min)) f.min = f.max = ''
	return f
}

const withChanges = (params, changes) => {
	const next = new URLSearchParams(params)
	for (const [k, v] of Object.entries(changes)) {
		if (v === '' || v == null) next.delete(k)
		else next.set(k, String(v))
	}
	return next
}

const requestOf = (f, sort) => ({
	query: f.q, vendorId: f.vendor, categoryId: f.category, status: f.status, kind: f.kind,
	from: f.from, to: f.to, minAmount: f.min, maxAmount: f.max, sort
})

/* A preset is a calendar period around today; the URL holds its two dates, and the chip reads
   them back, so a link that carries the same dates lands on the same chip. */
const PRESETS = [
	{ key: 'week', label: 'This week', range: n => { const at = n.getDate() - (n.getDay() + 6) % 7; return [day(n.getFullYear(), n.getMonth(), at), day(n.getFullYear(), n.getMonth(), at + 6)] } },
	{ key: 'month', label: 'This month', range: n => [day(n.getFullYear(), n.getMonth(), 1), day(n.getFullYear(), n.getMonth() + 1, 0)] },
	{ key: 'quarter', label: 'This quarter', range: n => { const q = n.getMonth() - n.getMonth() % 3; return [day(n.getFullYear(), q, 1), day(n.getFullYear(), q + 3, 0)] } },
	{ key: 'year', label: 'This year', range: n => [day(n.getFullYear(), 0, 1), day(n.getFullYear(), 11, 31)] }
]
const presetOf = (from, to) => PRESETS.find(p => { const [a, b] = p.range(new Date()); return a === from && b === to })

/* The server answers at most this many rows at once. */
const MOST = 1000

/* Load more adds one page to those held; a fresh start asks in blocks of whole pages up to MOST.
   Named getOrders so a write that forgets the orders forgets these too (useApi keys by name). */
const loaded = {
	async getOrders(request, size, pages, signal) {
		const before = pages > 1 ? peek(loaded, [request, size, pages - 1]) : null
		if (before && before.orders.length === size * (pages - 1)) {
			const next = await getOrders({ ...request, page: pages, pageSize: size }, signal)
			return { ...next, orders: [...before.orders, ...next.orders] }
		}
		const block = size * Math.max(1, Math.floor(MOST / size))
		const want = size * pages
		const parts = []
		for (let page = 1; (page - 1) * block < want; page++) {
			parts.push(await getOrders({ ...request, page, pageSize: Math.min(block, want) }, signal))
			if (parts.at(-1).orders.length < Math.min(block, want)) break
		}
		return { ...parts.at(-1), orders: parts.flatMap(p => p.orders).slice(0, want) }
	}
}.getOrders

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 864e5) + 1

/** The order list (Order list 2b): the facet rail, then search, sort, what is filtering, and the orders. */
export default function Orders() {
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const f = useMemo(() => readFilters(params), [params])
	const shape = useShellShape()
	const touch = shape === 'touch'
	// the facet rail stands beside the list only on a wide window; below that it is a sheet (18b)
	const railed = shape === 'wide'

	const settings = useApi(getSettings)
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	const highest = useApi(getOrders, [{ sort: 'amount-desc', pageSize: 1 }])
	const reads = useApi(getCurrentUser).data?.scanAiEnabled

	const sort = SORTS.some(s => s.id === f.sort) ? f.sort
		: SORTS.some(s => s.id === settings.data?.sort) ? settings.data.sort : 'date-desc'
	const size = settings.data?.pageSize ?? 10

	// starts from the address itself: the page can still be drawing the one before it, and
	// building on that would undo the change made just before this one
	const update = useCallback(changes => {
		setParams(withChanges(window.location.hash.split('?')[1] ?? '', changes), { replace: true })
	}, [setParams])

	// a new key starts the search field over from the address, dropping text not yet written
	const [searchKey, setSearchKey] = useState(0)
	const search = useCallback(q => update({ q }), [update])

	// a date range typed by hand is held open here, so the crumb and Clear all can close it
	const [custom, setCustom] = useState(false)
	useEffect(() => { if (!f.from && !f.to) setCustom(false) }, [f.from, f.to])
	// every facet goes and the search and sort stay, at every width (c12)
	const clearAll = () => { setCustom(false); update(Object.fromEntries(FACETS.map(k => [k, '']))) }
	const clearSearch = () => { setSearchKey(n => n + 1); update({ q: '' }) }

	const request = requestOf(f, sort)
	// the pages loaded for this history step and these filters, so Back returns to the same rows
	const { pages, setPages, restored } = useListMemory(`orders?${JSON.stringify(request)}`)
	const orders = useApi(loaded, [request, size, pages])
	const loadMore = () => setPages(pages + 1)
	useEffect(() => { if ((orders.data || orders.error) && !orders.loading) restored() }, [orders.data, orders.error, orders.loading, restored])

	const column = useRef(null)
	const width = useWidth(column)
	const narrow = touch || (width > 0 && width <= 640)

	const [deleting, setDeleting] = useState(null)
	// once a deleted order has left the list, focus goes to the menu of the row that took its
	// place, so it never falls back to the top of the page
	const [refocus, setRefocus] = useState(null)
	useEffect(() => {
		if (!refocus || !orders.data || orders.data.orders.some(o => o.id === refocus.id)) return
		setRefocus(null)
		const menus = [...(column.current?.querySelectorAll('button[aria-haspopup="menu"]') ?? [])]
		const target = menus[Math.min(refocus.at, menus.length - 1)] ?? column.current?.querySelector('input, button, a')
		target?.focus()
	}, [refocus, orders.data])
	const [filtersOpen, setFiltersOpen] = useState(false)
	useEffect(() => { if (railed) setFiltersOpen(false) }, [railed])

	// a crumb removed hands focus to the next crumb, else the one before, else Filters or the search
	const [crumbFocus, setCrumbFocus] = useState(null)
	const removing = changes => ev => {
		const all = [...(column.current?.querySelectorAll('.sp-crumb__remove') ?? [])]
		setCrumbFocus({ at: Math.max(0, all.indexOf(ev?.currentTarget)), count: all.length })
		update(changes)
	}
	const clearCrumbs = () => {
		setCrumbFocus({ at: 0, count: column.current?.querySelectorAll('.sp-crumb__remove').length ?? 0 })
		clearAll()
	}

	const vendorName = id => vendors.data?.find(v => v.id === id)?.name ?? 'Vendor'
	const categoryName = id => (id === 'none' ? 'No category' : categories.data?.find(c => c.id === id)?.name ?? 'Category')
	const crumbOf = {
		date: () => {
			if (!f.from && !f.to) return null
			const preset = custom ? null : presetOf(f.from, f.to)
			const label = preset ? preset.label
				: f.from && f.to ? `${shortDate(f.from)} - ${shortDate(f.to)}`
					: f.from ? `From ${shortDate(f.from)}` : `Until ${shortDate(f.to)}`
			return <Crumb key="date" name={preset ? label : 'the date range'} onRemove={ev => { setCustom(false); removing({ from: '', to: '' })(ev) }}>{label}</Crumb>
		},
		status: () => f.status && <Crumb key="status" onRemove={removing({ status: '' })}>{f.status}</Crumb>,
		vendor: () => f.vendor && <Crumb key="vendor" onRemove={removing({ vendor: '' })}>{vendorName(f.vendor)}</Crumb>,
		category: () => f.category && <Crumb key="category" onRemove={removing({ category: '' })}>{categoryName(f.category)}</Crumb>,
		kind: () => f.kind && <Crumb key="kind" onRemove={removing({ kind: '' })}>{f.kind}</Crumb>,
		amount: () => {
			if (!f.min && !f.max) return null
			const label = f.min && f.max ? `${amount(Number(f.min), 0)} - ${currency(Number(f.max), 0)}`
				: f.min ? `From ${currency(Number(f.min), 0)}` : `Up to ${currency(Number(f.max), 0)}`
			return <Crumb key="amount" name="the amount range" onRemove={removing({ min: '', max: '' })}>{label}</Crumb>
		}
	}
	// in the order the filters were applied (c12): a new one joins the end of the address
	const groupOf = k => (k === 'from' || k === 'to' ? 'date' : k === 'min' || k === 'max' ? 'amount' : k)
	const crumbs = [...new Set([...params.keys()].map(groupOf))].map(g => crumbOf[g]?.()).filter(Boolean)
	useEffect(() => {
		if (!crumbFocus || crumbs.length === crumbFocus.count) return
		setCrumbFocus(null)
		const all = [...(column.current?.querySelectorAll('.sp-crumb__remove') ?? [])]
		const target = all[crumbFocus.at] ?? all[crumbFocus.at - 1]
			?? column.current?.querySelector('button[aria-haspopup="dialog"]') ?? column.current?.querySelector('input')
		target?.focus()
	}, [crumbFocus, crumbs.length])

	const facetData = {
		// an archived vendor leaves the facet, unless the list is filtered by it
		vendors: vendors.data?.filter(v => !v.archived || v.id === f.vendor),
		categories: categories.data,
		highest: highest.data?.orders?.[0]?.total
	}
	const filtersCard = (
		<Card>
			<div className="sp-row-flex">
				<span className="sp-section-label">Filters</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={clearAll}>Clear all</Button>
			</div>
			<OrderFacets f={f} update={update} custom={custom} setCustom={setCustom} matched={orders.data?.matched} {...facetData} />
		</Card>
	)

	const sortLabel = SORTS.find(s => s.id === sort).label
	const filtersButton = (
		<Button variant="outline" aria-haspopup="dialog" aria-expanded={filtersOpen ? 'true' : 'false'} onClick={() => setFiltersOpen(true)}>
			{crumbs.length ? `Filters${dot}${crumbs.length}` : 'Filters'}
		</Button>
	)
	// without the rail, Filters joins the bar before sort (15e); a phone gives it its own row (c12)
	const controls = (
		<Controls>
			<OrderSearch key={searchKey} q={f.q} onSearch={search} touch={touch} />
			{railed || touch ? null : filtersButton}
			<Combobox variant="sort-end" prefix="Sort" value={sortLabel}>
				{SORTS.map(s => (
					<ComboboxOption key={s.id} selected={s.id === sort} onSelect={() => update({ sort: s.id })}>
						{s.label}
					</ComboboxOption>
				))}
			</Combobox>
		</Controls>
	)

	const open = order => navigate(`/orders/${order.id}`)
	const data = orders.data
	let body
	if (orders.error)
		body = <Failed what="Your orders" error={orders.error} onRetry={orders.refresh} />
	else if (!data) body = narrow ? <CardsLoading size={size} /> : <RowsLoading width={width} size={size} />
	else if (data.total === 0)
		body = (
			<Card variant="flush">
				<Empty>
					<Mark size="large" aria-hidden="true" aria-label="Receipt"><Icon name="receipt" size={26} /></Mark>
					<EmptyTitle>No orders yet</EmptyTitle>
					<EmptyBody>
						{reads === false
							? 'Drop a receipt and it is attached to a new order. Or start an empty order. Either way, you type in the details.'
							: 'Drop a receipt and the vendor, date and lines are filled in for you. Or start an empty order and type it yourself.'}
					</EmptyBody>
					<div className="sp-row-flex sp-gap-8">
						<Button size="small" to="/orders/new?source=scan">Scan a receipt</Button>
						<Button variant="outline" size="small" to="/orders/new">Empty order</Button>
					</div>
				</Empty>
			</Card>
		)
	else if (data.matched === 0 && !crumbs.length && f.q)
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>No orders match "{f.q}"</EmptyTitle>
					<EmptyBody>Check the spelling, or clear the search.</EmptyBody>
					<Button variant="outline" size="small" onClick={clearSearch}>Clear search</Button>
				</Empty>
			</Card>
		)
	else if (data.matched === 0)
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>No orders match these filters</EmptyTitle>
					<EmptyBody>{f.q
						? 'Remove one of the filters, or clear all of them to see every order that matches the search.'
						: 'Remove one of the filters, or clear all of them to see every order.'}</EmptyBody>
					<Button variant="outline" size="small" onClick={clearCrumbs}>Clear filters</Button>
				</Empty>
			</Card>
		)
	else if (narrow)
		body = <OrderCards data={data} size={size} onOpen={open} onLoadMore={loadMore} />
	else
		body = <OrderRows data={data} width={width} size={size} onLoadMore={loadMore} onDelete={setDeleting} />

	// an account with no orders has nothing to filter (6a): one empty card, no rail
	const none = data?.total === 0
	const alone = !railed || none
	const main = (
		<div className={alone ? 'sp-grow sp-stack sp-gap-12 ol-alone' : 'sp-grow sp-stack sp-gap-12'} ref={column}>
			{none ? null : controls}
			{none || !touch ? null : <div className="sp-row-flex sp-gap-8">{filtersButton}</div>}
			{crumbs.length ? <Filters onClear={clearCrumbs}>{crumbs}</Filters> : null}
			{body}
			{filtersOpen
				? (
					<FiltersSheet
						params={params}
						custom={custom}
						facetData={facetData}
						onApply={(next, nextCustom) => { setFiltersOpen(false); setCustom(nextCustom); update(next) }}
						onClose={() => setFiltersOpen(false)}
					/>
				)
				: null}
			{deleting
				? (
					<DeleteOrder order={deleting} onClose={() => setDeleting(null)}
						onDeleted={() => { setDeleting(null); setRefocus({ id: deleting.id, at: data.orders.findIndex(o => o.id === deleting.id) }) }} />
				)
				: null}
		</div>
	)

	// the route's rail layout takes two children, the rail first
	if (alone) return main
	return (
		<>
			<div className="sp-rail sp-stack sp-gap-12">{filtersCard}</div>
			{main}
		</>
	)
}

/** The facets on a phone or a narrow window (c12 touch, 18b): a sheet over the list, whose
    choices wait for Apply rather than filtering at once. */
function FiltersSheet({ params, custom, facetData, onApply, onClose }) {
	const [draft, setDraft] = useState(() => new URLSearchParams(params))
	const [draftCustom, setDraftCustom] = useState(custom)
	const f = readFilters(draft)
	const update = useCallback(changes => setDraft(d => withChanges(d, changes)), [])
	// the date group's order count is for the choices in the sheet, not the list behind it
	const count = useApi(getOrders, [{ ...requestOf(f, ''), page: 1, pageSize: 1 }])
	const box = useRef(null)
	// modal while open; closing gives focus back to the Filters button that opened it
	useFocusTrap(box)

	// removed facets first, then the rest in the order they were chosen in the sheet
	const apply = () => {
		const changes = Object.fromEntries(FACETS.filter(k => !draft.has(k)).map(k => [k, '']))
		for (const [k, v] of draft) if (FACETS.includes(k)) changes[k] = v
		onApply(changes, draftCustom)
	}
	const clear = () => { setDraftCustom(false); update(Object.fromEntries(FACETS.map(k => [k, '']))) }

	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-label="Filters" ref={box} tabIndex={-1}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				<span className="sp-heading">Filters</span>
				<div className="ol-sheet-body">
					<OrderFacets bare f={f} update={update} custom={draftCustom} setCustom={setDraftCustom} matched={count.loading ? undefined : count.data?.matched} {...facetData} />
				</div>
				<div className="sp-row-flex sp-gap-8">
					<Button variant="outline" size="small" onClick={clear}>Clear all</Button>
					<Button size="small" onClick={apply}>Apply</Button>
				</div>
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** The list's search (c20). The field keeps what is typed and writes it to the address once it
    settles, so a key pressed while the list redraws is never overwritten. */
function OrderSearch({ q, onSearch, touch }) {
	const [text, setText] = useState(q)
	const wrote = useRef(q)
	useEffect(() => {
		if (q === wrote.current) return
		wrote.current = q
		setText(q)
	}, [q])
	const settled = useSettled(text)
	const last = useRef(settled)
	useEffect(() => {
		if (settled === last.current) return
		last.current = settled
		if (settled === wrote.current) return
		wrote.current = settled
		onSearch(settled)
	}, [settled, onSearch])
	return (
		<SearchInput
			value={text}
			onChange={setText}
			placeholder={touch ? 'Search orders' : 'Search orders, vendors, items…'}
			aria-label="Search orders"
		/>
	)
}

/** The text the search box holds, once it has stopped changing, so a word typed is one request. */
function useSettled(value, ms = 250) {
	const [settled, setSettled] = useState(value)
	useEffect(() => {
		if (value === settled) return
		const timer = setTimeout(() => setSettled(value), value ? ms : 0)
		return () => clearTimeout(timer)
	}, [value, settled, ms])
	return settled
}

function OrderRows({ data, width, size, onLoadMore, onDelete }) {
	const show = columnsFor(width)
	return (
		<List data={data.orders} recordKey={o => o.id} noun="orders" rowTo={o => `/orders/${o.id}`} locale={NUMBER_LOCALE}
			pageSize={size} total={data.matched} onLoadMore={onLoadMore}>
			<Caption><strong className="sp-data">{plural(data.matched, 'order')}</strong></Caption>
			<ListHead>
				<ListCell width="title">Order</ListCell>
				<ListCell width="date">Date</ListCell>
				{show.categories ? <ListCell width="flex">Categories</ListCell> : null}
				{show.items ? <ListCell width="number">Items</ListCell> : null}
				<ListCell width="status">Status</ListCell>
				<ListCell width="amount">Total</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>{o => (
				<>
					<ListCell cell="flex">
						<OrderPhoto order={o} />
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{o.vendor?.name ?? 'No vendor'}</span>
							<span className="sp-subtitle sp-truncate">{orderLine(o)}</span>
						</span>
					</ListCell>
					<ListCell><span className="sp-data">{shortDate(o.date)}</span></ListCell>
					{show.categories ? <ListCell><CategoryChips categories={o.categories} /></ListCell> : null}
					{show.items ? <ListCell cell="number"><span className="sp-data">{o.itemCount}</span></ListCell> : null}
					<ListCell><StatusPill status={o.status} /></ListCell>
					<ListCell cell="amount">
						<span className="sp-amount">{currency(o.total)}</span>
						<Saving value={o.saved} />
					</ListCell>
					<ListCell cell="menu"><RowMenu order={o} onDelete={onDelete} /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

/* Two categories fit a row; past two the first stands for the rest, with their count (2b).
   One line always: a long name truncates inside its chip rather than wrapping the row (2i). */
function CategoryChips({ categories }) {
	if (!categories.length) return <div className="sp-row-flex sp-gap-6"><Chip variant="dashed">No category</Chip></div>
	const shown = categories.length > 2 ? categories.slice(0, 1) : categories
	return (
		<div className="sp-row-flex sp-gap-6">
			{shown.map(c => <span key={c.id} className="ol-chip-slot"><Chip><span className="sp-truncate">{c.name}</span></Chip></span>)}
			{categories.length > 2 ? <span className="sp-flex-none"><Chip>{`+${categories.length - 1}`}</Chip></span> : null}
		</div>
	)
}

/** The row's own menu (2e): only what can be done to one order today. */
function RowMenu({ order, onDelete }) {
	const navigate = useNavigate()
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	const go = to => () => { close(); navigate(to) }
	return (
		<Anchor ref={anchor} open={open} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={`Order menu, ${[order.vendor?.name ?? 'No vendor', order.reference, shortDate(order.date)].filter(Boolean).join(', ')}`}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			<Menu position="floating" aria-label="Order">
				<MenuItem icon="external-link" onClick={go(`/orders/${order.id}`)}>Open order</MenuItem>
				<MenuItem icon="file" onClick={go(`/orders/new?duplicate=${order.id}`)}>Duplicate</MenuItem>
				<MenuSeparator />
				<MenuItem icon="trash" danger onClick={() => { close(); onDelete(order) }}>Delete order</MenuItem>
			</Menu>
		</Anchor>
	)
}

/** At 640 of list column and under, rows become cards (2i): the photo, then name and total,
    reference and status, date and saving. */
function OrderCards({ data, size, onOpen, onLoadMore }) {
	return (
		<>
			<span className="sp-meta">{plural(data.matched, 'order')}</span>
			{data.orders.map(o => (
				<ListItem key={o.id} variant="card" mark={<OrderPhoto order={o} />} onClick={() => onOpen(o)}>
					<Stacked>
						<Line>
							<span className="sp-title sp-truncate sp-grow">{o.vendor?.name ?? 'No vendor'}</span>
							<span className="sp-amount">{currency(o.total)}</span>
						</Line>
						<Line>
							<span className="sp-subtitle sp-truncate sp-grow">{orderLine(o)}</span>
							<StatusPill status={o.status} />
						</Line>
						<Line>
							<span className="sp-subtitle sp-grow">{shortDate(o.date)}{dot}{plural(o.itemCount, 'item')}</span>
							<Saving value={o.saved} />
						</Line>
					</Stacked>
				</ListItem>
			))}
			<ListMore loose shown={data.orders.length} total={data.matched} pageSize={size} onMore={onLoadMore} locale={NUMBER_LOCALE} />
		</>
	)
}

const LOADING = [['62pc', '58', '88', '44pc'], ['48pc', '74', '74', '36pc'], ['55pc', '46', '92', '30pc']]
const loadingRows = size => Array.from({ length: size }, (_, i) => ({ id: i, r: LOADING[i % LOADING.length] }))

/* Skeletons hold the real rows' places, a page of them, so nothing moves when the orders land (6b). */
function RowsLoading({ width, size }) {
	const show = columnsFor(width)
	const rows = loadingRows(size)
	return (
		<List data={rows} recordKey={x => x.id} noun="orders">
			<Caption><Skeleton shape="line" data-w="82" data-h="13" /></Caption>
			<ListHead>
				<ListCell width="title">Order</ListCell>
				<ListCell width="date">Date</ListCell>
				{show.categories ? <ListCell width="flex">Categories</ListCell> : null}
				{show.items ? <ListCell width="number">Items</ListCell> : null}
				<ListCell width="status">Status</ListCell>
				<ListCell width="amount">Total</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>{({ r }) => (
				<>
					<ListCell cell="flex">
						<Skeleton shape="mark" />
						<span className="sp-stacked sp-grow"><Skeleton shape="line" data-w={r[0]} /><Skeleton shape="line" data-w={r[3]} data-h="10" /></span>
					</ListCell>
					<ListCell><Skeleton shape="line" data-w={r[1]} data-h="13" /></ListCell>
					{show.categories ? <ListCell><Skeleton shape="line" data-w="52" data-h="22" /></ListCell> : null}
					{show.items ? <ListCell cell="number"><Skeleton shape="end" data-w="18" data-h="13" /></ListCell> : null}
					<ListCell><Skeleton shape="pill" /></ListCell>
					<ListCell cell="amount"><Skeleton shape="end" data-w={r[2]} data-h="20" /><Skeleton shape="end" data-w="74" data-h="18" /></ListCell>
					<ListCell cell="menu"><Skeleton shape="icon" /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

/* An empty text of the line's own type sizes a skeleton line to the real one exactly. */
const strut = role => <span className={role} aria-hidden="true">{'\u200b'}</span>

function CardsLoading({ size }) {
	return [<span key="count" className="sp-row-flex"><Skeleton shape="line" data-w="82" data-h="13" />{strut('sp-meta')}</span>, ...loadingRows(size).map(({ id, r: [title, , figure] }) => (
		<ListItem key={id} variant="card" mark={<Skeleton shape="mark" />}>
			<Stacked>
				<Line><Skeleton shape="line" data-w={title} data-h="22" />{strut('sp-title')}<span className="sp-grow" /><Skeleton shape="line" data-w={figure} data-h="22" /></Line>
				<Line><Skeleton shape="line" data-w="44pc" data-h="22" /><span className="sp-grow" /><Skeleton shape="line" data-w="74" data-h="22" /></Line>
				<Line><Skeleton shape="line" data-w="36pc" data-h="18" /><span className="sp-grow" /><Skeleton shape="line" data-w="88" data-h="18" /></Line>
			</Stacked>
		</ListItem>
	))]
}

/** The rail's groups (c12, 2b), each one a filter the orders can take today. `bare` gives the
    groups alone, for the sheet that spaces them itself (7b). */
function OrderFacets({ bare = false, f, update, custom, setCustom, vendors, categories, highest, matched }) {
	// every vendor and category, so a group's total is the count the sidebar shows (2b); one
	// with no orders comes last and cannot be picked (c12)
	const byUse = list => [...(list ?? [])].sort((a, b) => b.orders - a.orders)
	const shownVendors = byUse(vendors)
	const shownCategories = byUse(categories)
	const [allVendors, setAllVendors] = useState(false)
	const [find, setFind] = useState('')
	const found = find ? shownVendors.filter(v => v.name.toLowerCase().includes(find.toLowerCase())) : shownVendors
	const listed = allVendors || find ? found : found.filter((v, i) => i < 4 || v.id === f.vendor)

	const Groups = bare ? Fragment : Facets
	return (
		<Groups>
			<DateFacet from={f.from} to={f.to} matched={matched} update={update} custom={custom} setCustom={setCustom} />

			<FieldGroup facet legend="Status">
				{STATUSES.map(s => (
					<Choice key={s} control={<Check checked={f.status === s} onChange={ev => update({ status: ev.target.checked ? s : '' })} />}>{s}</Choice>
				))}
			</FieldGroup>

			{shownVendors.length
				? (
					<FieldGroup facet legend="Vendor" count={`${shownVendors.length} total`}>
						{shownVendors.length > 20
							? <SearchInput value={find} onChange={setFind} placeholder="Find a vendor…" aria-label="Find a vendor" />
							: null}
						{shownVendors.length > 20 ? <Announce>{find ? (found.length ? plural(found.length, 'vendor') : 'No vendor by that name.') : ''}</Announce> : null}
						{find && !found.length ? <span className="sp-subtitle">No vendor by that name.</span> : null}
						{listed.map(v => (
							<Choice key={v.id} control={<Check checked={f.vendor === v.id} disabled={!v.orders && f.vendor !== v.id}
								onChange={ev => update({ vendor: ev.target.checked ? v.id : '' })} />}>{v.name}</Choice>
						))}
						{!allVendors && !find && found.length > listed.length
							? <FieldGroupMore onClick={() => setAllVendors(true)}>Show {found.length - listed.length} more</FieldGroupMore>
							: null}
					</FieldGroup>
				)
				: null}

			{shownCategories.length
				? (
					<FieldGroup facet legend="Categories">
						<Filters>
							{shownCategories.map(c => (
								<Chip key={c.id} variant="facet" value={c.id} selected={f.category === c.id} disabled={!c.orders && f.category !== c.id}
									onSelect={on => update({ category: on ? c.id : '' })}>{c.name}</Chip>
							))}
						</Filters>
					</FieldGroup>
				)
				: null}

			<FieldGroup facet legend="Kind">
				<Combobox value={f.kind || 'All kinds'} aria-label="Kind">
					{['', ...spendKinds].map(k => (
						<ComboboxOption key={k || 'all'} selected={f.kind === k} onSelect={() => update({ kind: k })}>
							{k || 'All kinds'}
						</ComboboxOption>
					))}
				</Combobox>
			</FieldGroup>

			{highest ? <AmountFacet top={Math.max(1000, Math.ceil(highest / 1000) * 1000)} min={f.min} max={f.max} update={update} /> : null}
		</Groups>
	)
}

/** One control, four settings (2d): a preset, or a range typed in under them. */
function DateFacet({ from, to, matched, update, custom, setCustom }) {
	const name = useId()
	const preset = presetOf(from, to)
	const chosen = custom ? 'custom' : preset ? preset.key : from || to ? 'custom' : null
	const [draft, setDraft] = useState({ from, to })
	useEffect(() => setDraft({ from, to }), [from, to])
	const wrong = !!(draft.from && draft.to && draft.to < draft.from)

	// a range that ends before it starts waits in the fields while the reader is in them; a date
	// the page cannot read is never kept, and leaving the two fields shows the range in force
	const edit = next => {
		if (![next.from, next.to].every(d => !d || isDay(d))) return
		setDraft(next)
		if (!(next.from && next.to && next.to < next.from)) update({ from: next.from, to: next.to })
	}
	const leave = ev => { if (!ev.currentTarget.contains(ev.relatedTarget)) setDraft({ from, to }) }
	// a count not known yet is left out rather than shown as zero (6b)
	const summary = [from ? plural(daysBetween(from, to || today()), 'day') : null, matched == null ? null : plural(matched, 'order')]
		.filter(Boolean).join(dot)

	return (
		<FieldGroup facet legend="Date">
			<Filters>
				{PRESETS.map(p => (
					<Chip key={p.key} variant="facet" inputType="radio" name={name} value={p.key} selected={chosen === p.key}
						onSelect={() => { setCustom(false); const [a, b] = p.range(new Date()); update({ from: a, to: b }) }}>
						{p.label}
					</Chip>
				))}
				<Chip variant="facet" inputType="radio" name={name} value="custom" data-preset="custom" selected={chosen === 'custom'}
					onSelect={() => setCustom(true)}>
					Custom…
				</Chip>
			</Filters>
			<FieldGroupPanel onBlur={leave}>
				<Field label="From"><DateField value={draft.from} locale={activeLocaleCode()} onChange={v => edit({ ...draft, from: v })} /></Field>
				<Field label="To" message={wrong ? 'To must be on or after From. The list keeps the last valid range.' : null} messageType={wrong ? 'danger' : 'hint'}>
					<DateField value={draft.to} placeholder="Today" locale={activeLocaleCode()} onChange={v => edit({ ...draft, to: v })} />
				</Field>
				{wrong
					? null
					: from || to
						? (
							<div className="sp-row-flex sp-gap-8">
								<span className="sp-subtitle">{summary}</span>
								<span className="sp-grow" />
								<Button variant="outline" size="small" onClick={() => update({ from: '', to: '' })}>Clear</Button>
							</div>
						)
						: <span className="sp-field__help">Leave To empty to include everything up to today.</span>}
			</FieldGroupPanel>
		</FieldGroup>
	)
}

/* A drag is many values; the list asks for the one it settles on. */
function AmountFacet({ top, min, max, update }) {
	const fromUrl = useMemo(() => [min ? Math.min(Number(min), top) : 0, max ? Math.min(Number(max), top) : top], [min, max, top])
	const [range, setRange] = useState(fromUrl)
	useEffect(() => setRange(fromUrl), [fromUrl])
	useEffect(() => {
		if (range[0] === fromUrl[0] && range[1] === fromUrl[1]) return
		const timer = setTimeout(() => update({ min: range[0] > 0 ? range[0] : '', max: range[1] < top ? range[1] : '' }), 300)
		return () => clearTimeout(timer)
	}, [range, fromUrl, top, update])
	return (
		<FieldGroup facet legend="Amount" meta={`0 - ${currency(top, 0)}`}>
			<RangeSlider value={range} min={0} max={top} step={100} label="Amount" format={n => amount(n, 0)} onChange={setRange} />
		</FieldGroup>
	)
}
