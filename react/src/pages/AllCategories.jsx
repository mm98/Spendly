import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { EntityRow } from '../components/Rows.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell } from '../components/Form.jsx'
import { Combobox } from '../components/Combobox.jsx'
import { Pager, paginate } from '../components/Pager.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories, getSettings } from '../api/client.js'
import { inkOn } from '../api/colour.js'
import { krRound, percent, sep } from '../api/format.js'

/* All categories -- the same split as All vendors and All orders, for the same reasons. The
   rows open the category, because this is where a category is kept right: its budget, its
   colour, its glyph and the button that removes it all live on that page. The orders behind it
   are the second link at the end of the row.

   The budget is in the meta line rather than under a bar of its own. It is a fact about the
   row, which is where every other fact about a category goes, and a progress bar per row is a
   layout this app does not use anywhere else. */

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
	const state = useApi(getCategories)
	const [query, setQuery] = useState('')
	/* The account's order, not this page's opinion of one. It was hardcoded to Name here and
	   again on the other list, which is two places to change one answer and two places for the
	   answer to drift; it is one setting now, and Name is still what a fresh account gets --
	   this tab is where you come to find a particular record, and alphabetical is the order
	   that lets you do that without reading every row. Picking a different order here is for
	   this visit; the setting is what it opens as. README: Settings. */
	const settings = useApi(getSettings)
	const [chosen, setChosen] = useState(null)
	const sortId = chosen ?? settings.data?.listSort ?? 'name-asc'
	const sort = SORTS.find(s => s.id === sortId) ?? SORTS[0]

	/* The same paging All orders has, from the same setting -- see All vendors, which pages
	   for the same reason in the same shape. README: Settings, Pagination. */
	const [params, setParams] = useSearchParams()
	const pageSize = settings.data?.pageSize ?? 10
	const requestedPage = Number(params.get('page') ?? 1)
	const setPage = p => setParams(p > 1 ? { page: String(p) } : {}, { replace: true })

	const search = q => { setQuery(q); setPage(1) }
	const resort = id => { setChosen(id); setPage(1) }

	return (
		<Page>
			<div className="row-inline toolbar">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search category name..."
						aria-label="Search categories" onChange={e => search(e.target.value)} />
				</FieldShell>
				<Combobox className="toolbar-sort" label="Sort categories"
					value={sort.label} onChange={() => {}}
					onSelect={o => resort(o.id)}
					groups={[{ heading: 'Sort by', options: SORTS.map(s => ({ id: s.id, label: s.label })) }]} />
			</div>

			<Async state={state} label="Loading your categories">{categories => {
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
									mark={<span className="category-icon"
										style={{ background: category.colour, color: inkOn(category.colour) }}>
										<Icon name={category.icon} path={category.iconPath} /></span>}
									name={category.name}
									meta={category.budget
										? `${percent(category.share)} of expenses${sep}${krRound(category.spend)} of ${krRound(category.budget)} budget`
										: `${percent(category.share)} of expenses${sep}no budget set`}
									amount={krRound(category.spend)}
									sub={`saved ${krRound(category.saved)}`}
									editTo={`/categories/${category.id}/edit`}
									ordersTo={`/orders/all?category=${category.id}`}
									ordersLabel={`Orders in ${category.name}`} />
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
