import { useId, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Chart, ChartScale, RangeTabs, bucketed, bucketsFor, plotted } from '../components/Chart.jsx'
import { Donut, DonutBox, Meter, WeekdayBars } from '../components/Viz.jsx'
import { CategoryRow, EntryRow, LegendRow } from '../components/Rows.jsx'
import { DashboardCards } from '../components/DashboardCards.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { SavingChip } from '../components/Chip.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import { getDashboardCards, getHomeContent, getHomeHero, getSettings, ranges, saveSettings } from '../api/client.js'
import { dayMonth, kr, krRound, percent } from '../api/format.js'

/* Home.

   Two columns: the window being viewed, then the cards the user chose, then the rail. The hero
   is the one card whose chart is driven by two controls at once -- the Orders/Saved tabs choose
   which series, the range chips choose how wide a window it is drawn over -- so the chips fetch
   the window and the tab picks a series out of it. Letting each write the chart directly is how
   one of them silently stops working: whichever was clicked last wins. README: Buttons. */

/* The chart's box, and how far inside it a series is drawn. `plotted` puts a zero at the first
   number and the window's peak at the second, so the 12px is an equal inset top and bottom
   rather than two numbers that happen to look right. */
const HERO_HEIGHT = 130
const HERO_INSET = 12

/* The header opens Statistics on the window the card is showing, under the name the chip
   carries. Month is Statistics' own default and writes no parameter, which is what its pager
   does with the same width. README: Statistics. */
const statsHref = range => (range === 'month' ? '/stats' : `/stats?range=${range}`)

/* The chart's own sentence follows the chips above it. Fixed at "daily spend through July" it
   named a series the tabs used to change and a span the chips still change, so a screen reader
   heard "spend" over a line of order counts, and "through July" over seven days of it -- the
   same defect the pager had on Statistics, one level down: a label describing a state the
   controls have moved on from. It names both lines now, because both are drawn. The window
   says which days it covers; how coarsely they are drawn is the chart's own business, so it is
   the part the sentence adds. */
const heroLabel = (view, points) => (points === view.series.spend.length
	? `Spent and saved per day, ${view.shortLabel}`
	: `Spent and saved across ${view.shortLabel}, bucketed into ${points} points`)

