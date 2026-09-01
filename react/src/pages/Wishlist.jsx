import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { InsetPanel, ItemRow } from '../components/Rows.jsx'
import { Button, ButtonLink, IconButton } from '../components/Button.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { FilterChips, ListToolbar } from '../components/ListToolbar.jsx'
import { Pager } from '../components/Pager.jsx'
import { Sep } from '../components/Sep.jsx'
import { DateInput, Field, FieldPair, FilterSection, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { httpUrl, siteOf } from '../api/rules.js'
import {
	getCategories, getSettings, getWishes, wishPhotoFileUrl, wishPhotoThumbnailUrl, wishSorts
} from '../api/client.js'
import { currency, dayMonth, longDate, percent, plural, sep } from '../api/format.js'

/* The wishlist: things the account wants and has not bought.

   A wish is not an order, and that is the whole reason this is its own section. Every total,
   chart and budget in the app reads the orders table on one assumption -- that a row there is
   money that has already left -- so a wish counted anywhere among them would quietly overstate
   a month. Nothing on this page reaches any of those figures.

   And this page is only ever a list. A wish is a record, so it is created and edited on its own
   page (pages/WishForm.jsx) the way a vendor and a category are -- one way to edit a record in
   this app, not one per screen. What is here is the working list every other list here is: one
   search field, one sort, one FILTERS panel, chips naming what is on, and a real pager cut to
   the account's own rows-per-page setting. The toolbar and the chips are the shared ones
   (components/ListToolbar.jsx); the filters and the sorts are this list's. */

/* Archived is a filter with three answers, and "no" is the one it takes when nobody asks: a
   wishlist is what you still want, so a list that opened with the things you had already put
   away would have to be narrowed before it could be read. The labels are what a reader sees;
   the values are what the URL and the API carry. */
const SHOWN = [
	{ value: 'no', label: 'On the list' },
	{ value: 'yes', label: 'Archived' },
	{ value: 'all', label: 'All' }
]
const shownLabel = value => SHOWN.find(s => s.value === value)?.label ?? SHOWN[0].label

const EMPTY = { categoryId: '', categoryName: '', from: '', to: '', archived: 'no' }

/* The filters live in the query string, not in component state -- the same rule All orders
   follows, and for the same reasons: a filtered list is then a URL that can be sent, the Back
   button walks the filters, and a link arriving from elsewhere cannot disagree with the chips
   above the list. */
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

	/* The panel's own copy follows the URL, so a link arriving with a filter on it opens the
	   panel showing that filter rather than the last thing typed into it. The category needs
	   translating on the way in -- the URL carries an id and the combobox shows a name -- and
	   the names land after the first render, so this re-runs when they do. */
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

	/* Sorted by price with nothing filtered: the list can be empty because no wish has a price
	   yet, and then the action that fixes it is the sort, not a CLEAR ALL with nothing to
	   clear. The narrowing lives on the server so the count and the page agree about it. */
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
								groups={[{ heading: 'All categories', options: (categories.data ?? []).map(c =>
									({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })) },
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
							<span className="field-help">filtered from {data.total}</span>
							{/* The way to a new record, where the vendor and category lists put it. */}
							<Button variant="pill" icon="plus" to="/wishlist/new">ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							{data.wishes.length ? (
								<InsetPanel>
									{data.wishes.map(wish => {
										const photo = wish.photoId
											? { src: wishPhotoThumbnailUrl(wish.id, wish.photoId) } : {}
										const href = httpUrl(wish.url)
										return (
											<ItemRow key={wish.id} className="item-row-group"
												icon={photo.src ? undefined : 'cube'}
												thumb={photo.src ? 'photo' : undefined} thumbSrc={photo.src}
												thumbHref={photo.src ? wishPhotoFileUrl(wish.id, wish.photoId) : undefined}
												thumbLabel={`Open the picture of ${wish.name} in a new tab`}
												title={wish.name}
												/* Where it is sold, when it was written down, whether it is put
												   away, and what it would land under -- the row's own meta line
												   rather than chips: a chip is something you can take away
												   (components/Chip.jsx), and nothing on a row here removes a
												   category. */
												meta={[siteOf(wish.url), `Added ${longDate(wish.createdAt)}`,
													wish.archived ? 'Archived' : '',
													wish.categories.join(', ')].filter(Boolean).join(sep)}
												amount={wish.price != null ? currency(wish.price) : undefined}>
												{/* The row itself goes nowhere, so it is not a link: it offers two
												    destinations rather than one, and a row that quietly picks one
												    of them for you is the dishonest half of that. Both are real
												    links -- middle-click and "open in new tab" work on each, and
												    the status bar says where each goes. README: Honest
												    Affordances. */}
												<span className="row-inline row-actions">
													{href ? (
														<IconButton icon="externalLink" href={href}
															target="_blank" rel="noopener noreferrer"
															label={`Open ${wish.name} at ${siteOf(wish.url)} in a new tab`} />
													) : null}
													<IconButton icon="pencil" to={`/wishlist/${wish.id}/edit`}
														label={`Edit ${wish.name}`} />
												</span>
											</ItemRow>
										)
									})}
								</InsetPanel>
							) : data.total === 0 ? (
								/* Nothing to filter is not "nothing matches": on an account with no
								   wishes at all the filter sentence would blame filters nobody set, and
								   CLEAR ALL would offer to clear them. README: Empty states. */
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

							{/* What is on this page adds up to, which is not what the whole list does --
							    so it says which. A wish with no price written down is not a wish that
							    costs nothing, so it is left out of the sum and the sentence names how
							    many were counted. */}
							{data.wishes.length ? <PageTotal wishes={data.wishes} /> : null}

							<Pager from={data.from} to={data.to} matched={data.matched}
								page={data.page} pages={data.pages} onPage={setPage} />
						</CardBody>
					</Card>
				)}
			</Async>
		</Page>
	)
}

/** What the rows on screen come to. Named for what it counts -- this page, not the wishlist --
    because a pager underneath it means those are two different figures. */
function PageTotal({ wishes }) {
	const priced = wishes.filter(w => w.price != null)
	const total = priced.reduce((sum, w) => sum + w.price, 0)
	return (
		<div className="line-total-row">
			<span>
				{plural(wishes.length, 'wish', 'wishes')} on this page
				{priced.length ? <><Sep />{currency(total)}</> : null}
			</span>
			{priced.length && priced.length !== wishes.length ? (
				<span className="field-help">the total is for the {priced.length} with a price</span>
			) : null}
		</div>
	)
}
