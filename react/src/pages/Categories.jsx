import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { LegendRow } from '../components/Rows.jsx'
import { Donut, Meter, foldForRing } from '../components/Viz.jsx'
import { Button } from '../components/Button.jsx'
import { useApi } from '../api/useApi.js'
import { getCategories } from '../api/client.js'
import { krRound, percent, sep } from '../api/format.js'

/* Categories, overview.

   Stats about the categories, not a list of them -- All categories is its own tab now, the
   same split All orders has. The page used to be a list with the ring beside it and a Manage
   tab that was the same list again pointing somewhere else, which is two views of one list and
   no view of the numbers.

   What a category page is for is what the spending looks like by category, and keeping the
   categories themselves right. Neither is browsing orders, so every row that opens an order
   list lives on the other tab or inside a legend, and the maintaining is on the record's own
   page. */

/** How much of the month's total budget has been spent. Categories with no budget set are left
    out of both sides, so an unbudgeted category cannot drag the figure down. */
const budgetUsed = categories => {
	const budgeted = categories.filter(c => c.budget > 0)
	const allowed = budgeted.reduce((sum, c) => sum + c.budget, 0)
	return allowed ? (budgeted.reduce((sum, c) => sum + c.spend, 0) / allowed) * 100 : 0
}

export default function Categories() {
	/* The same request the All categories tab reads, under the same cache key -- switching
	   between the two tabs re-uses one answer instead of fetching /api/categories once per
	   tab name. */
	const state = useApi(getCategories)

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>Where the money actually goes.</h2>
				<p>Categories split every order's total, so the same spend can be read by kind rather than by shop.</p>
				<Button variant="caps" to="/categories/new">ADD CATEGORY</Button>
			</div>

			<Async state={state} label="Loading your categories">{categories => {
				const spent = categories.reduce((sum, c) => sum + c.spend, 0)
				const saved = categories.reduce((sum, c) => sum + c.saved, 0)
				const budgeted = categories.filter(c => c.budget > 0)
				const over = budgeted.filter(c => c.spend > c.budget)
				const top = categories.reduce((most, c) => (c.spend > (most?.spend ?? 0) ? c : most), null)

				const split = foldForRing(
					categories.map(c => ({ id: c.id, name: c.name, colour: c.colour, spend: c.spend })),
					n => `${n} more categories`)

				return (
					<>
						<div className="kpi-row">
							<KpiCard label="Categories" value={String(categories.length)}
								note={top ? `${top.name} is the largest` : null} />
							<KpiCard label="Spent" value={krRound(spent)} note="all time" />
							<KpiCard label="Saved vs retail" value={krRound(saved)}
								note={spent > 0 ? `${Math.round((saved / (spent + saved)) * 100)}% under retail` : null} />
							<KpiCard label="With a budget" value={`${budgeted.length} of ${categories.length}`}
								note={budgeted.length ? `${over.length} over this month` : 'none set yet'} />
						</div>

						{/* The header opens the list only while the list has rows to show: on an account
						    with no categories the band is a plain heading, the same degrade the button
						    below makes. README: Empty states. */}
						<Card aria-label="Breakdown">
							<CardHeader title={`Breakdown${sep}all time`}
								to={categories.length ? '/categories/all' : undefined}
								label="Breakdown, open all categories" />
							<CardDivider />
							{/* The ring and the rows beside it are drawn from one array, which is the rule
							    the donut's shares and its legend already had to obey. Each row opens the
							    orders behind its own slice -- the one place on this page where orders are
							    the useful destination, because the slice is what the reader just clicked. */}
							<CardBody variant="ring-row">
								{split.length ? (
									<>
										{/* Shares off spend rather than the API's own `share`, so the arcs add up
										    to the figure in the middle even once the tail is folded into one. */}
										<Donut segments={split.map(c => ({ share: spent ? (c.spend / spent) * 100 : 0, colour: c.colour }))}
											value={krRound(spent)} label="Spent, all time"
											ariaLabel={`Category split of ${krRound(spent)}`} />
										<div className="chart-legend chart-legend-fill">
											{split.map(c => (
												/* The folded row names a count, not a category, so it opens the list
												   those categories are on rather than a filter for one that has no id. */
												<LegendRow key={c.id ?? 'more'} colour={c.colour} title={c.name}
													amount={krRound(c.spend)}
													to={c.id ? `/orders/all?category=${c.id}` : '/categories/all'} />
											))}
										</div>
									</>
								) : (
									<EmptyState>
										<p>No categories yet. Add one and your spending splits by kind.</p>
									</EmptyState>
								)}
							</CardBody>
						</Card>

						{/* Full width, like the breakdown above it. It shared a `two-column` row with
						    the question-of-the-day card; with that gone, keeping the wrapper would leave
						    one card in a two-column grid and nothing at all beside it.
						    README: Grids and Breakpoints. */}
						<Card aria-label="Budget">
							<CardHeader title="Against budget"
								to={categories.length ? '/categories/all' : undefined}
								label="Against budget, open all categories" />
							<CardDivider />
							<CardBody>
								{budgeted.length ? (
									<>
										<div className="figure-card tabular-figures">
											{percent(budgetUsed(categories), 0)}</div>
										<span className="card-caption">of this month's budget used</span>
										<Meter className="meter-under-caption"
											fill={Math.min(100, budgetUsed(categories))}
											ariaLabel={`${percent(budgetUsed(categories), 0)} of budget used`} />
										<span className="field-help field-help-below">
											{budgeted.length} categor{budgeted.length === 1 ? 'y has' : 'ies have'} a
											budget{over.length ? `, ${over.length} over it` : ''}. Budgets are set on a
											category's own page.
										</span>
									</>
								) : (
									/* Two absences, two answers: with categories the sentence names the next
									   step and the button opens the list where budgets are set; with none, the
									   step it named ("open a category") did not exist and the button opened an
									   empty list -- an action that cannot show anything is not drawn.
									   README: Empty states, Honest Affordances. */
									<EmptyState>
										{categories.length ? (
											<>
												<p>No budgets set. Open a category and give it one to see this fill up.</p>
												<Button variant="block" to="/categories/all">ALL CATEGORIES</Button>
											</>
										) : (
											<p>No categories yet. A budget is set on a category's own page.</p>
										)}
									</EmptyState>
								)}
							</CardBody>
						</Card>
					</>
				)
			}}</Async>
		</Page>
	)
}