function Hero({ month, categories }) {
	const [range, setRange] = useState('month')
	const calloutId = useId()
	/* The chips choose a window, not a slice of a fixed one, so pressing one is a read. The last
	   good window stays on screen while the next is in flight -- see Async -- rather than the
	   card collapsing under the pointer. */
	const state = useApi(getHomeHero, [range])

	return (
		<Async state={state} label="Loading your spending">{view => {
			/* Both series, drawn together rather than one at a time behind a pair of tabs.
			   Spending and what it saved are the same story told twice, and a control that
			   showed one or the other made the reader hold the first in their head to compare
			   it with the second.

			   One scale for the two of them, and it is the pair's own maximum: a bucket average
			   sits below the peak of the days inside it, so scaling by the raw daily maximum
			   draws every wide window squashed into the bottom of the box -- and scaling each
			   line to its own peak would draw the smaller one as tall as the larger, which is
			   the defect the Orders overview chart already carries a note about. */
			const buckets = bucketsFor(view.range, view.axis, view.series.spend.length)
			const spend = bucketed(view.series.spend, buckets)
			const saved = bucketed(view.series.saved, buckets)
			const ceiling = Math.max(...spend, ...saved)
			const line = values => plotted(values, ceiling, HERO_HEIGHT - HERO_INSET, HERO_INSET)

			return (
				<Card aria-label={`Spent, ${view.label}`}>
					{/* Everything in this band is the window's, including its name. It read "Spent this
					    month" under every one of the five chips, over a figure that was July's under all
					    five too -- a heading and a total that a control above them could not move.
					    README: Home. */}
					<CardHeader title={`Spent · ${view.label}`} to={statsHref(view.range)}
						label={`Spent, ${view.label}, open Statistics`} />
					<CardDivider />
					{/* No padding-top override. 2px here put the big number 10px under the hairline
					    against an 18-24px band everywhere else, and a number that close to the rule
					    reads as a drawing error. README: Cards. */}
					<CardBody>
						<div>
							<div className="figure-headline tabular-figures">{kr(view.spent)}</div>
							<div className="figure-delta tabular-figures">
								saved {kr(view.saved)} vs retail ({percent(view.savedPercent)})
							</div>
						</div>
						{/* Selected is the width that is drawn, not the one last clicked -- the same rule
						    the chips on Statistics follow. For the moment a read is in flight the figures
						    above are still the old window's, and a chip lit for the new one would be the
						    mismatch this card was fixed for, held for 200ms. */}
						<RangeTabs options={ranges} value={view.range} onChange={setRange} />
						{/* The callout is a tooltip, drawn on hover or focus by the stylesheet. Both halves of
						    that are the chart's to carry: it takes the tab stop, because a tooltip only a pointer
						    can ask for is one the keyboard never sees, and it keeps the sentence as its own
						    description, because the resting state is visibility:hidden and a hidden node is out
						    of the accessibility tree unless something references it. README: Charts. */}
						<div className="chart-wrap">
							<Chart height={HERO_HEIGHT} label={heroLabel(view, spend.length)}
								tabIndex={0} aria-describedby={calloutId}
								/* The one chart here that was drawn 'line' -- straight segments with a corner at
								   every point, beside three curves on the same page. The curve was the riskier
								   kind to hand a spiky series while the spline could overshoot: this one is a
								   bucketed daily average, not a running total, so it turns hard in both
								   directions and had the most to invent. Monotone now, so a segment stays
								   between the two days it joins and there is nothing left to trade.

								   Saved is drawn second, so the thinner line sits over the thicker one where
								   they cross rather than under it. The two colours are the split bar's own,
								   which is what lets one key below name both. */
								series={[
									{ points: line(spend), kind: 'curve', stroke: 'var(--teal)', strokeWidth: 2 },
									{ points: line(saved), kind: 'curve', stroke: 'var(--green)', strokeWidth: 1.6 }
								]} />
							{/* Read off the window's own days. The authored sentence named July's 23rd and a
							    vendor, and stayed there while the chips moved the chart under it. */}
							<div className="chart-callout" id={calloutId} role="tooltip">
								Biggest day was {dayMonth(view.peak.date)}: {kr(view.peak.spend)}
							</div>
						</div>
						{/* The window's own marks, not a fixed row of days: the chips move this chart
						    across five widths, so a hardcoded set of dates would be one month's printed
						    under a year. Every other chart in the app carries an axis and this
						    one carried none, so its peaks sat at no date a reader could name.
						    README: Charts. */}
						<ChartScale marks={view.axis} span={view.series.spend.length} buckets={buckets} />
						{/* The categories are written per month, which is as fine as the records cut, so the
						    legend says which month in its own heading rather than borrowing the card's --
						    the same rule the month-wide cards on Statistics follow under a window that
						    moves. README: Statistics. */}
						<div className="list-heading">Where it went · {month.shortLabel}</div>
						<div className="chart-legend">
							{month.heroLegend.map(entry => {
								/* The row names a category, so the link filters by it. "Everything else" is a
								   fold rather than a category, and it opens the unfiltered list -- which is
								   what it stands for. */
								const category = categories.find(c => c.name === entry.name)
								return (
									<LegendRow key={entry.name} colour={entry.colour} title={entry.name}
										amount={krRound(entry.amount)}
										to={category ? `/orders/all?category=${category.id}` : '/orders/all'} />
								)
							})}
						</div>
					</CardBody>
				</Card>
			)
		}}</Async>
	)
}

/* The six cards the dashboard can hold. Each is the body only -- the <section class="card">
   around it belongs to DashboardCards, which is what puts the reorder bar inside it. */
