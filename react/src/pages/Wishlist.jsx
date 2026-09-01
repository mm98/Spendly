import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { EntityRow } from '../components/Rows.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { ImageOrIcon } from '../components/Icon.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { FilterChips, ListToolbar } from '../components/ListToolbar.jsx'
import { Pager } from '../components/Pager.jsx'
import { DateInput, Field, FieldPair, FilterSection, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { httpUrl, siteOf } from '../api/rules.js'
import { getCategories, getSettings, getWishes, wishPhotoThumbnailUrl, wishSorts } from '../api/client.js'
import { currency, dayMonth, longDate, plural, sep } from '../api/format.js'
import { categoryGroups } from '../api/pickerGroups.js'

/* Only ever a list: a wish is a record, edited on its own page (pages/WishForm.jsx). Archived
   has two answers because the checkbox has two, and unasked it takes "Open". */
const SHOWN = [
	{ value: 'no', label: 'Open' },
	{ value: 'yes', label: 'Archived' }
]
const shownLabel = value => SHOWN.find(s => s.value === value)?.label ?? SHOWN[0].label

const EMPTY = { categoryId: '', categoryName: '', from: '', to: '', archived: 'no' }

/* In the query string, not component state: a filtered list is then a URL that can be sent,
   and the chips cannot disagree with a link that arrives carrying filters. */
const filtersFromParams = params => ({
	...EMPTY,
	categoryId: params.get('category') ?? '',
	from: params.get('from') ?? '',
	to: params.get('to') ?? '',
	archived: SHOWN.some(s => s.value === params.get('archived')) ? params.get('archived') : 'no'
})

const paramsFromFilters = (filters, query, sort, page) => {
	const out = {}
	if (query) out.q = query
	if (filters.categoryId) out.category = filters.categoryId
	if (filters.from) out.from = filters.from
	if (filters.to) out.to = filters.to
	if (filters.archived !== 'no') out.archived = filters.archived
	if (sort) out.sort = sort
	if (page > 1) out.page = String(page)
	return out
}

const nameOf = (list, id) => list?.find(x => x.id === id)?.name ?? id
const categoryNameOf = (list, id) => id === 'none' ? 'Without category' : nameOf(list, id)

export default function Wishlist() {
	const [params, setParams] = useSearchParams()
	const filters = useMemo(() => filtersFromParams(params), [params])
	const query = params.get('q') ?? ''
	const page = Number(params.get('page') ?? 1)
	const activeSort = wishSorts.find(s => s.id === params.get('sort'))?.id ?? 'added-desc'

	const [draft, setDraft] = useState(filters)
	const [panelOpen, setPanelOpen] = useState(false)
	const searchField = useRef(null)

	const categories = useApi(getCategories)
	const settings = useApi(getSettings)
	const pageSize = settings.data?.pageSize ?? 10

	/* The panel follows the URL, so a link carrying a filter opens it showing that filter. The
	   category is an id there and a name here, and the names land after the first render. */
	useEffect(() => setDraft({
		...filters,
		categoryName: categoryNameOf(categories.data, filters.categoryId)
	}), [filters, categories.data])

	/* Writing a filter is writing the URL. Anything but the page resets to page one: staying on
	   page 4 of a result set that now has two is how a filter reports "no wishes" it matched. */
	const write = (next, nextQuery = query, nextSort = params.get('sort'), nextPage = 1) =>
		setParams(paramsFromFilters(next, nextQuery, nextSort, nextPage), { replace: true })
	const setQuery = q => write(filters, q, params.get('sort'), 1)
	const setPage = p => write(filters, query, params.get('sort'), p)
	const refilter = next => write(next, query, params.get('sort'), 1)
	const clearAll = () => write(EMPTY, '', params.get('sort'), 1)

	const request = useMemo(() => ({
		query,
		categoryId: filters.categoryId,
		from: filters.from,
		to: filters.to,
		archived: filters.archived,
		sort: activeSort,
		page,
		pageSize
	}), [query, filters, activeSort, page, pageSize])

	const state = useApi(getWishes, [request])

	/* One chip per filter that is actually on, derived rather than listed -- what keeps the row
	   and the query from disagreeing. */
	const chips = useMemo(() => {
		const out = []
		if (filters.from || filters.to) out.push({ key: 'dates',
			label: [filters.from && dayMonth(filters.from), filters.to && dayMonth(filters.to)].filter(Boolean).join(' - '),
			clear: { from: '', to: '' } })
		if (filters.categoryId) out.push({ key: 'category',
			label: 'Category: ' + categoryNameOf(categories.data, filters.categoryId),
			clear: { categoryId: '', categoryName: '' } })
		if (filters.archived !== 'no') out.push({ key: 'archived',
			label: 'Showing: ' + shownLabel(filters.archived), clear: { archived: 'no' } })
		return out
	}, [filters, categories.data])

	// Sorted by price the list can be empty because no wish has one, and then the fix is the
	// sort rather than a CLEAR ALL with nothing to clear.
	const narrowingSort = activeSort.startsWith('price-')

	return (
		<Page variant="page-grid">
			<Card aria-label="Search and filters">
				<CardBody variant="card-body-filters">
					<ListToolbar query={query} onQuery={setQuery} searchRef={searchField}
						placeholder="Search wish, shop or category..." label="Search wishes"
						sortLabel="Sort wishes" sorts={wishSorts}
						sortValue={wishSorts.find(s => s.id === activeSort)?.label ?? ''}
						onSort={id => write(filters, query, id, 1)}
						filters={{ open: panelOpen, panelId: 'filter-panel',
							onToggle: () => setPanelOpen(open => !open) }} />

					<FilterChips chips={chips} focusRef={searchField}
						onRemove={chip => refilter({ ...filters, ...chip.clear })}
						onClearAll={clearAll} />

					<FilterSection id="filter-panel" hidden={!panelOpen}>
						<Field label="Category" htmlFor="filter-category">
							<Combobox id="filter-category" label="Category" placeholder="Any category"
								value={draft.categoryName ?? ''}
								onChange={v => setDraft({ ...draft, categoryName: v, categoryId: '' })}
								onSelect={o => setDraft({ ...draft, categoryName: o.label, categoryId: o.id })}
								groups={[...categoryGroups(categories.data),
									{ heading: 'Other', options: [{ id: 'none', label: 'Without category' }] }]} />
						</Field>
						{/* When it was added, which is the only date a wish has -- it is not dated by
						    the reader the way an order is, so From/To are about the day it was written
						    down. */}
						<FieldPair variant="field-pair-keep">
							<Field label="Added from" htmlFor="filter-from">
								<DateInput id="filter-from" label="Added from date" value={draft.from}
									onChange={v => setDraft({ ...draft, from: v })} />
							</Field>
							<Field label="Added to" htmlFor="filter-to">
								<DateInput id="filter-to" label="Added to date" value={draft.to}
									onChange={v => setDraft({ ...draft, to: v })} />
							</Field>
						</FieldPair>
						<Field label="Show" group>
							<Segmented options={SHOWN.map(s => s.label)} value={shownLabel(draft.archived)}
								onChange={label => setDraft({
									...draft, archived: SHOWN.find(s => s.label === label).value })}
								label="Show" />
						</Field>
						<div className="form-actions">
							<Button variant="caps compact" onClick={() => refilter(draft)}>APPLY FILTERS</Button>
							<Button variant="ghost compact" onClick={clearAll}>CLEAR</Button>
						</div>
					</FilterSection>
				</CardBody>
			</Card>

			<Async state={state} label="Loading your wishlist"
				skeleton={<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>}>
				{data => (
					<Card aria-label="Wishes">
						<CardHeader title={`Wishes${sep}${plural(data.matched, 'match', 'matches')}`}>
							{/* The way to a new record, where the vendor and category lists put it. */}
							<Button variant="pill" icon="plus" to="/wishlist/new">ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody variant="card-body-tight">
							{data.wishes.length ? (
								data.wishes.map(wish => {
									const href = httpUrl(wish.url)
									return (
										<EntityRow key={wish.id} editTo={`/wishlist/${wish.id}/edit`}
											/* Drawn empty where there is no picture, so the column is kept
											   and no name shifts sideways between rows. */
											mark={<span className="document-thumb">
												<ImageOrIcon src={wish.photoId ? wishPhotoThumbnailUrl(wish.id, wish.photoId) : ''}
													icon="photo" imgClassName="document-thumb-img" /></span>}
											name={wish.name}
											// One meta line, the way a vendor row names its orders and
											// aliases.
											meta={[siteOf(wish.url), `Added ${longDate(wish.createdAt)}`,
												wish.archived ? 'Archived' : '',
												wish.categories.join(', ')].filter(Boolean).join(sep)}
											/* At 393px the three cannot all have their width, and the two
											   that identify the record win. */
										amount={<span className="wide-only">
											{wish.price != null ? currency(wish.price) : '-'}</span>}
											/* The row goes where the wish points; the button changes it. An
											   address that will not parse leaves the plain row that edits. */
											open={href ? { href,
												label: `Open ${wish.name} at ${siteOf(wish.url)} in a new tab` } : null}
											action={href ? (
												<IconButton icon="pencil" to={`/wishlist/${wish.id}/edit`}
													label={`Edit ${wish.name}`} />
											) : null} />
									)
								})
							) : data.total === 0 ? (
								/* Nothing to filter is not "nothing matches": with no wishes at all,
								   CLEAR ALL would offer to clear filters nobody set. */
								<EmptyState icon="cart">
									<p>Nothing on your wishlist yet. Add the first thing you are thinking about buying.</p>
									<ButtonLink to="/wishlist/new">ADD A WISH</ButtonLink>
								</EmptyState>
							) : narrowingSort && !chips.length && !query ? (
								<EmptyState icon="cart">
									<p>No wishes have a price yet.</p>
									<ButtonLink onClick={() => write(filters, query, 'added-desc', 1)}>SORT BY ADDED</ButtonLink>
								</EmptyState>
							) : (
								<EmptyState icon="cart">
									<p>{narrowingSort
										? 'No wishes with a price match these filters.'
										: 'No wishes match these filters.'}</p>
									<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
								</EmptyState>
							)}

							<Pager from={data.from} to={data.to} matched={data.matched}
								page={data.page} pages={data.pages} onPage={setPage} />
						</CardBody>
					</Card>
				)}
			</Async>
		</Page>
	)
}
