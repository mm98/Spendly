import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { OrderRow } from '../components/Rows.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection, Segmented } from '../components/Form.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { FilterChips, ListToolbar } from '../components/ListToolbar.jsx'
import { Pager } from '../components/Pager.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories, getOrders, getSettings, getVendors, sorts, spendKinds } from '../api/client.js'
import { currencySymbol, dayMonth, parseAmount, plural, sep } from '../api/format.js'
import { categoryGroups, vendorGroups } from '../api/pickerGroups.js'

/* All orders: the search, the filters, and what they leave.

   The chips are the filters, not a picture of them. The prototype drew three and removing
   one changed the list not at all, because the list was markup -- here a chip is the only
   place a filter is stored, so a chip that is gone is a filter that is off and the count
   above the list moves. How one is removed and announced is the same on every filtered list
   and lives in components/ListToolbar.jsx; what each one turns off is this page's, below.

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

/* The name behind an id the URL is holding, for the chips and for the panel's two comboboxes --
   one helper, so the two cannot name the same filter differently. Empty id, empty string; a list
   that has not arrived yet gives the id back, which is what both of them showed before the names
   landed and is better than a chip reading "Vendor: ". */
const nameOf = (list, id) => list?.find(x => x.id === id)?.name ?? id

/* `none` is the sentinel the "Without category" rows link with -- it names no record in the
   categories list, so the lookup above would echo the raw token into the chip and the panel.
   One place turns it into the name those rows carry, so the filter reads the same wherever it
   is shown. */