function dashboardCard(key, data) {
	const { period, vendors, categories, favouriteCategories } = data
	switch (key) {
		case 'rhythm':
			return (
				<>
					<CardHeader title="Spending rhythm" />
					<CardDivider />
					<CardBody>
						<div className="figure-card tabular-figures">{kr(period.averageOrder)}</div>
						<span className="card-caption">average order · {period.shortLabel}</span>
						<WeekdayBars days={period.weekdays} field="home" />
						<div className="chart-legend-inline">
							<span className="chart-swatch" />
							<span style={{ whiteSpace: 'nowrap' }}>{period.busiestDay} peak</span>
							<span className="amount tabular-figures" style={{ whiteSpace: 'nowrap' }}>
								{krRound(period.busiestDaySpend)}</span>
						</div>
					</CardBody>
				</>
			)
		case 'breakdown':
			return (
				<>
					<CardHeader title="Category breakdown" />
					<CardDivider />
					<CardBody>
						<DonutBox>
							<Donut segments={categories.map(c => ({ share: c.share, colour: c.colour }))}
								value={krRound(period.spent)} label="Spent this month"
								ariaLabel={`Category split of ${krRound(period.spent)} this month`} />
						</DonutBox>
						<div className="category-rows">
							{/* Every category the ring draws, not the top three of them. The ring is
								built from the whole list and the rows were sliced to 3, so on a real
								account it drew six colours and named half -- the reader could see that
								something was a fifth of the month and had no way to find out what. The
								ring's centre is the month's whole spend, so slicing the ring instead
								would make it disagree with its own middle. README: Charts.

								"Without category" carries no real category id -- the orders list has no
								filter for it yet, so the id it does carry would ask for a category
								that matches nothing and read as an empty list. Same fallback the hero
								legend and Statistics' own version of this row already use. */}
							{categories.map(c =>
								<CategoryRow key={c.id} category={c}
									to={c.id === 'none' ? '/orders/all' : `/orders/all?category=${c.id}`} />)}
						</div>
					</CardBody>
				</>
			)
		case 'vendors':
			return (
				<>
					<CardHeader title="Top vendors" to="/vendors" label="Top vendors, open Vendors" />
					<CardDivider />
					<CardBody>
						{vendors.length ? (
							<>
								<div className="figure-card tabular-figures">{krRound(vendors[0].spend)}</div>
								<span className="card-caption">{vendors[0].name} · all time</span>
								<div className="entry-list">
									{vendors.map(v => (
										<EntryRow key={v.id} avatar={v} name={v.name} meta={`${v.orders} orders`}
											amount={krRound(v.spend)} sub={`saved ${krRound(v.saved)}`}
											to={`/orders/all?vendor=${v.id}`} />
									))}
								</div>
							</>
						) : (
							<EmptyState>
								<p>No vendors yet. Add an order and its vendor lands here.</p>
							</EmptyState>
						)}
					</CardBody>
				</>
			)
		case 'favcats':
			return (
				<>
					<CardHeader title="Favourite categories" to="/categories" label="Favourite categories, open Categories" />
					<CardDivider />
					<CardBody>
						{favouriteCategories.length ? (
							<div className="category-rows">
								{favouriteCategories.map(c =>
									<CategoryRow key={c.id} category={c} meta={`saved ${krRound(c.saved)}`}
										to={`/orders/all?category=${c.id}`} />)}
							</div>
						) : (
							<EmptyState>
								<p>No favourites yet. Star a category on its edit page and it lands here.</p>
							</EmptyState>
						)}
					</CardBody>
				</>
			)
		case 'saved':
			return (
				<>
					<CardHeader title="Saved vs retail" />
					<CardDivider />
					<CardBody>
						<div className="figure-card tabular-figures">{kr(period.saved)}</div>
						<span className="card-caption">saved this month</span>
						<div style={{ marginTop: 14 }}>
							<SavingChip>{percent(period.savedPercent)} under retail</SavingChip>
						</div>
						<div className="chart-legend-inline">
							<span className="chart-swatch" /><span>Retail value</span>
							<span className="amount tabular-figures">{krRound(period.retail)}</span>
						</div>
					</CardBody>
				</>
			)
		case 'pace':
			return (
				<>
					<CardHeader title="Monthly pace" />
					<CardDivider />
					<CardBody>
						<div className="figure-card tabular-figures">{krRound(period.projected)}</div>
						<span className="card-caption">
							projected for {period.shortLabel} · {period.daysIn} days in</span>
						<Meter style={{ marginTop: 16 }}
							/* projected is 0 exactly when spent is -- nothing bought yet this month --
							   and 0/0 is NaN, an invalid CSS width the browser drops silently rather
							   than rejecting: no fill at all instead of an honest 0%. Same reasoning
							   as Statistics' own Pace meter. The marker gets the same guard, plus the
							   Math.min(100, ...) clamp Statistics' version already has -- a previous
							   month that outspent this one's whole projection put the marker past the
							   track's right edge with nothing to stop it. */
							fill={period.projected ? Math.round(period.spent / period.projected * 100) : 0}
							marker={period.projected ? Math.min(100, Math.round(period.previousTotal / period.projected * 100)) : 0}
							ariaLabel={`Spent ${krRound(period.spent)} of a projected ${krRound(period.projected)}; the marker is where ${period.previousLabel} ended`} />
						<div className="chart-legend-inline">
							<span className="chart-swatch" /><span>{period.previousLabel} ended at</span>
							<span className="amount tabular-figures">{krRound(period.previousTotal)}</span>
						</div>
					</CardBody>
				</>
			)
		default:
			return null
	}
}

