import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonKpiRow } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { CategoryRow, LegendRow } from '../components/Rows.jsx'
import { FavouriteTile, FavouriteTileGrid } from '../components/FavouriteTiles.jsx'
import { Donut } from '../components/Chart.jsx'
import { foldForRing } from '../components/Viz.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { useApi } from '../api/useApi.js'
import {
	budgetShare, chartPeriodPhrase, getCategoriesThisMonth, getCategoryChartSplit, getUncategorised,
	ordersIn, overBudget
} from '../api/client.js'
import { currency, percent, sep } from '../api/format.js'
import { inkOn } from '../api/colour.js'

/* Categories, overview.

   Stats about the categories, not a list of them -- All categories is its own tab now, the
   same split All orders has. The page used to be a list with the ring beside it and a Manage
   tab that was the same list again pointing somewhere else, which is two views of one list and
   no view of the numbers.

   What a category page is for is what the spending looks like by category, and keeping the
   categories themselves right. Neither is browsing orders, so every row that opens an order
   list lives on the other tab or inside a legend, and the maintaining is on the record's own
   page. */

export default function Categories() {
	/* The same request the All categories tab reads, under the same cache key -- switching
	   between the two tabs re-uses one answer instead of fetching it once per tab name. The
	   uncategorised remainder is its own small read (it is not a record, so it is not in the
	   list), and the KPI row and the Favourites and Budget cards below wait on both: an
	   all-time total drawn from one and re-drawn when the other lands would show two different
	   figures a beat apart.

	   It is the joined read rather than the plain list because every card here that names a
	   budget makes a month-scoped claim ("over this month", a row against its own budget) and a
	   budget is a monthly allowance, so those compare against `monthSpend`. The all-time
	   figures on this page go on reading `spend`. */
	const state = useApi(getCategoriesThisMonth)
	const uncategorised = useApi(getUncategorised)
	const both = {
		error: state.error ?? uncategorised.error,
		loading: state.loading || uncategorised.loading,
		data: state.data !== undefined && uncategorised.data !== undefined
			? { ...state.data, none: uncategorised.data } : undefined
	}
	/* The ring's own read, separate from `both` above: it is scoped to settings.chartPeriod,
	   which the rest of this page's cards are not, and joining it into the same gate would
	   stall the KPI row and the Favourites and Budget cards on a fetch only the ring needs
	   (see the Breakdown card below, which gives it its own Async rather than waiting on it
	   up here). */
	const chart = useApi(getCategoryChartSplit)

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>See how you spend your money.</h2>
				<p>Categories divide each order's total, so you can see your spending by category instead of by shop.</p>
				<Button variant="caps" to="/categories/new">ADD CATEGORY</Button>
			</div>

			<Async state={both} label="Loading your categories"
				skeleton={<>
					<SkeletonKpiRow />
					<SkeletonCard bodyHeight={260} />
				</>}>{({ categories, none, month, cardRows }) => {
				/* Spent and saved are the account's, not the categorised part of it -- both used
				   to leave the uncategorised remainder out, so the KPI read an all-time total
				   that disagreed with every other all-time total by exactly what no category
				   claimed. */
				const spent = categories.reduce((sum, c) => sum + c.spend, 0) + none.spend
				const saved = categories.reduce((sum, c) => sum + c.saved, 0) + none.saved
				const budgeted = categories.filter(c => c.budget > 0)
				const over = budgeted.filter(overBudget)
				/* Fullest budget first, on the three keys Statistics sorts its own copy by
				   (api/src/lib/stats.js, budgetRowsOver), so the two cards cannot disagree. */
				const ranked = [...budgeted].sort((a, b) =>
					budgetShare(b) - budgetShare(a) || b.monthSpend - a.monthSpend
					|| a.name.localeCompare(b.name))
				/* The records' own superlative -- "Without category" is not a category, so it
				   cannot be the largest one. */
				const top = categories.reduce((most, c) => (c.spend > (most?.spend ?? 0) ? c : most), null)
				/* Favourites are a subset of the same array, favourites included in both:
				   starring pins a category to the spotlight without removing it from the only
				   sortable, searchable view of them -- the rule Vendors set. */
				const favourites = categories.filter(c => c.favourite)

				return (
					<>
						<div className="kpi-row">
							<KpiCard label="Categories" value={String(categories.length)}
								note={top ? `${top.name} is the largest` : null} />
							<KpiCard label="Spent" value={currency(spent, 0)} note="all time" />
							<KpiCard label="Saved vs retail" value={currency(saved, 0)}
								note={spent > 0 ? `${Math.round((saved / (spent + saved)) * 100)}% under retail` : null} />
							<KpiCard label="With a budget" value={`${budgeted.length} of ${categories.length}`}
								note={budgeted.length ? `${over.length} over this month` : 'none set yet'} />
						</div>

						{/* Its own Async, not folded into the page's outer one above: this card is the
						    one thing on the page scoped to settings.chartPeriod, so it is the one thing
						    that waits on that fetch. .async-live is display:contents (app.css), so the
						    boundary costs no extra box between this Card and the grid it sits in. */}
						<Async state={chart} label="Loading your categories' split"
							skeleton={<SkeletonCard bodyHeight={220} />}>{chartData => {
							/* The window's own split already carries "Without category" as a real row
							    (api/src/lib/stats.js's splitOver) -- id null, in the same list, ranked by
							    spend like every other row -- so nothing here rebuilds a remainder. Renamed
							    onto foldForRing's own field (`amount` -> `spend`), the one shape it reads. */
							const split = foldForRing(
								chartData.split.map(c => ({ id: c.id, name: c.name, colour: c.colour, spend: c.amount })),
								chartData.cardRows)
							const periodWord = chartPeriodPhrase(chartData.period)
							return (
								/* The header opens the list only while the list has rows to show: on an
								    account with no categories the band is a plain heading, the same degrade
								    the button below makes. README: Empty states. */
								<Card aria-label="Breakdown">
									<CardHeader title={`Breakdown${sep}${periodWord}`}
										to={categories.length ? '/categories/all' : undefined}
										label="Breakdown, open all categories" />
									<CardDivider />
									{/* The ring and the rows beside it are drawn from one array, which is the
									    rule the donut's shares and its legend already had to obey. Each row
									    opens the orders behind its own slice -- the one place on this page
									    where orders are the useful destination, because the slice is what the
									    reader just clicked. */}
									<CardBody variant="ring-row">
										{split.length ? (
											<>
												{/* Shares off spend rather than the API's own `share`, so the arcs
												    add up to the figure in the middle even once the tail is folded
												    into one. */}
												<Donut segments={split.map(c => ({ share: chartData.spent ? (c.spend / chartData.spent) * 100 : 0, colour: c.colour }))}
													value={currency(chartData.spent, 0)} label={`Spent, ${periodWord}`}
													ariaLabel={`Category split of ${currency(chartData.spent, 0)}`} />
												<div className="chart-legend chart-legend-fill">
													{split.map(c => (
														/* The folded row stands for several categories at once, so it
														   opens the list those categories are on rather than a filter
														   for one that has no id. */
														<LegendRow key={c.id ?? 'more'} colour={c.colour} title={c.name}
															amount={currency(c.spend, 0)}
															to={c.id ? `/orders/all?category=${c.id}` : '/categories/all'} />
													))}
												</div>
											</>
										) : (
											/* Two absences, two answers, the rule every empty state on this page
											    already makes: with categories on record the sentence names the
											    window that came up empty; with none at all, naming a window
											    answers a question nobody asked -- the real absence is that no
											    category exists yet. */
											<EmptyState>
												<p>{categories.length
													? `Nothing spent ${periodWord}.`
													: 'No categories yet. Add one and your spending splits by kind.'}</p>
											</EmptyState>
										)}
									</CardBody>
								</Card>
							)
						}}</Async>

						{/* The spotlight Vendors has, on this page's own records. README: Favourites. */}
						<Card aria-label="Favourites">
							<CardHeader title="Favourites"
								to={categories.length ? '/categories/all' : undefined}
								label="Favourites, open all categories" />
							<CardDivider />
							<CardBody>
								{favourites.length ? (
									<FavouriteTileGrid>
										{favourites.map(category => (
											<FavouriteTile key={category.id}
												mark={<span className="category-icon"
													style={{ background: category.colour, color: inkOn(category.colour) }}>
													<Icon name={category.icon} path={category.iconPath} /></span>}
												name={category.name} to={`/orders/all?category=${category.id}`}
												linkLabel={`${category.name}, open its orders`}
												meta={`${percent(category.share)} of expenses`}
												amount={currency(category.spend, 0)} saved={`saved ${currency(category.saved, 0)}`} />
										))}
									</FavouriteTileGrid>
								) : (
									/* Two absences, two answers, the same split every empty state on this
									   page makes: with categories the sentence names the next step and the
									   button opens the list a favourite is turned on from; with none there
									   is nothing to favourite and neither claim is made. README: Empty states. */
									<EmptyState>
										{categories.length ? (
											<>
												<p>No favourites yet. Turn on Favourite when editing a category and it appears here with spend, savings and budget.</p>
												<Button variant="block" to="/categories/all">ALL CATEGORIES</Button>
											</>
										) : (
											<p>No categories to favourite yet. Add one and your spending splits by category.</p>
										)}
									</EmptyState>
								)}
							</CardBody>
						</Card>

						{/* Full width, like the breakdown above it. It shared a `two-column` row with
						    the question-of-the-day card; with that gone, keeping the wrapper would leave
						    one card in a two-column grid and nothing at all beside it.
						    README: Grids and Breakpoints. */}
						<Card aria-label="Budget">
							{/* The month in the header, not in every row: one qualifier for rows that
							    all share it, so it cannot drift between them. README: Data Rows. */}
							<CardHeader title={`Against budget${sep}${month.label}`}
								to={categories.length ? '/categories/all' : undefined}
								label="Against budget, open all categories" />
							<CardDivider />
							<CardBody>
								{budgeted.length ? (
									<>
										{/* One row per budget, fullest first: a budget is a ceiling on the
										    category it is set on, so nothing here sums them. README: Categories. */}
										<div className="category-rows">
											{ranked.slice(0, cardRows).map(c => (
												/* The month's spend, the month's orders behind the row: the figure
												   clicked and the list it opens are one stretch of time. */
												<CategoryRow key={c.id} category={{ ...c, spend: c.monthSpend }}
													meta={`${percent(budgetShare(c), 0)} of a ${currency(c.budget, 0)} budget`}
													to={ordersIn({ category: c.id, from: month.from, to: month.to })} />
											))}
										</div>
										<span className="field-help field-help-below">
											{budgeted.length > cardRows
												? `${budgeted.length - cardRows} more with a budget${sep}`
												: ''}Budgets are set on a category's own page.
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
												<p>No budgets set yet. Add a budget to a category to see progress here.</p>
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