const categoryNameOf = (list, id) => id === 'none' ? 'Without category' : nameOf(list, id)

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
	const location = useLocation()
	const [params, setParams] = useSearchParams()
	const filters = useMemo(() => filtersFromParams(params), [params])
	const query = params.get('q') ?? ''
	const page = Number(params.get('page') ?? 1)
	const urlSort = params.get('sort')

	const [draft, setDraft] = useState(filters)
	/* Closed on arrival. It used to open, on the reasoning that a link could arrive carrying a
	   filter the closed panel would hide -- but the chip row above names every filter that is
	   on, and the draft below now shows the vendor and category the URL set rather than an empty
	   field, so opening the panel confirms that state instead of revealing it. Open, it is 8
	   fields and a segmented control standing between the search and the orders it filtered. */
	const [panelOpen, setPanelOpen] = useState(false)
	const searchField = useRef(null)

	const vendors = useApi(getVendors)
	const categories = useApi(getCategories)
	const settings = useApi(getSettings)

	/* The panel's own copy follows the URL, so a link that arrives with a filter on it opens the
	   panel showing that filter rather than the last one typed into it.

	   Vendor and category need translating on the way in, which is the half that was missing: the
	   URL carries `?category=groceries` and the comboboxes display names, so every link that
	   filters this list -- a category tile, a vendor card, a chart legend row, the answer to the
	   question of the day -- left those two fields reading "Any vendor" and "Any category" over a
	   list that was filtered by both. The panel was describing a filter it was not showing. Both
	   names come from the lists, which arrive after the first render, so this re-runs when they
	   land; every other filter is its own value in the URL and needs no lookup. */
	useEffect(() => setDraft({
		...filters,
		vendorName: nameOf(vendors.data, filters.vendorId),
		categoryName: categoryNameOf(categories.data, filters.categoryId)
	}), [filters, vendors.data, categories.data])

	/* The sort is the URL's when the URL has one, and the user's stored default otherwise. */
	const activeSort = urlSort ?? settings.data?.sort ?? 'date-desc'
	/* The one sort that also narrows: an order with no discount is not an order with the
	   lowest discount, so ranking by discount is over discounted orders only (the server
	   does it in buildOrderFilter, so the count and the page agree). That makes the sort a
	   possible reason for an empty list, which the empty state below has to be able to say --
	   "No orders match these filters" over filters nobody set, beside a CLEAR ALL that
	   deliberately keeps the sort and so would not have cleared it, is the empty-state defect
	   this page already fixed once for the no-orders-at-all case. */
	const narrowingSort = activeSort.startsWith('discount-')
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

	/* One chip per filter that is actually on. Deriving them rather than listing them is what
	   keeps the row and the query from disagreeing. */
	const chips = useMemo(() => {
		const out = []
		if (filters.from || filters.to) out.push({ key: 'dates',
			label: [filters.from && dayMonth(filters.from), filters.to && dayMonth(filters.to)].filter(Boolean).join(' - '),
			clear: { from: '', to: '' } })
		if (filters.status !== 'Any') out.push({ key: 'status', label: filters.status, clear: { status: 'Any' } })
		if (filters.vendorId) out.push({ key: 'vendor', label: 'Vendor: ' + nameOf(vendors.data, filters.vendorId), clear: { vendorId: '', vendorName: '' } })
		if (filters.categoryId) out.push({ key: 'category', label: 'Category: ' + categoryNameOf(categories.data, filters.categoryId), clear: { categoryId: '', categoryName: '' } })
		if (filters.kind) out.push({ key: 'kind', label: filters.kind, clear: { kind: '' } })
		if (filters.minAmount) out.push({ key: 'min', label: 'From ' + filters.minAmount + ' kr.', clear: { minAmount: '' } })
		if (filters.maxAmount) out.push({ key: 'max', label: 'To ' + filters.maxAmount + ' kr.', clear: { maxAmount: '' } })
		return out
	}, [filters, vendors.data, categories.data])

	// The announcement and where focus lands live with the chips (components/ListToolbar.jsx);
	// which filters an act turns off is this page's.
	const clearAll = () => write(EMPTY, '', urlSort, 1)

	return (
		<Page variant="page-grid">
			<Card aria-label="Search and filters">
				<CardBody variant="card-body-filters">
					{/* The sort re-sorts through the API rather than reordering the page's own
					    array, because the page only holds the rows for the page you are on. */}
					<ListToolbar query={query} onQuery={setQuery} searchRef={searchField}
						placeholder="Search vendor, note or item text..." label="Search orders"
						sortLabel="Sort orders" sorts={sorts}
						sortValue={sorts.find(s => s.id === activeSort)?.label ?? ''}
						onSort={id => write(filters, query, id, 1)}
						filters={{ open: panelOpen, panelId: 'filter-panel',
							onToggle: () => setPanelOpen(open => !open) }} />

					<FilterChips chips={chips} focusRef={searchField}
						onRemove={chip => refilter({ ...filters, ...chip.clear })}
						onClearAll={clearAll} />

					<FilterSection id="filter-panel" hidden={!panelOpen}>
						{/* Every dropdown in the app is the one combobox: type to search, grouped
						    results, create from the foot. A native <select> here would be a second
						    dropdown pattern and a hole in the design system. README: Fields and Forms. */}
						<Field label="Vendor" htmlFor="filter-vendor">
							{/* Same rule as every order form's own vendor picker: the combobox's filter
							    only matches an option's label, so this needs the same `search` field
							    to find a vendor by an alias, not only its own name. README: Vendors. */}
							<Combobox id="filter-vendor" label="Vendor" placeholder="Any vendor"
								value={draft.vendorName ?? ''}
								onChange={v => setDraft({ ...draft, vendorName: v, vendorId: '' })}
								onSelect={o => setDraft({ ...draft, vendorName: o.label, vendorId: o.id })}
								groups={vendorGroups(vendors.data, draft.vendorName ?? '')} />
						</Field>
						<FieldPair variant="field-pair-stack-early">
							<Field label="Category" htmlFor="filter-category">
								<Combobox id="filter-category" label="Category" placeholder="Any category"
									value={draft.categoryName ?? ''}
									onChange={v => setDraft({ ...draft, categoryName: v, categoryId: '' })}
									onSelect={o => setDraft({ ...draft, categoryName: o.label, categoryId: o.id })}
									/* The rows every ring folds its remainder into are reachable from here
									   too, not only by arriving on their link. Its own group: not a category. */
									groups={[...categoryGroups(categories.data),
										{ heading: 'Other', options: [{ id: 'none', label: 'Without category' }] }]} />
							</Field>
							<Field label="Kind" htmlFor="filter-kind">
								<Combobox id="filter-kind" label="Kind" placeholder="Any kind" value={draft.kind ?? ''}
									onChange={v => setDraft({ ...draft, kind: v })}
									groups={[{ heading: 'Kinds', options: spendKinds.map(k => ({ id: k, label: k })) }]} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="From" htmlFor="filter-from">
								<DateInput id="filter-from" label="From date" value={draft.from} onChange={v => setDraft({ ...draft, from: v })} />
							</Field>
							<Field label="To" htmlFor="filter-to">
								<DateInput id="filter-to" label="To date" value={draft.to} onChange={v => setDraft({ ...draft, to: v })} />
							</Field>
						</FieldPair>
						<FieldPair variant="field-pair-keep">
							<Field label="Min amount" htmlFor="filter-min-amount">
								<FieldShell>
									<input id="filter-min-amount" type="text" inputMode="decimal" placeholder="Any" aria-label="Minimum amount"
										value={draft.minAmount} onChange={e => setDraft({ ...draft, minAmount: e.target.value })} />
									<FieldUnit>{currencySymbol()}</FieldUnit>
								</FieldShell>
							</Field>
							<Field label="Max amount" htmlFor="filter-max-amount">
								<FieldShell>
									<input id="filter-max-amount" type="text" inputMode="decimal" placeholder="Any" aria-label="Maximum amount"
										value={draft.maxAmount} onChange={e => setDraft({ ...draft, maxAmount: e.target.value })} />
									<FieldUnit>{currencySymbol()}</FieldUnit>
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

			<Async state={results} label="Loading orders"
				skeleton={<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>}>
				{data => (
				<Card aria-label="Orders">
					<CardHeader title={`Orders${sep}${plural(data.matched, 'match', 'matches')}`} />
					<CardDivider />
					<CardBody variant="card-body-tight">
						{data.orders.length ? data.orders.map(order => (
							<OrderRow key={order.id} to={`/orders/${order.id}`}
								state={{ from: location.pathname + location.search }}
								order={{ ...order, dateLabel: dayMonth(order.date) }} />
						)) : data.total === 0 ? (
							/* Nothing to filter is not "nothing matches": on an account with no orders
							   at all the filter sentence blamed filters that were not set, and CLEAR ALL
							   offered to clear them. The answer is the create action, in the words Home's
							   Orders card already uses. README: Empty states, Honest Affordances. */
							<EmptyState>
								<p>No orders yet. Add one and your spending appears here.</p>
								<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
							</EmptyState>
						) : narrowingSort && !chips.length && !query ? (
							/* Sorted by discount with nothing filtered: the list is empty because no
							   order has a discount, and the action that fixes it is the sort, not a
							   CLEAR ALL with nothing to clear. */
							<EmptyState>
								<p>No orders have a discount yet.</p>
								<ButtonLink onClick={() => write(filters, query, 'date-desc', 1)}>SORT BY DATE</ButtonLink>
							</EmptyState>
						) : (
							<EmptyState>
								<p>{narrowingSort ? 'No discounted orders match these filters.' : 'No orders match these filters.'}</p>
								<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
							</EmptyState>
						)}
						{/* A real pager: the numbers are the API's, and the buttons disable only at the
						    ends, which is the one honest reason to disable a control. Shared with the
						    vendor and category lists, which page the same way from the same setting.
						    README: Honest Affordances, Pagination. */}
						<Pager from={data.from} to={data.to} matched={data.matched}
							page={data.page} pages={data.pages} onPage={setPage} />
					</CardBody>
				</Card>
			)}</Async>
		</Page>
	)
}
