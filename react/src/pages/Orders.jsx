import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Chart, ChartScale, plotted, todayMarker } from '../components/Chart.jsx'
import { Donut, DonutBox } from '../components/Viz.jsx'
import { CategoryRow, EntryRow } from '../components/Rows.jsx'
import { ReturnsCard } from '../components/Returns.jsx'
import { Button } from '../components/Button.jsx'
import { Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getOrdersOverview, ordersIn } from '../api/client.js'
import { dayMonth, kr, krRound, percent } from '../api/format.js'
import { useState } from 'react'

/** How much of the month's total budget has been spent. Categories with no budget set are
    left out of both sides, so an unbudgeted category cannot drag the figure down. */
const budgetUsed = categories => {
	const budgeted = categories.filter(c => c.budget > 0)
	const allowed = budgeted.reduce((sum, c) => sum + c.budget, 0)
	return allowed ? (budgeted.reduce((sum, c) => sum + c.spend, 0) / allowed) * 100 : 0
}

/* Orders, overview.

   The comparison period is fixed to the one before, so the key names both plotted lines
   instead of offering a choice the app does not have -- a legend that looks like a control
   and is not is the same defect as a control that looks live and does nothing. README: Honest Affordances. */

export default function Orders() {
	const state = useApi(getOrdersOverview)
	const [breakdown, setBreakdown] = useState('Expenses')

	return (
		<Page>
			<Async state={state} label="Loading your orders">{data => {
				/* One scale for both lines, shared rather than each drawn to its own peak --
				   the smaller one would otherwise read as though it reached as high as the
				   larger. README: Buttons. */
				const chartMax = Math.max(...data.period.series.monthCurrent, ...data.period.series.monthPrevious)
				return (
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label={`Spent · ${data.period.label}`}>
							<CardHeader title={`Spent · ${data.period.label}`} to="/stats"
								label={`Spent · ${data.period.label}, open Statistics`} />
							<CardDivider />
							{/* No padding-top override here either -- the 2px this card carried put the
							    first line 4.5px under the hairline, the tightest in the file. README: Cards. */}
							<CardBody>
								<div className="figure-large tabular-figures">{kr(data.period.spent)}</div>
								<div className="chart-series-key">
									<div className="chart-series-key-row">
										<div className="chart-series-key-swatch" style={{ background: 'var(--blue)' }} />
										{data.period.shortLabel}
									</div>
									<div className="chart-series-key-row">
										<div className="chart-series-key-swatch" style={{ background: 'var(--blue-light)' }} />
										{data.period.previousLabel}
									</div>
								</div>
								<Chart height={250} style={{ marginTop: 8 }}
									label={`${data.period.shortLabel} against ${data.period.previousLabel}, day by day`}
									baselines={[{ y: 128, stroke: '#D9DDD8', dash: '5 5' }]}
									/* 6.5px of vertical inset (plotted()'s 3rd/4th args, not a chart-level pad)
									   is the marker's room, and it is the same 6.5 on every chart that draws
									   one: a 4.5px circle with a 2px stroke paints 5.5px past its point, and
									   a running total peaks on its own last day. It was 17 for a halo of
									   r=13 that no longer exists, and 17 before that for a spline overshoot
									   the monotone curve cannot draw -- so the line has 10.5px more height
									   to use. Horizontally it runs edge to edge; the marker keeps its own
									   circle off the side edges rather than the line being inset for it.
									   README: Charts. */
									series={[
										{ points: plotted(data.period.series.monthPrevious, chartMax, 243.5, 6.5), kind: 'curve', stroke: '#B9BFF0', strokeWidth: 2 },
										{ points: plotted(data.period.series.monthCurrent, chartMax, 243.5, 6.5), kind: 'curve', stroke: '#4F5BD5', strokeWidth: 2.6 }
									]}
									/* Today, on the current month's line only -- the paler line behind it is
									   last month, whose days are not today's. It was a halo and an oversized
									   dot here and a plain dot on Home, which is one fact drawn two ways on
									   two pages; the mark is the same everywhere now. README: Charts. */
									markers={todayMarker(data.period.todayIndex, { series: 1, colour: '#4F5BD5' })} />
								<ChartScale marks={data.period.axis} span={data.period.series.monthCurrent.length} />
							</CardBody>
						</Card>

						<div className="two-column">
							<Card aria-label="Latest orders">
								<CardHeader title="Latest orders" />
								<CardDivider />
								{/* What the order cost, the way the returns card beside it writes what a
								    return was worth. It used to be the saving -- "+26,04 kr." in green,
								    in the slot every other list of orders puts the total in, on a card
								    headed *Latest orders* under a card headed *Spent*. A reader has no
								    way to tell a total from a saving by looking, so the green plus over
								    an order from Elgiganten read as an order for 26 kroner. The saving
								    is on the order's own page, where it is named. README: Data Rows. */}
								<CardBody variant="entry-list card-body-tight">
									{data.latest.map(order => (
										<EntryRow key={order.id} avatar={order.vendor} name={order.vendor.name}
											meta={dayMonth(order.date)} amount={kr(order.total)}
											sub={`saved ${kr(order.saved)}`} to={`/orders/${order.id}`} />
									))}
									<Button variant="block" to="/orders/all">SEE ALL</Button>
								</CardBody>
							</Card>

							{/* The same card Statistics draws, from the same data, at this page's own
							    width -- it used to be markup with nothing behind it, four rows of
							    returns on Statistics and a permanent "No open returns found" here.
							    README: Empty states.

							    It sits beside the latest orders because that is what it is: the
							    month's other list of orders, the same rows in the same shape, read
							    across rather than down a rail. What was here was a *Latest receipts*
							    card that had no receipts to draw and never would -- an empty state
							    with nothing behind it, wired to nothing, offering SEE ALL into the
							    orders list it was not a list of. Scanning is reached from the top bar
							    on every page, from Home, from an order and from the create form, so
							    nothing was the only way in. README: Empty states. */}
							<ReturnsCard title={`Returns · ${data.period.label}`}
								span={data.period.shortLabel} returns={data.period.returns} />
						</div>

					</div>

					<div className="order-list-column">

						<Card aria-label="Category breakdown">
							<CardHeader title="Category breakdown" />
							<CardDivider />
							<CardBody>
								<div style={{ marginBottom: 14 }}>
									<Segmented options={['Expenses', 'Budget']} value={breakdown}
										onChange={setBreakdown} label="Category breakdown basis" />
								</div>
								{/* Two views, and the toggle really switches them. Expenses is each category's
								    share of the month; Budget is the same categories against what they were
								    allowed, which is a different question and gets a different ring. The
								    prototype draws this control and changes nothing with it -- the
								    decorative-control rule wearing the shape of a tab. README: Honest Affordances. */}
								{breakdown === 'Expenses' ? (
									<>
										<DonutBox>
											<Donut segments={data.categories.map(c => ({ share: c.share, colour: c.colour }))}
												value={krRound(data.period.spent)} label="Spent this month"
												ariaLabel={`Category split of ${krRound(data.period.spent)} this month`} />
										</DonutBox>
										{/* "Without category" carries no real id -- the orders list has no filter
										    for it yet, so linking it the same way as a real category would ask
										    for one that matches nothing. README: Home. */}
										<div className="category-rows">
											{data.categories.map(c =>
												<CategoryRow key={c.id} category={c}
													/* The month this ring is of. Its centre reads "Spent this month",
												   so a row opening every order in that category ever is a list
												   that disagrees with the figure clicked to reach it. */
												to={ordersIn({ category: c.id === 'none' ? undefined : c.id,
													from: data.period.from, to: data.period.to })} />)}
										</div>
									</>
								) : (
									<>
										<DonutBox>
											<Donut segments={[
												{ share: Math.min(100, budgetUsed(data.categories)), colour: 'var(--green)' },
												{ share: Math.max(0, 100 - budgetUsed(data.categories)), colour: '#E7EAE5' }
											]}
												value={percent(budgetUsed(data.categories), 0)} label="of budget used"
												ariaLabel={`${percent(budgetUsed(data.categories), 0)} of this month's budget used`} />
										</DonutBox>
										{/* The same rows as the Expenses view, saying a different thing in the
										    meta line. A progress bar under each one would be a layout this app
										    does not use anywhere else. README: Cards. */}
										<div className="category-rows">
											{data.categories.map(c => (
												<CategoryRow key={c.id} category={c}
													to={ordersIn({ category: c.id === 'none' ? undefined : c.id,
													from: data.period.from, to: data.period.to })}
													meta={c.budget
														? `${krRound(c.spend)} of ${krRound(c.budget)} budget`
														: 'No budget set'} />
											))}
										</div>
									</>
								)}
								{/* Categories, so the destination is the categories page. It read SEE ALL
								    under a list of categories and opened the orders list -- the same
								    mismatch the Categories page's own VIEW ALL had. */}
								<Button variant="block" to="/categories">ALL CATEGORIES</Button>
							</CardBody>
						</Card>

					</div>
				</div>
				)
			}}</Async>
		</Page>
	)
}
