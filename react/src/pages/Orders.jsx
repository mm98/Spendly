import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Card, ListFooter } from '../components/Card.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Check, Choice, FieldGroup, FieldGroupMore, FieldGroupPanel } from '../components/Choice.jsx'
import { Chip } from '../components/Chip.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { DateField } from '../components/DatePickers.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { RangeSlider, SearchInput } from '../components/Inputs.jsx'
import { Caption, Controls, Crumb, Facets, Filters, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Empty, EmptyBody, EmptyTitle, Line, Skeleton, Stacked, useDismiss } from '../components/Utilities.jsx'
import { deleteOrder, failureMessage, getCategories, getOrder, getOrders, getSettings, getVendors, invalidateOrderData, spendKinds } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { amount, currency, fullStop, plural, shortDate, today } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { OrderPhoto, orderLine } from '../app/orderRow.jsx'

const SORTS = [
	{ id: 'date-desc', label: 'Newest first' },
	{ id: 'date-asc', label: 'Oldest first' },
	{ id: 'amount-desc', label: 'Highest total' },
	{ id: 'amount-asc', label: 'Lowest total' },
	{ id: 'vendor-asc', label: 'Vendor A - Z' }
]

const STATUSES = ['Delivered', 'Ordered', 'Returned']

const FILTERS = ['q', 'vendor', 'category', 'status', 'from', 'to', 'kind', 'min', 'max']

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const day = (y, m, d) => iso(new Date(y, m, d))

/* A preset is a calendar period around today; the URL holds its two dates, and the chip reads
   them back, so a link that carries the same dates lands on the same chip. */
const PRESETS = [
	{ key: 'week', label: 'This week', range: n => { const at = n.getDate() - (n.getDay() + 6) % 7; return [day(n.getFullYear(), n.getMonth(), at), day(n.getFullYear(), n.getMonth(), at + 6)] } },
	{ key: 'month', label: 'This month', range: n => [day(n.getFullYear(), n.getMonth(), 1), day(n.getFullYear(), n.getMonth() + 1, 0)] },
	{ key: 'quarter', label: 'This quarter', range: n => { const q = n.getMonth() - n.getMonth() % 3; return [day(n.getFullYear(), q, 1), day(n.getFullYear(), q + 3, 0)] } },
	{ key: 'year', label: 'This year', range: n => [day(n.getFullYear(), 0, 1), day(n.getFullYear(), 11, 31)] }
]
const presetOf = (from, to) => PRESETS.find(p => { const [a, b] = p.range(new Date()); return a === from && b === to })

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 864e5) + 1

const statusPill = status =>
	status === 'Delivered' ? <Pill color="success">Delivered</Pill>
		: status === 'Ordered' ? <Pill state="progress">Ordered</Pill>
			: status === 'Returned' ? <Pill color="danger">Returned</Pill>
				: <Pill>{status}</Pill>

const saved = n => (
	<span className="sp-amount-secondary" {...(Math.round(n * 100) > 0 ? { 'data-color': 'success' } : {})}>Saved {currency(n)}</span>
)

