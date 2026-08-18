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
import { getVendors, getSettings } from '../api/client.js'
import { inkOn } from '../api/colour.js'
import { currency, dayMonth, sep } from '../api/format.js'

/* All vendors.

   The list half of the same split All orders has: Overview is what the numbers say, this tab
   is the records themselves. It used to be a grid of cards on the overview page -- one card
   per vendor, each with its own header, inset panel and pair of buttons -- which is a lot of
   chrome to say "Bilka, 34 orders" and does not scan at all past a dozen of them. A list of
   rows does, which is why the orders list has always been one.

   This page is for keeping the record right, so the row opens the vendor -- a vendor page
   whose rows opened the orders list would be the orders list with extra steps. Its orders are
   a real thing to want and a different destination, reached from the vendor's own page: the
   summary rail there ends in a full-width VIEW ORDERS, which is a labelled control on the page
   that already holds every other action on the record, rather than an unlabelled glyph at the
   end of every row here.

   Every vendor is here, favourites included. They are pinned on Overview as well, and a record
   being somewhere else is not a reason to leave it out of the one list that searches and
   sorts. */

/* Every ranking column, both directions, paired -- the scheme the orders list sorts by; Name
   is alphabetical, for finding a record, so it offers the one direction that finds. The shared
   five carry the ids the setting stores; Orders is this list's own column and has no setting
   id to answer to. Labels name the column and the direction, because an option that says
   "Spend" and means highest-first names half of what it does. */
const SORTS = [
	{ id: 'name-asc', label: 'Name, A to Z', cmp: (a, b) => a.name.localeCompare(b.name) },
	{ id: 'spend-desc', label: 'Spend, highest', cmp: (a, b) => b.spend - a.spend },
	{ id: 'spend-asc', label: 'Spend, lowest', cmp: (a, b) => a.spend - b.spend },
	{ id: 'orders-desc', label: 'Orders, most', cmp: (a, b) => b.orders - a.orders },
	{ id: 'orders-asc', label: 'Orders, fewest', cmp: (a, b) => a.orders - b.orders },
	{ id: 'saved-desc', label: 'Saved, highest', cmp: (a, b) => b.saved - a.saved },
	{ id: 'saved-asc', label: 'Saved, lowest', cmp: (a, b) => a.saved - b.saved }
]

export default function AllVendors() {
	const state = useApi(getVendors)
	/* The account's order, not this page's opinion of one. It was hardcoded to Name here and
	   again on the other list, which is two places to change one answer and two places for the
	   answer to drift; it is one setting now, and Name is still what a fresh account gets --
	   this tab is where you come to find a particular record, and alphabetical is the order
	   that lets you do that without reading every row. Picking a different order here is for
	   this visit; the setting is what it opens as. README: Settings. */
	const settings = useApi(getSettings)

	/* The whole of this list's state is the query string -- the keyword and the sort as well
	   as the page. The page was in the URL and the other two were `useState`, which is a rule
	   obeyed for one field of three: the same list, told the same way twice, was linkable by
	   page number and not by what it was searching for. README: Pagination says the page is
	   kept "in the URL with the rest of the list state", and this is the rest of it. It is
	   also what lets ListState remember the list in one string rather than three. */
	const [params, setParams] = useSearchParams()
	const pageSize = settings.data?.pageSize ?? 10
	const query = params.get('q') ?? ''
	const sortId = params.get('sort') ?? settings.data?.listSort ?? 'name-asc'
	const sort = SORTS.find(s => s.id === sortId) ?? SORTS[0]
	const requestedPage = Number(params.get('page') ?? 1)

	/* One writer, so the three cannot disagree about what the URL currently holds. A new
	   search or sort resets to page one, because page 4 of a list that just changed shape is
	   a position in the old answer. */
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
			<div className="row-inline toolbar">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search vendor name..."
						aria-label="Search vendors" onChange={e => search(e.target.value)} />
				</FieldShell>
				{/* The same combobox All orders sorts with -- three working lists asked the same
				    question with two different controls and two vocabularies. README: All Orders. */}
				<Combobox className="toolbar-sort" label="Sort vendors"
					value={sort.label} onChange={() => {}}
					onSelect={o => resort(o.id)}
					groups={[{ heading: 'Sort by', options: SORTS.map(s => ({ id: s.id, label: s.label })) }]} />
			</div>

			<Async state={state} label="Loading your vendors">{vendors => {
				const needle = query.trim().toLowerCase()
				const listed = vendors
					.filter(v => !needle || v.name.toLowerCase().includes(needle))
					.sort(sort.cmp)
				const paged = paginate(listed, requestedPage, pageSize)

				return (
					<Card aria-label="All vendors">
						{/* The count says how many are on screen, and how many there are when a search
						    is holding some back -- "12" and "3 of 12" are different facts and the
						    second one is the one a filtered list owes the reader. */}
						<CardHeader title={`Vendors${sep}${listed.length}${listed.length === vendors.length ? '' : ` of ${vendors.length}`}`}>
							<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							{paged.rows.map(vendor => (
								<EntityRow key={vendor.id}
									mark={<span className="entry-avatar"
										style={{ background: vendor.colour, color: inkOn(vendor.colour) }}>{vendor.initials}</span>}
									name={vendor.name}
									meta={`${vendor.orders} order${vendor.orders === 1 ? '' : 's'}` +
										(vendor.latest ? `${sep}latest ${dayMonth(vendor.latest.date)}` : `${sep}none yet`)}
									amount={currency(vendor.spend, 0)}
									sub={`saved ${currency(vendor.saved, 0)}`}
									editTo={`/vendors/${vendor.id}/edit`} />
							))}
							{listed.length === 0 ? (
								/* The system's empty state, not a bare help line -- see All categories. */
								<EmptyState>
									<p>{query
										? `No vendor matches "${query}".`
										: 'No vendors yet. One is created with your first order.'}</p>
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
