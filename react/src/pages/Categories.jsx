import { useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, QuestionCard } from '../components/Card.jsx'
import { CategoryRow } from '../components/Rows.jsx'
import { Donut } from '../components/Viz.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getCategoriesOverview } from '../api/client.js'
import { krRound } from '../api/format.js'

/* Categories.

   The Manage sub-tab hides what is marked [data-view-only="overview"] -- the ring and the
   question -- and leaves the list, which is the thing you manage. The tab does something in
   both positions, which is the bar every tab in this app has to clear. README 13. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.share - a.share }

export default function Categories() {
	const state = useApi(getCategoriesOverview)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')

	return (
		<Page>
			<div className="row-inline toolbar">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search category name…"
						aria-label="Search categories" onChange={e => setQuery(e.target.value)} />
				</FieldShell>
				<Segmented options={Object.keys(SORTS)} value={sort} onChange={setSort}
					label="Sort categories" tablist={false} />
			</div>

			<Async state={state} label="Loading your categories">{data => (
				<CategoriesBody data={data} query={query} sort={sort} />
			)}</Async>
		</Page>
	)
}

function CategoriesBody({ data, query, sort }) {
	const listed = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return data.categories
			.filter(c => !needle || c.name.toLowerCase().includes(needle))
			.sort(SORTS[sort])
	}, [data.categories, query, sort])

	const spent = data.categories.reduce((sum, c) => sum + c.spend, 0)

	return (
		<div className="two-column">
			<Card aria-label="Categories">
				<CardHeader title="Categories">
					<Button variant="pill">ADD</Button>
				</CardHeader>
				<CardDivider />
				<CardBody>
					<div className="category-rows">
						{listed.map(category => (
							<CategoryRow key={category.id} category={category}
								to={`/orders/all?category=${category.id}`} />
						))}
					</div>
					{listed.length === 0 ? <p className="field-help">No category matches "{query}".</p> : null}
					<Button variant="block" to="/orders/all">VIEW ALL</Button>
				</CardBody>
			</Card>

			<div className="page-grid" data-view-only="overview">
				<QuestionCard label="Question of the day" title={data.question.short}>
					<Button variant="ghost">SEE THE ANSWER</Button>
				</QuestionCard>

				<Card aria-label="Breakdown">
					<CardHeader title="Breakdown · July" />
					<CardDivider />
					<CardBody className="donut-box">
						<Donut segments={data.categories.map(c => ({ share: c.share, colour: c.colour }))}
							value={krRound(spent)} label="Spent this month"
							ariaLabel={`Category split of ${krRound(spent)}`} />
					</CardBody>
				</Card>
			</div>
		</div>
	)
}