/** The order list (Order list 2b): the facet rail, then search, sort, what is filtering, and the orders. */
export default function Orders() {
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const f = useMemo(() => Object.fromEntries([...FILTERS, 'sort'].map(k => [k, params.get(k) ?? ''])), [params])
	const touch = useShellShape() === 'touch'

	const settings = useApi(getSettings)
	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	const highest = useApi(getOrders, [{ sort: 'amount-desc', pageSize: 1 }])

	const sort = SORTS.some(s => s.id === f.sort) ? f.sort
		: SORTS.some(s => s.id === settings.data?.sort) ? settings.data.sort : 'date-desc'
	const size = settings.data?.pageSize ?? 10

	const update = useCallback(changes => setParams(prev => {
		const next = new URLSearchParams(prev)
		for (const [k, v] of Object.entries(changes)) {
			if (v === '' || v == null) next.delete(k)
			else next.set(k, String(v))
		}
		return next
	}, { replace: true }), [setParams])

	// a date range typed by hand is held open here, so the crumb and Clear all can close it
	const [custom, setCustom] = useState(false)
	useEffect(() => { if (!f.from && !f.to) setCustom(false) }, [f.from, f.to])
	const clearAll = () => { setCustom(false); update(Object.fromEntries(FILTERS.map(k => [k, '']))) }

	const query = useSettled(f.q)
	const request = {
		query, vendorId: f.vendor, categoryId: f.category, status: f.status, kind: f.kind,
		from: f.from, to: f.to, minAmount: f.min, maxAmount: f.max, sort
	}
	const signature = JSON.stringify(request)
	const [more, setMore] = useState({ signature, pages: 1 })
	const pages = more.signature === signature ? more.pages : 1
	const orders = useApi(getOrders, [{ ...request, page: 1, pageSize: size * pages }])
	const loadMore = () => setMore({ signature, pages: pages + 1 })

	const column = useRef(null)
	const width = useWidth(column)
	const narrow = touch || (width > 0 && width < 640)

	const [deleting, setDeleting] = useState(null)
	const [filtersOpen, setFiltersOpen] = useState(false)

	const vendorName = id => vendors.data?.find(v => v.id === id)?.name ?? 'Vendor'
	const categoryName = id => (id === 'none' ? 'No category' : categories.data?.find(c => c.id === id)?.name ?? 'Category')
	const crumbs = []
	if (f.from || f.to) {
		const preset = custom ? null : presetOf(f.from, f.to)
		const label = preset ? preset.label
			: f.from && f.to ? `${shortDate(f.from)} - ${shortDate(f.to)}`
				: f.from ? `From ${shortDate(f.from)}` : `Until ${shortDate(f.to)}`
		crumbs.push(<Crumb key="date" name={preset ? label : 'the date range'} onRemove={() => { setCustom(false); update({ from: '', to: '' }) }}>{label}</Crumb>)
	}
	if (f.status) crumbs.push(<Crumb key="status" onRemove={() => update({ status: '' })}>{f.status}</Crumb>)
	if (f.vendor) crumbs.push(<Crumb key="vendor" onRemove={() => update({ vendor: '' })}>{vendorName(f.vendor)}</Crumb>)
	if (f.category) crumbs.push(<Crumb key="category" onRemove={() => update({ category: '' })}>{categoryName(f.category)}</Crumb>)
	if (f.kind) crumbs.push(<Crumb key="kind" onRemove={() => update({ kind: '' })}>{f.kind}</Crumb>)
	if (f.min || f.max) {
		const label = f.min && f.max ? `${amount(Number(f.min), 0)} - ${currency(Number(f.max), 0)}`
			: f.min ? `From ${currency(Number(f.min), 0)}` : `Up to ${currency(Number(f.max), 0)}`
		crumbs.push(<Crumb key="amount" name="the amount range" onRemove={() => update({ min: '', max: '' })}>{label}</Crumb>)
	}

	const facets = (
		<OrderFacets
			f={f}
			update={update}
			custom={custom}
			setCustom={setCustom}
			vendors={vendors.data}
			categories={categories.data}
			highest={highest.data?.orders?.[0]?.total}
			matched={orders.data?.matched}
		/>
	)
	const filtersCard = (
		<Card>
			<div className="sp-row-flex">
				<span className="sp-section-label">Filters</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={clearAll}>Clear all</Button>
			</div>
			{facets}
		</Card>
	)

	const sortLabel = SORTS.find(s => s.id === sort).label
	const [sortOpen, setSortOpen] = useState(false)
	const controls = (
		<Controls>
			<SearchInput
				value={f.q}
				onChange={text => update({ q: text })}
				placeholder={touch ? 'Search orders' : 'Search orders, vendors, items…'}
				aria-label="Search orders"
			/>
			<Combobox variant="sort-end" aria-label="Sort" lead={<span className="sp-combobox__chevron">Sort</span>}
				value={sortLabel} open={sortOpen} onOpenChange={setSortOpen}>
				{SORTS.map(s => (
					<ComboboxOption key={s.id} selected={s.id === sort} onSelect={() => { setSortOpen(false); update({ sort: s.id }) }}>
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
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>Your orders could not be loaded</EmptyTitle>
					<EmptyBody>{failureMessage(orders.error, 'Check your connection and try again.')}</EmptyBody>
					<Button size="small" onClick={orders.refresh}>Try again</Button>
				</Empty>
			</Card>
		)
	else if (!data) body = narrow ? <CardsLoading /> : <RowsLoading width={width} />
	else if (data.total === 0)
		body = (
			<Card variant="flush">
				<Empty>
					<Mark size="large" aria-hidden="true" aria-label="Receipt"><Icon name="receipt" size={26} /></Mark>
					<EmptyTitle>No orders yet</EmptyTitle>
					<EmptyBody>Drop a receipt and the vendor, date and lines are filled in for you. Or start an empty order and type it yourself.</EmptyBody>
					<div className="sp-row-flex sp-gap-8">
						<Button size="small" to="/orders/new?source=scan">Scan a receipt</Button>
						<Button variant="outline" size="small" to="/orders/new">Empty order</Button>
					</div>
				</Empty>
			</Card>
		)
	else if (data.matched === 0)
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>No orders match these filters</EmptyTitle>
					<EmptyBody>Remove one of the filters, or clear all of them to see every order.</EmptyBody>
					<Button size="small" onClick={clearAll}>Clear filters</Button>
				</Empty>
			</Card>
		)
	else if (narrow)
		body = <OrderCards data={data} onOpen={open} onLoadMore={loadMore} />
	else
		body = <OrderRows data={data} width={width} size={size} onOpen={open} onLoadMore={loadMore} onDelete={setDeleting} />

	const main = (
		<div className="sp-grow sp-stack sp-gap-12" ref={column}>
			{data?.total === 0 ? null : controls}
			{touch
				? (
					<>
						<Button variant="outline" aria-expanded={filtersOpen ? 'true' : 'false'} onClick={() => setFiltersOpen(!filtersOpen)}>
							{crumbs.length ? `Filters · ${crumbs.length}` : 'Filters'}
						</Button>
						{filtersOpen ? filtersCard : null}
					</>
				)
				: null}
			{crumbs.length ? <Filters onClear={clearAll}>{crumbs}</Filters> : null}
			{body}
			{deleting
				? <DeleteOrder order={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); orders.refresh() }} />
				: null}
		</div>
	)

	// the route's rail layout takes two children, the rail first; a phone has no rail
	if (touch) return main
	return (
		<>
			<div className="sp-rail sp-stack sp-gap-12">{filtersCard}</div>
			{main}
		</>
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

/** The list column's own width: which columns the table keeps answers to it, never to the window (2i). */
function useWidth(ref) {
	const [width, setWidth] = useState(0)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		setWidth(el.getBoundingClientRect().width)
		const watch = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
		watch.observe(el)
		return () => watch.disconnect()
	}, [ref])
	return width
}

