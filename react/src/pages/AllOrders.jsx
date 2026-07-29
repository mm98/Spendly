import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { OrderRow } from '../components/Rows.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, Segmented } from '../components/Form.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories, getOrders, getSettings, getVendors, sorts, spendKinds } from '../api/client.js'
import { dayMonth, parseAmount } from '../api/format.js'

/* All orders: the search, the filters, and what they leave.

   The chips are the filters, not a picture of them. The prototype drew three and removing
   one changed the list not at all, because the list was markup -- here a chip is the only
   place a filter is stored, so a chip that is gone is a filter that is off and the count
   above the list moves. Each removal leaves focus somewhere deliberate, since it removes the
   element focus was on, and announces once. README 13 and 18.

   FILTERS owns the panel below it: aria-expanded is the state, and there is no live-region
   message for it, because a disclosure announces itself. */

const EMPTY = { vendorId: '', vendorName: '', categoryId: '', categoryName: '', kind: '',
	status: 'Any', from: '', to: '', minAmount: '', maxAmount: '' }

/* The query string is where the filters live, not component state.

   Every link into this page speaks it -- the palette, a chart legend row, a category tile, a
   vendor card, the answer to the question of the day -- and reading it once on mount is not
   enough: arriving here from /orders/all at /orders/all?vendor=bilka changes the URL without
   remounting the component, so a `useState` initialiser never runs again and the filter
   silently does not apply. Deriving from the URL instead means the link, the chips, the
   Back button and the list cannot disagree, and a filtered list is a URL you can send. */
const filtersFromParams = params => ({
	...EMPTY,
	vendorId: params.get('vendor') ?? '',
	categoryId: params.get('category') ?? '',
	kind: params.get('kind') ?? '',
	from: params.get('from') ?? '',
	to: params.get('to') ?? '',
	minAmount: params.get('min') ?? '',
	maxAmount: params.get('max') ?? '',
	status: params.get('status') ?? 'Any'
})

const paramsFromFilters = (filters, query, sort, page) => {
	const out = {}
	if (query) out.q = query
	if (filters.vendorId) out.vendor = filters.vendorId
	if (filters.categoryId) out.category = filters.categoryId
	if (filters.kind) out.kind = filters.kind
	if (filters.from) out.from = filters.from
	if (filters.to) out.to = filters.to
	if (filters.minAmount) out.min = filters.minAmount
	if (filters.maxAmount) out.max = filters.maxAmount
	if (filters.status !== 'Any') out.status = filters.status
	if (sort) out.sort = sort
	if (page > 1) out.page = String(page)
	return out
}

