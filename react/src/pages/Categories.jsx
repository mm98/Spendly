import { useMemo, useState } from 'react'
import { Page, useView } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note, QuestionCard } from '../components/Card.jsx'
import { CategoryRow } from '../components/Rows.jsx'
import { Donut, Meter } from '../components/Viz.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getCategoriesOverview } from '../api/client.js'
import { krRound, percent } from '../api/format.js'

/* Categories.

   The Manage sub-tab hides what is marked [data-view-only="overview"] -- the ring and the
   question -- and what is left is the thing you manage. In the prototype that was the only
   difference: the same read-only list, with two cards taken away. Here the two views send a
   row to two different places -- the orders behind it, or the category itself -- so the tab
   does something in both positions, which is the bar every tab in this app has to clear.
   README: Honest Affordances.

   Nothing is created or edited on this page. A category is a record, and a record is written
   on its own page through the one form component the app has, the same as an order and a
   vendor: ADD goes to /categories/new and a row in Manage goes to /categories/:id/edit, where
   the budget, the colour, the glyph and DELETE all live. The inline editor this replaced was a
   second way to write the same record -- bordered section inside a card body inside a card,
   with its own name check and its own idea of what a rejection looks like. See
   components/FormPage.jsx. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.share - a.share }

export default function Categories() {
	const state = useApi(getCategoriesOverview)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')
	const [answering, setAnswering] = useState(false)
	const { view } = useView()

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
				<CategoriesBody data={data} query={query} sort={sort} manage={view === 'manage'}
					answering={answering} setAnswering={setAnswering} />
			)}</Async>
		</Page>
	)
}

function CategoriesBody({ data, query, sort, manage, answering, setAnswering }) {
	const answer = data.question
	const listed = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return data.categories
			.filter(c => !needle || c.name.toLowerCase().includes(needle))
			.sort(SORTS[sort])
	}, [data.categories, query, sort])

	const spent = data.categories.reduce((sum, c) => sum + c.spend, 0)

	/* Manage drops the rail rather than hiding it. `[data-view-only]` is the stylesheet's own
	   mechanism and it is the right one for content inside a column -- but this rail *is* a
	   column, and `.two-column` is a grid: hiding the child leaves the track it sat in, so the
	   list stayed at half width with nothing beside it. A column that is not there is not
	   rendered. */
	return (
		<div className={manage ? 'page-grid' : 'two-column'}>
			<Card aria-label="Categories">
				<CardHeader title={manage ? 'Manage categories' : 'Categories'}>
					<Button variant="pill" icon="plus" to="/categories/new">ADD</Button>
				</CardHeader>
				<CardDivider />
				<CardBody>
					<div className="category-rows">
						{listed.map(category => (
							/* One row per category, the row the system already has, and the whole row is
							   the way in -- the same as an order row in All orders. A pair of icon
							   buttons hanging off the end was a second layout for going somewhere.
							   The budget is a fact about the row, so it goes in the row's own meta line
							   where every other fact about a category goes; a progress bar under each
							   one was a layout this app does not otherwise use. README: Cards. */
							<CategoryRow key={category.id} category={category}
								to={manage ? `/categories/${category.id}/edit` : `/orders/all?category=${category.id}`}
								meta={manage
									? (category.budget
										? `${krRound(category.spend)} of ${krRound(category.budget)} budget`
										: 'No budget set')
									: undefined} />
						))}
					</div>
					{listed.length === 0
						? <p className="field-help">{query ? `No category matches "${query}".` : 'No categories yet.'}</p>
						: null}
					{manage
						? <span className="field-help">A row opens the category: its budget, its colour,
							its glyph, and the button that removes it.</span>
						: <Button variant="block" to="/orders/all">VIEW ALL</Button>}
				</CardBody>
			</Card>

			{manage ? null : (
			<div className="page-grid">
				<QuestionCard label="Question of the day" title={answer?.short ?? 'Ask Spendly about your spending.'}>
					{answering && answer ? (
						<>
							<Note tone="positive" title={answer.answer}>{answer.detail}</Note>
							<Button variant="ghost" iconAfter="chevronRight"
								to={`/orders/all?category=${answer.categoryId}&from=${answer.from}&to=${answer.to}`}>
								SEE THOSE ORDERS</Button>
						</>
					) : (
						<Button variant="ghost" aria-expanded={answering} disabled={!answer}
							onClick={() => setAnswering(true)}>SEE THE ANSWER</Button>
					)}
				</QuestionCard>

				<Card aria-label="Breakdown">
					<CardHeader title="Breakdown · all time" />
					<CardDivider />
					<CardBody className="donut-box">
						<Donut segments={data.categories.map(c => ({ share: c.share, colour: c.colour }))}
							value={krRound(spent)} label="Spent, all time"
							ariaLabel={`Category split of ${krRound(spent)}`} />
					</CardBody>
				</Card>

				<Card aria-label="Budget">
					<CardHeader title="Against budget" />
					<CardDivider />
					<CardBody>
						{data.categories.some(c => c.budget > 0) ? (
							<>
								<div className="figure-card tabular-figures">
									{percent(budgetUsed(data.categories), 0)}</div>
								<span className="card-caption">of this month's budget used</span>
								<Meter style={{ marginTop: 14 }}
									fill={Math.min(100, budgetUsed(data.categories))}
									ariaLabel={`${percent(budgetUsed(data.categories), 0)} of budget used`} />
								<span className="field-help" style={{ marginTop: 8, display: 'block' }}>
									Budgets are set per category, on the Manage tab.
								</span>
							</>
						) : (
							<p className="field-help">
								No budgets set yet. The Manage tab gives a category a monthly allowance.</p>
						)}
					</CardBody>
				</Card>
			</div>
			)}
		</div>
	)
}

const budgetUsed = categories => {
	const budgeted = categories.filter(c => c.budget > 0)
	const allowed = budgeted.reduce((sum, c) => sum + c.budget, 0)
	return allowed ? (budgeted.reduce((sum, c) => sum + c.spend, 0) / allowed) * 100 : 0
}