export default function Home() {
	const content = useApi(getHomeContent)
	const cards = useApi(getDashboardCards)

	/* LATER is a preference, not a state that lives until the next reload. It writes the same
	   setting the Settings page toggles, so dismissing the card here and turning it back on
	   there are the same switch seen twice, rather than two that disagree. */
	const dismissScanCard = () => {
		saveSettings({ showScanCard: false })
			.then(() => { invalidate(getSettings); invalidate(getHomeContent); content.refresh() })
		document.getElementById('page-title')?.focus()
	}

	return (
		<Page variant="content-grid">
			<Async state={content} label="Loading your month">{data => (
				<>
					<div className="content-column-main">
						<Hero month={data.period} categories={data.categories} />

						<Async state={cards} label="Loading your cards">{({ all, on }) => (
							<DashboardCards all={all} initial={on} render={key => dashboardCard(key, data)} />
						)}</Async>
					</div>

					<div className="content-column-side">
						{data.showScanCard ? (
							<AiCard
								header={{
									to: '/scan', title: 'Get receipts read for you',
									meta: 'Finish setting up Spendly', destination: 'Scan receipt',
									progress: data.onboarding
								}}
								headline="Scan receipts, skip typing"
								body="A PDF, photo or screenshot becomes a draft order. You review every value before it is saved.">
								<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
								{/* The card held the focus, so dismissing it hands focus to the heading. */}
								<ButtonLink className="button-link-invert" onClick={dismissScanCard}>LATER</ButtonLink>
								<AiCardMark />
							</AiCard>
						) : null}

						<Card aria-label="Orders">
							<CardHeader title="Orders" to="/orders" label="Orders, open Orders" />
							<CardDivider />
							<CardBody>
								{/* A chart is a claim about data points; a flat line at zero with a lone
								    marker on it makes that claim about an account with no orders at all.
								    The same absence dashboard-card('vendors') already guards against,
								    one card over. */}
								{data.latest.length ? (
									<>
										<div className="chart-caption">
											<div className="chart-caption-label">Spent this month</div>
											<span className="chart-caption-value tabular-figures">{kr(data.period.spent)}</span>
										</div>
										<Chart height={110} style={{ marginTop: 6 }}
											label={`Cumulative spend through ${data.period.shortLabel}`}
											gradients={[{ key: 'spend', x1: 0, y1: 0, x2: 1, y2: 0, stops: [
												{ offset: 0, color: '#4F5BD5' }, { offset: 1, color: '#A5B4FC' }] }]}
											baselines={[{ y: 92, stroke: '#E4E7E2', dash: '3 4' }]}
											/* 7px of headroom (plotted()'s 4th arg) is the marker's, not the curve's:
											   the marker rides the line, a cumulative series peaks on its last day, and
											   a 4.5px circle with a 2px stroke paints 5.5px past the point it sits on.
											   It used to be 17 to absorb the old spline's overshoot on the flat-jump-flat
											   turn a one-order month draws; the curve is monotone now and peaks exactly
											   at its own maximum, so that 10px was headroom held for a shape that can no
											   longer be drawn. README: Charts. */
											series={[{ points: plotted(data.period.series.cumulative,
												Math.max(...data.period.series.cumulative), 93, 7), kind: 'curve',
												stroke: 'gradient:spend', strokeWidth: 2.4 }]}
											/* Where the running total actually is today, on a series that runs
											   one point past it for every day the month has left -- a marker
											   fixed at index 1 sat on the flat lead-in for any account whose
											   first order landed later than the 2nd, a claim about a day the
											   curve has nothing to say about. daysIn is the same count Statistics'
											   own pace reads its "N days of records" from. */
											markers={[{ index: data.period.daysIn - 1, series: 0, r: 4.5, fill: '#fff', stroke: '#4F5BD5', strokeWidth: 2 }]} />
										<ChartScale marks={data.period.axis} span={data.period.series.cumulative.length} />
										<div className="entry-list">
											<div className="list-heading">Latest orders</div>
											{data.latest.map(order => (
												<EntryRow key={order.id} avatar={order.vendor} name={order.vendor.name}
													meta={`${dayMonth(order.date)} · ${kr(order.total)}`}
													amount={'+' + kr(order.saved)} to={`/orders/${order.id}`} />
											))}
										</div>
									</>
								) : (
									<EmptyState>
										<p>No orders yet. Add one and your spending shows up here.</p>
										<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
									</EmptyState>
								)}
							</CardBody>
						</Card>

						<Card aria-label="Saved vs retail">
							<CardHeader title="Saved vs retail" to="/stats" label="Saved vs retail, open Statistics" />
							<CardDivider />
							<CardBody>
								{data.latest.length ? (
									<>
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
											<div className="chart-caption">
												<div className="chart-caption-label">Total saved</div>
												<span className="chart-caption-value tabular-figures">{kr(data.period.saved)}</span>
											</div>
											<SavingChip>{percent(data.period.savedPercent)}</SavingChip>
										</div>
										<Chart height={90} style={{ marginTop: 8 }}
											label={`Savings growth through ${data.period.shortLabel}`}
											gradients={[{ key: 'savings', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
												{ offset: 0, color: '#14AC72', opacity: 0.22 },
												{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
											baselines={[{ y: 87, stroke: '#E4E7E2', dash: '3 4' }]}
											/* 3px of daylight at both ends, and it is the stroke's: a 2.2px line paints
											   1.1px either side of where it sits, and the zero line used to sit flush
											   with the box's own bottom edge (top === height), so the flat lead-in most
											   accounts draw before their first order had half its stroke clipped away
											   by the SVG boundary. The top was 17 to absorb the old spline's overshoot
											   instead -- there are no markers on this chart, so with a monotone curve
											   the peak is the peak and the other 14px were held for nothing. The area's
											   own close still runs to height regardless of top. README: Home. */
											series={[
												{ points: plotted(data.period.series.savingsGrowth,
													Math.max(...data.period.series.savingsGrowth), 87, 3), kind: 'area', fill: 'gradient:savings' },
												{ points: plotted(data.period.series.savingsGrowth,
													Math.max(...data.period.series.savingsGrowth), 87, 3), kind: 'curve', stroke: '#14AC72', strokeWidth: 2.2 }
											]} />
										<ChartScale marks={data.period.axis} span={data.period.series.savingsGrowth.length} />
									</>
								) : (
									<EmptyState>
										<p>Nothing saved yet. Buying below retail is what fills this in.</p>
									</EmptyState>
								)}
							</CardBody>
						</Card>
					</div>
				</>
			)}</Async>
		</Page>
	)
}