/* The columns the list column has room for (2i): Items goes below 1040, Categories below 880. */
const columnsFor = width => ({ items: width >= 1040, categories: width >= 880 })

function OrderRows({ data, width, size, onOpen, onLoadMore, onDelete }) {
	const show = columnsFor(width)
	return (
		<List data={data.orders} recordKey={o => o.id} noun="orders" onRowClick={onOpen}
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
					<ListCell>{statusPill(o.status)}</ListCell>
					<ListCell cell="amount">
						<span className="sp-amount">{currency(o.total)}</span>
						{saved(o.saved)}
					</ListCell>
					<ListCell cell="menu"><RowMenu order={o} onDelete={onDelete} /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

/* Two categories fit a row; past two the first stands for the rest, with their count (2b). */
function CategoryChips({ categories }) {
	if (!categories.length) return <div className="sp-row-flex sp-gap-6 sp-wrap"><Chip variant="dashed">No category</Chip></div>
	const shown = categories.length > 2 ? categories.slice(0, 1) : categories
	return (
		<div className="sp-row-flex sp-gap-6 sp-wrap">
			{shown.map(c => <Chip key={c.id}>{c.name}</Chip>)}
			{categories.length > 2 ? <Chip>{`+${categories.length - 1}`}</Chip> : null}
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
		<Anchor ref={anchor} open={open} data-menu-open={open ? 'true' : undefined} onClick={ev => ev.stopPropagation()}>
			<IconButton icon="dots-vertical" aria-label={`Order menu, ${order.vendor?.name ?? 'order'} ${shortDate(order.date)}`}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			<Menu position="floating" aria-label="Order">
				<MenuItem icon="external-link" onClick={go(`/orders/${order.id}`)}>Open order</MenuItem>
				<MenuItem icon="pencil" onClick={go(`/orders/${order.id}/edit`)}>Edit order</MenuItem>
				<MenuItem icon="file" onClick={go(`/orders/new?duplicate=${order.id}`)}>Duplicate</MenuItem>
				<MenuSeparator />
				<MenuItem icon="trash" danger onClick={() => { close(); onDelete(order) }}>Delete order</MenuItem>
			</Menu>
		</Anchor>
	)
}

/** Below 640 of list column, rows become cards (2i): name and total, then date and status, then saving. */
function OrderCards({ data, onOpen, onLoadMore }) {
	return (
		<>
			<span className="sp-meta">{plural(data.matched, 'order')}</span>
			{data.orders.map(o => (
				<ListItem key={o.id} variant="card" onClick={() => onOpen(o)}>
					<Stacked>
						<Line>
							<span className="sp-title sp-truncate sp-grow">{o.vendor?.name ?? 'No vendor'}</span>
							<span className="sp-amount">{currency(o.total)}</span>
						</Line>
						<Line>
							<span className="sp-subtitle sp-truncate sp-grow">{shortDate(o.date)} · {plural(o.itemCount, 'item')}</span>
							{statusPill(o.status)}
						</Line>
						<Line>
							<span className="sp-subtitle sp-truncate sp-grow">{o.categories.length ? o.categories.map(c => c.name).join(', ') : 'No category'}</span>
							{saved(o.saved)}
						</Line>
					</Stacked>
				</ListItem>
			))}
			{data.matched > data.orders.length || data.pages > 1
				? (
					<ListFooter loose>
						<span className="sp-subtitle">Showing {data.orders.length} of {data.matched}</span>
						<span className="sp-grow" />
						{data.orders.length < data.matched ? <Button variant="outline" size="small" onClick={onLoadMore}>Load more</Button> : null}
					</ListFooter>
				)
				: null}
		</>
	)
}

const LOADING = [['62pc', '58', '88'], ['48pc', '74', '74'], ['55pc', '46', '92']]

/* Skeletons hold the real rows' places, so nothing moves when the orders land (6b). */
function RowsLoading({ width }) {
	const show = columnsFor(width)
	const rows = [...LOADING, ...LOADING].map((r, i) => ({ id: i, r }))
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
					<ListCell cell="flex"><span className="sp-stacked sp-grow"><Skeleton shape="line" data-w={r[0]} data-h="13" /></span></ListCell>
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

function CardsLoading() {
	return [<Skeleton key="count" shape="line" data-w="82" data-h="18" />, ...LOADING.map(([title, , figure]) => (
		<ListItem key={title} variant="card">
			<Stacked>
				<Line><Skeleton shape="line" data-w={title} data-h="22" /><span className="sp-grow" /><Skeleton shape="line" data-w={figure} data-h="22" /></Line>
				<Line><Skeleton shape="line" data-w="44pc" data-h="22" /><span className="sp-grow" /><Skeleton shape="line" data-w="74" data-h="22" /></Line>
				<Line><Skeleton shape="line" data-w="36pc" data-h="18" /><span className="sp-grow" /><Skeleton shape="line" data-w="88" data-h="18" /></Line>
			</Stacked>
		</ListItem>
	))]
}

/** The rail's groups (c12, 2b), each one a filter the orders can take today. */
function OrderFacets({ f, update, custom, setCustom, vendors, categories, highest, matched }) {
	const used = (list, chosen) => (list ?? []).filter(x => x.orders > 0 || x.id === chosen).sort((a, b) => b.orders - a.orders)
	const shownVendors = used(vendors, f.vendor)
	const shownCategories = used(categories, f.category)
	const [allVendors, setAllVendors] = useState(false)
	const [find, setFind] = useState('')
	const found = find ? shownVendors.filter(v => v.name.toLowerCase().includes(find.toLowerCase())) : shownVendors
	const listed = allVendors || find ? found : found.filter((v, i) => i < 6 || v.id === f.vendor)
	const [kindOpen, setKindOpen] = useState(false)

	return (
		<Facets>
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
						{listed.map(v => (
							<Choice key={v.id} control={<Check checked={f.vendor === v.id} onChange={ev => update({ vendor: ev.target.checked ? v.id : '' })} />}>{v.name}</Choice>
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
								<Chip key={c.id} variant="facet" value={c.id} selected={f.category === c.id}
									onSelect={on => update({ category: on ? c.id : '' })}>{c.name}</Chip>
							))}
						</Filters>
					</FieldGroup>
				)
				: null}

			<FieldGroup facet legend="Kind">
				<Combobox value={f.kind || 'All kinds'} aria-label="Kind" open={kindOpen} onOpenChange={setKindOpen}>
					{['', ...spendKinds].map(k => (
						<ComboboxOption key={k || 'all'} selected={f.kind === k} onSelect={() => { setKindOpen(false); update({ kind: k }) }}>
							{k || 'All kinds'}
						</ComboboxOption>
					))}
				</Combobox>
			</FieldGroup>

			{highest ? <AmountFacet top={Math.max(1000, Math.ceil(highest / 1000) * 1000)} min={f.min} max={f.max} update={update} /> : null}
		</Facets>
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

	// an impossible range is held in the fields only: the list keeps the last one that made sense
	const edit = next => {
		setDraft(next)
		if (!(next.from && next.to && next.to < next.from)) update({ from: next.from, to: next.to })
	}
	const summary = from
		? `${plural(daysBetween(from, to || today()), 'day')} · ${plural(matched ?? 0, 'order')}`
		: plural(matched ?? 0, 'order')

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
			<FieldGroupPanel>
				<Field label="From"><DateField value={draft.from} onChange={v => edit({ ...draft, from: v })} /></Field>
				<Field label="To"><DateField value={draft.to} danger={wrong} onChange={v => edit({ ...draft, to: v })} /></Field>
				{wrong
					? <span className="sp-field__help" data-color="danger">To must be on or after From. The list keeps the last valid range.</span>
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

/** Deleting is the one thing a list does that cannot be undone, so it asks first and names what goes (6d). */
function DeleteOrder({ order, onClose, onDeleted }) {
	const full = useApi(getOrder, [order.id])
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	const detail = full.data
	const lines = detail?.items.length ?? order.itemCount
	const files = detail ? detail.attachments.length + detail.items.reduce((n, i) => n + i.attachments.length, 0) : 0
	const vendor = order.vendor?.name ?? 'no vendor'
	const which = detail?.reference
		? `Order ${detail.reference} from ${vendor}`
		: `The order from ${vendor} on ${shortDate(order.date)}`
	const goes = files ? `${plural(lines, 'line')} and ${plural(files, 'attachment')} go` : `${plural(lines, 'line')} ${lines === 1 ? 'goes' : 'go'}`

	const remove = async () => {
		setBusy(true)
		try {
			await deleteOrder(order.id)
			invalidateOrderData()
			onDeleted()
		} catch (error) {
			setBusy(false)
			onClose()
			toast({ message: failureMessage(error, 'The order could not be deleted. Try again.'), color: 'danger' })
		}
	}

	return (
		<Dialog onCancel={onClose} aria-label="Delete this order?">
			<div className="sp-row-flex sp-gap-12">
				<Mark size="medium" aria-hidden="true" aria-label="Delete"><Icon name="trash" size={17} /></Mark>
				<DialogTitle>Delete this order?</DialogTitle>
			</div>
			<DialogBody>{which}, {currency(order.total)}{fullStop()} Its {goes} with it.</DialogBody>
			<ListItem>This cannot be undone.</ListItem>
			<DialogActions>
				<Button variant="outline" fullWidth disabled={busy} onClick={onClose}>Keep it</Button>
				<Button color="danger" fullWidth disabled={busy} onClick={remove}>Delete order</Button>
			</DialogActions>
		</Dialog>
	)
}