export default function AllOrders() {
	const [params, setParams] = useSearchParams()
	const filters = useMemo(() => filtersFromParams(params), [params])
	const query = params.get('q') ?? ''
	const page = Number(params.get('page') ?? 1)
	const urlSort = params.get('sort')

	const [draft, setDraft] = useState(filters)
	/* Open on arrival, as the prototype has it: the filters are the point of this page, and a
	   panel that starts closed hides the controls a link may have just set. */
	const [panelOpen, setPanelOpen] = useState(true)
	const [message, setMessage] = useState('')
	const searchField = useRef(null)
	const chipRow = useRef(null)

	/* The panel's own copy follows the URL, so a link that arrives with a filter on it opens
	   the panel showing that filter rather than the last one typed into it. */
	useEffect(() => setDraft(filters), [filters])

	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	const settings = useApi(getSettings)
	/* The sort is the URL's when the URL has one, and the user's stored default otherwise. */
	const activeSort = urlSort ?? settings.data?.sort ?? 'date-desc'
	const pageSize = settings.data?.pageSize ?? 10

	/* Writing a filter is writing the URL. Any change but the page resets to page one --
	   staying on page 4 of a result set that now has two is how a filter reports "no orders"
	   that it actually matched. */
	const write = (next, nextQuery = query, nextSort = urlSort, nextPage = 1) =>
		setParams(paramsFromFilters(next, nextQuery, nextSort, nextPage), { replace: true })
	const setQuery = q => write(filters, q, urlSort, 1)
	const setPage = p => write(filters, query, urlSort, p)
	const refilter = next => write(next, query, urlSort, 1)

	const request = useMemo(() => ({
		query,
		vendorId: filters.vendorId,
		categoryId: filters.categoryId,
		status: filters.status,
		kind: filters.kind,
		from: filters.from,
		to: filters.to,
		minAmount: filters.minAmount ? parseAmount(filters.minAmount) : null,
		maxAmount: filters.maxAmount ? parseAmount(filters.maxAmount) : null,
		sort: activeSort,
		page,
		pageSize
	}), [query, filters, activeSort, page, pageSize])

	const results = useApi(getOrders, [request])

	const nameOf = (list, id) => list?.find(x => x.id === id)?.name ?? id

	/* One chip per filter that is actually on. Deriving them rather than listing them is what
	   keeps the row and the query from disagreeing. */
	const chips = useMemo(() => {
		const out = []
		if (filters.from || filters.to) out.push({ key: 'dates',
			label: [filters.from && dayMonth(filters.from), filters.to && dayMonth(filters.to)].filter(Boolean).join(' – '),
			clear: { from: '', to: '' } })
		if (filters.status !== 'Any') out.push({ key: 'status', label: filters.status, clear: { status: 'Any' } })
		if (filters.vendorId) out.push({ key: 'vendor', label: 'Vendor: ' + nameOf(vendors.data, filters.vendorId), clear: { vendorId: '', vendorName: '' } })
		if (filters.categoryId) out.push({ key: 'category', label: 'Category: ' + nameOf(categories.data, filters.categoryId), clear: { categoryId: '', categoryName: '' } })
		if (filters.kind) out.push({ key: 'kind', label: filters.kind, clear: { kind: '' } })
		if (filters.minAmount) out.push({ key: 'min', label: 'From ' + filters.minAmount + ' kr.', clear: { minAmount: '' } })
		if (filters.maxAmount) out.push({ key: 'max', label: 'To ' + filters.maxAmount + ' kr.', clear: { maxAmount: '' } })
		return out
	}, [filters, vendors.data, categories.data])

	const countSentence = n => n ? n + (n === 1 ? ' filter still active.' : ' filters still active.') : 'No filters left.'

	const removeChip = useCallback((chip, index) => {
		const rest = chips.length - 1
		refilter({ ...filters, ...chip.clear })
		setMessage(chip.label + ' removed. ' + countSentence(rest))
		queueMicrotask(() => {
			const buttons = [...(chipRow.current?.querySelectorAll('[data-chip]') ?? [])]
			const next = buttons[index] || buttons[index - 1]
			;(next || searchField.current || document.getElementById('page-title'))?.focus()
		})
	}, [chips, filters])

	const clearAll = () => {
		write(EMPTY, '', urlSort, 1)
		setMessage('All filters cleared.')
		queueMicrotask(() => (searchField.current || document.getElementById('page-title'))?.focus())
	}

	return (
		<Page variant="page-grid">
			<Card aria-label="Search and filters">
				<CardBody variant="card-body-filters">
					<div className="row-inline toolbar">
						<FieldShell>
							<Icon name="search" />
							<input ref={searchField} type="search" value={query}
								placeholder="Search vendor, note or item text…" aria-label="Search orders"
								onChange={e => setQuery(e.target.value)} />
						</FieldShell>
						<button type="button" className="button button-ghost" style={{ flex: 'none' }}
							data-filters-toggle aria-expanded={panelOpen} aria-controls="filter-panel"
							onClick={() => setPanelOpen(open => !open)}>
							<Icon name="filters" />FILTERS
							<Icon name="chevronDown" className="icon chevron-icon" style={{ color: 'var(--text-muted)' }} />
						</button>
						{/* The prototype draws this as a chip with a chevron and no handler -- a control
						    by every visual cue and inert. It is the app's one dropdown pattern now, and
						    it re-sorts through the API rather than reordering the page's own array,
						    because the page only holds the rows for the page you are on. */}
						<div style={{ flex: 'none', minWidth: 190 }}>
							<Combobox label="Sort orders"
								value={sorts.find(s => s.id === activeSort)?.label ?? ''}
								onChange={() => {}}
								onSelect={o => write(filters, query, o.id, 1)}
								groups={[{ heading: 'Sort by', options: sorts.map(s => ({ id: s.id, label: s.label })) }]} />
						</div>
					</div>

					{chips.length ? (
						<div className="row-inline" style={{ gap: 6 }} ref={chipRow}>
							{chips.map((chip, i) => (
								<Chip key={chip.key} data-chip={chip.key}
									label={'Remove filter ' + chip.label}
									onRemove={() => removeChip(chip, i)}>{chip.label}</Chip>
							))}
							<ButtonLink className="button-link" style={{ marginLeft: 6 }} onClick={clearAll}>CLEAR ALL</ButtonLink>
						</div>
					) : null}
					<p className="screenreader-only" role="status">{message}</p>

					<FilterSection id="filter-panel" hidden={!panelOpen}>
						{/* Every dropdown in the app is the one combobox: type to search, grouped
						    results, create from the foot. A native <select> here would be a second
						    dropdown pattern and a hole in the design system. README 9. */}
						<Field label="Vendor">
							<Combobox label="Vendor" placeholder="Any vendor"
								value={draft.vendorName ?? ''}
								onChange={v => setDraft({ ...draft, vendorName: v, vendorId: '' })}
								onSelect={o => setDraft({ ...draft, vendorName: o.label, vendorId: o.id })}
								groups={[{ heading: 'All vendors', options: (vendors.data ?? []).map(v =>
									({ id: v.id, label: v.name, meta: `${v.orders} orders` })) }]} />
						</Field>
						<FieldPair variant="field-pair-stack-early">
							<Field label="Category">
								<Combobox label="Category" placeholder="Any category"
									value={draft.categoryName ?? ''}
									onChange={v => setDraft({ ...draft, categoryName: v, categoryId: '' })}
									onSelect={o => setDraft({ ...draft, categoryName: o.label, categoryId: o.id })}
									groups={[{ heading: 'All categories', options: (categories.data ?? []).map(c =>
										({ id: c.id, label: c.name, meta: `${c.share}% of expenses` })) }]} />
							</Field>
							<Field label="Kind">
								<Combobox label="Kind" placeholder="Any kind" value={draft.kind ?? ''}
									onChange={v => setDraft({ ...draft, kind: v })}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="From">
								<DateInput label="From date" value={draft.from} onChange={v => setDraft({ ...draft, from: v })} />
							</Field>
							<Field label="To">
								<DateInput label="To date" value={draft.to} onChange={v => setDraft({ ...draft, to: v })} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="Min amount">
								<FieldShell>
									<input type="text" inputMode="decimal" placeholder="0,00" aria-label="Minimum amount"
										value={draft.minAmount} onChange={e => setDraft({ ...draft, minAmount: e.target.value })} />
									<FieldUnit>kr.</FieldUnit>
								</FieldShell>
							</Field>
							<Field label="Max amount">
								<FieldShell>
									<input type="text" inputMode="decimal" placeholder="Any" aria-label="Maximum amount"
										value={draft.maxAmount} onChange={e => setDraft({ ...draft, maxAmount: e.target.value })} />
									<FieldUnit>kr.</FieldUnit>
								</FieldShell>
							</Field>
						</FieldPair>
						<Field label="Status" group>
							<Segmented options={['Any', 'Ordered', 'Delivered', 'Returned']} value={draft.status}
								onChange={status => setDraft({ ...draft, status })} label="Status" />
						</Field>
						<div className="form-actions">
							<Button variant="caps compact" onClick={() => refilter(draft)}>APPLY FILTERS</Button>
							<Button variant="ghost compact" onClick={clearAll}>CLEAR</Button>
						</div>
					</FilterSection>
				</CardBody>
			</Card>

			<Async state={results} label="Loading orders">{data => (
				<Card aria-label="Orders">
					<CardHeader title={`Orders · ${data.matched} match`}>
						<span className="field-help">filtered from {data.total}</span>
					</CardHeader>
					<CardDivider />
					<CardBody variant="card-body-tight">
						{data.orders.length ? data.orders.map(order => (
							<OrderRow key={order.id} to={`/orders/${order.id}`}
								order={{ ...order, dateLabel: dayMonth(order.date) }} />
						)) : (
							<EmptyState>
								<p>No orders match these filters.</p>
								<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
							</EmptyState>
						)}
						{/* A real pager. It was two disabled buttons and a fixed "Showing 1 to 3 of 3";
						    the numbers are the API's now, and the buttons are disabled only at the ends,
						    which is the one honest reason to disable a control. README 13. */}
						<div className="space-between" style={{ marginTop: 12 }}>
							<span className="field-help">
								{data.matched
									? `Showing ${data.from} to ${data.to} of ${data.matched}`
									: 'Nothing to show'}
								{data.pages > 1 ? ` · page ${data.page} of ${data.pages}` : ''}
							</span>
							<span className="row-inline" style={{ gap: 8 }}>
								<Button variant="ghost" icon="chevronLeft" disabled={data.page <= 1}
									style={data.page <= 1 ? { opacity: 0.45 } : undefined}
									onClick={() => setPage(Math.max(1, data.page - 1))}>PREVIOUS</Button>
								<Button variant="ghost" iconAfter="chevronRight" disabled={data.page >= data.pages}
									style={data.page >= data.pages ? { opacity: 0.45 } : undefined}
									onClick={() => setPage(data.page + 1)}>NEXT</Button>
							</span>
						</div>
					</CardBody>
				</Card>
			)}</Async>
		</Page>
	)
}
