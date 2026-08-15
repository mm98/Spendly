import { useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { EntityRow } from '../components/Rows.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories, getSettings, listSorts } from '../api/client.js'
import { inkOn } from '../api/colour.js'
import { krRound, percent } from '../api/format.js'

/* All categories -- the same split as All vendors and All orders, for the same reasons. The
   rows open the category, because this is where a category is kept right: its budget, its
   colour, its glyph and the button that removes it all live on that page. The orders behind it
   are the second link at the end of the row.

   The budget is in the meta line rather than under a bar of its own. It is a fact about the
   row, which is where every other fact about a category goes, and a progress bar per row is a
   layout this app does not use anywhere else. */

const SORTS = {
	Spend: (a, b) => b.spend - a.spend,
	Name: (a, b) => a.name.localeCompare(b.name),
	Share: (a, b) => b.share - a.share,
	Saved: (a, b) => b.saved - a.saved
}

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
	const sort = chosen ?? listSorts.find(s => s.id === settings.data?.listSort)?.label ?? 'Name'

	return (
		<Page>
			<div className="row-inline toolbar">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search category name…"
						aria-label="Search categories" onChange={e => setQuery(e.target.value)} />
				</FieldShell>
				<Segmented options={Object.keys(SORTS)} value={sort} onChange={setChosen}
					label="Sort categories" tablist={false} />
			</div>

			<Async state={state} label="Loading your categories">{categories => {
				const needle = query.trim().toLowerCase()
				const listed = categories
					.filter(c => !needle || c.name.toLowerCase().includes(needle))
					.sort(SORTS[sort])

				return (
					<Card aria-label="All categories">
						<CardHeader title={`Categories · ${listed.length}${listed.length === categories.length ? '' : ` of ${categories.length}`}`}>
							<Button variant="pill" icon="plus" to="/categories/new">ADD</Button>
						</CardHeader>
						<CardDivider />
						<CardBody>
							{listed.map(category => (
								<EntityRow key={category.id}
									mark={<span className="category-icon"
										style={{ background: category.colour, color: inkOn(category.colour) }}>
										<Icon name={category.icon} path={category.iconPath} /></span>}
									name={category.name}
									meta={category.budget
										? `${percent(category.share)} of expenses · ${krRound(category.spend)} of ${krRound(category.budget)} budget`
										: `${percent(category.share)} of expenses · no budget set`}
									amount={krRound(category.spend)}
									sub={category.saved > 0 ? `saved ${krRound(category.saved)}` : undefined}
									editTo={`/categories/${category.id}/edit`}
									ordersTo={`/orders/all?category=${category.id}`}
									ordersLabel={`Orders in ${category.name}`} />
							))}
							{listed.length === 0 ? (
								<p className="field-help">
									{query ? `No category matches "${query}".` : 'No categories yet.'}
								</p>
							) : null}
						</CardBody>
					</Card>
				)
			}}</Async>
		</Page>
	)
}
