import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { EntityRow, EntityMark } from '../components/Rows.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { ListToolbar } from '../components/ListToolbar.jsx'
import { Pager, paginate } from '../components/Pager.jsx'
import { useApi } from '../api/useApi.js'
import { getCategoriesThisMonth, getSettings } from '../api/client.js'
import { inkOn } from '../api/colour.js'
import { currency, percent, sep } from '../api/format.js'

/* All categories -- the same split as All vendors and All orders, for the same reasons. The
   rows open the category, because this is where a category is kept right: its budget, its
   colour, its glyph, the button that removes it and the way into the orders behind it all live
   on that page.

   The budget is in the meta line rather than under a bar of its own. It is a fact about the
   row, which is where every other fact about a category goes, and a progress bar per row is a
   layout this app does not use anywhere else. It names its month, because the amount column
   beside it is all-time and two figures of two periods sitting one line apart is exactly how
   the same row once read "1.456.574 kr. of 1.000 kr. budget". */

/* Same shape as All vendors' list, with Share as this list's own column. */
const SORTS = [
	{ id: 'name-asc', label: 'Name, A to Z', cmp: (a, b) => a.name.localeCompare(b.name) },
	{ id: 'spend-desc', label: 'Spend, highest', cmp: (a, b) => b.spend - a.spend },
	{ id: 'spend-asc', label: 'Spend, lowest', cmp: (a, b) => a.spend - b.spend },
	{ id: 'share-desc', label: 'Share, highest', cmp: (a, b) => b.share - a.share },
	{ id: 'share-asc', label: 'Share, lowest', cmp: (a, b) => a.share - b.share },
	{ id: 'saved-desc', label: 'Saved, highest', cmp: (a, b) => b.saved - a.saved },
	{ id: 'saved-asc', label: 'Saved, lowest', cmp: (a, b) => a.saved - b.saved }
]

export default function AllCategories() {
	/* The joined read the overview tab uses, under the same cache key: the budget in each
	   row's meta is a monthly allowance, so the figure beside it has to be this month's spend
	   rather than the all-time total the amount column carries. */
	const state = useApi(getCategoriesThisMonth)
	/* The account's order, not this page's opinion of one. It was hardcoded to Name here and
	   again on the other list, which is two places to change one answer and two places for the
	   answer to drift; it is one setting now, and Name is still what a fresh account gets --
	   this tab is where you come to find a particular record, and alphabetical is the order
	   that lets you do that without reading every row. Picking a different order here is for
	   this visit; the setting is what it opens as. README: Settings. */
	const settings = useApi(getSettings)

	/* Keyword, sort and page in the query string -- see All vendors, which holds its list
	   state the same way for the same reasons. README: Settings, Pagination. */
	const [params, setParams] = useSearchParams()
	const pageSize = settings.data?.pageSize ?? 10
	const query = params.get('q') ?? ''
	const sortId = params.get('sort') ?? settings.data?.listSort ?? 'name-asc'
	const sort = SORTS.find(s => s.id === sortId) ?? SORTS[0]
	const requestedPage = Number(params.get('page') ?? 1)

	const write = (q, id, page) => {
		const out = {}
		if (q) out.q = q
		if (id) out.sort = id
		if (page > 1) out.page = String(page)
		setParams(out, { replace: true })
	}
	const setPage = p => write(query, params.get('sort'), p)
	const search = q => write(q, params.get('sort'), 1)
	const resort = id => write(query, id, 1)

	return (
		<Page>
			<ListToolbar query={query} onQuery={search}
				placeholder="Search category name..." label="Search categories"
				sortLabel="Sort categories" sorts={SORTS} sortValue={sort.label} onSort={resort} />

			<Async state={state} label="Loading your categories" skeleton={<SkeletonCard><SkeletonRows count={6} /></SkeletonCard>}>
				{categories => {
				const needle = query.trim().toLowerCase()
				const listed = categories
					.filter(c => !needle || c.name.toLowerCase().includes(needle))
					.sort(sort.cmp)
				const paged = paginate(listed, requestedPage, pageSize)

				return (
					<Card aria-label="All categories">
						<CardHeader title={`Categories${sep}${listed.length}${listed.length === categories.length ? '' : ` of ${categories.length}`}`}>
							<Button variant="pill" icon="plus" to="/categories/new">ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							{paged.rows.map(category => (
								<EntityRow key={category.id}
									mark={<EntityMark favourite={category.favourite}>
										<span className="category-icon"
											style={{ background: category.colour, color: inkOn(category.colour) }}>
											<Icon name={category.icon} path={category.iconPath} /></span>
									</EntityMark>}
									name={category.name}
									meta={category.budget
										? `${percent(category.share)} of expenses${sep}${currency(category.monthSpend, 0)} of ${currency(category.budget, 0)} budget this month`
										: `${percent(category.share)} of expenses${sep}no budget set`}
									amount={currency(category.spend, 0)}
									sub={`saved ${currency(category.saved, 0)}`}
									editTo={`/categories/${category.id}/edit`} />
							))}
							{listed.length === 0 ? (
								/* The system's empty state, not a bare help line -- this list and All
								   vendors were the two places an empty list was a left-aligned sentence
								   with no icon tile. The no-records sentence says what fills it, the same
								   words the overview's breakdown uses. README: Empty states. */
								<EmptyState>
									<p>{query
										? `No category matches "${query}".`
										: 'No categories yet. Add one and your spending splits by kind.'}</p>
								</EmptyState>
							) : null}
							<Pager {...paged} onPage={setPage} />
						</CardBody>
					</Card>
				)
			}}</Async>
		</Page>
	)
}
