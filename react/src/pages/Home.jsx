import { useId } from 'react'
import { Sep } from '../components/Sep.jsx'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Chart, ChartScale, plotted, todayMarker } from '../components/Chart.jsx'
import { Donut, DonutBox, Meter, WeekdayBars, foldForRing, useListBudget } from '../components/Viz.jsx'
import { CategoryRow, EntryRow, LegendRow } from '../components/Rows.jsx'
import { DashboardCards } from '../components/DashboardCards.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { SavingChip } from '../components/Chip.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	failureMessage, getDashboardCards, getHomeContent, getHomeHero, getSettings, ordersIn, saveSettings
} from '../api/client.js'
import { dayMonth, kr, krRound, percent, sep } from '../api/format.js'

/* Home.

   Two columns: this month, then the cards the user chose, then the rail. The hero is the current
   month and nothing else -- it carried five range chips, which is Statistics' control, on a
   screen whose whole job is "where am I this month". Two places to choose a window is two places
   to be looking at a different one, and only one of them has a pager, a comparison, tiles and a
   returns card to go with it. The header still opens Statistics, which is where a different
   stretch of time is chosen. README: Home, Statistics. */

/* The chart's box, and how far inside it a series is drawn. `plotted` puts a zero at the first
   number and the window's peak at the second, so the 12px is an equal inset top and bottom
   rather than two numbers that happen to look right. */
const HERO_HEIGHT = 130
const HERO_INSET = 12

/* The chart's own sentence. It was fixed at "daily spend through July" once, naming a series the
   tabs above it changed and a span the chips changed -- a label describing a state its controls
   had moved on from. Both are gone and the sentence still names both lines and the month, because
   what it describes should not depend on there being a control to keep it honest. */
const heroLabel = view => `Spent and saved per day, ${view.shortLabel}`

function Hero({ month, categories }) {
	const calloutId = useId()
	// This month, always. Statistics is where another one is chosen.
	const state = useApi(getHomeHero)

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
			/* No bucketing. It existed for the wide windows the chips used to offer -- a year
			   drawn as 365 points under 12 marks -- and a month is at most 31 days against a
			   scale that fits 31 marks, so every point is its own day and the axis names it. */
			const spend = view.series.spend
			const saved = view.series.saved
			const ceiling = Math.max(...spend, ...saved)
			const line = values => plotted(values, ceiling, HERO_HEIGHT - HERO_INSET, HERO_INSET)

			return (
				<Card aria-label={`Spent, ${view.label}`}>
					{/* Everything in this band is the window's, including its name. It read "Spent this
					    month" under every one of the five chips, over a figure that was July's under all
					    five too -- a heading and a total that a control above them could not move.
					    README: Home. */}
					{/* Statistics opens on its own default, which is this same month -- so arriving
					    there is a continuation, and every other stretch of time is chosen once you
					    are on the page that has a pager for it. README: Home. */}
					<CardHeader title={`Spent${sep}${view.label}`} to="/stats"
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
						{/* The callout is a tooltip, drawn on hover or focus by the stylesheet. Both halves of
						    that are the chart's to carry: it takes the tab stop, because a tooltip only a pointer
						    can ask for is one the keyboard never sees, and it keeps the sentence as its own
						    description, because the resting state is visibility:hidden and a hidden node is out
						    of the accessibility tree unless something references it. README: Charts. */}
						<div className="chart-wrap">
							{/* Today, on both lines: they are two facts about the same days, and a
							    mark on one of them would say the other ends somewhere else. The
							    comparison lines elsewhere get none, because their days are not
							    today's. README: Charts. */}
							<Chart height={HERO_HEIGHT} label={heroLabel(view)}
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
								]}
								markers={[
									...todayMarker(view.todayIndex, { series: 0, colour: 'var(--teal)' }),
									...todayMarker(view.todayIndex, { series: 1, colour: 'var(--green)' })
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
						<ChartScale marks={view.axis} span={view.series.spend.length} />
						{/* The categories are written per month, which is as fine as the records cut, so the
						    legend says which month in its own heading rather than borrowing the card's --
						    the same rule the month-wide cards on Statistics follow under a window that
						    moves. README: Statistics. */}
						{/* Drawn only over rows: the heading over an empty list was a label with
						    nothing under it, on a card whose figures already read 0. */}
						{month.heroLegend.length ? <>
						<div className="list-heading">Where it went<Sep />{month.shortLabel}</div>
						<div className="chart-legend">
							{month.heroLegend.map(entry => {
								/* The row names a category, so the link filters by it. "Everything else" is a
								   fold rather than a category, and it opens the unfiltered list -- which is
								   what it stands for. */
								const category = categories.find(c => c.name === entry.name)
								return (
									<LegendRow key={entry.name} colour={entry.colour} title={entry.name}
										amount={krRound(entry.amount)}
										/* The month the heading names, carried into the list. The row was a
										   link to every order in that category since the account was made,
										   under a card headed "Where it went • Aug" -- a list whose total
										   contradicts the figure that was clicked. The fold row has no
										   category to filter by and still has the month. */
										to={ordersIn({ category: category?.id, from: month.from, to: month.to })} />
								)
							})}
						</div>
						</> : null}
					</CardBody>
				</Card>
			)
		}}</Async>
	)
}


/* The dashboard's category card, as its own component because it needs a hook: how many rows it
   can hold depends on how much of the card the donut above them took, and that is measured
   rather than assumed. Both the arcs and the rows are drawn from the folded array, so the ring
   still adds up to the figure printed in its middle however few rows the card has room for.
   README: Home, Charts. */
function BreakdownCard({ period, categories, hasCategories, rows }) {
	const [listRef, budget] = useListBudget(rows)
	const shown = foldForRing(categories, more => `${more} more categories`, budget)
	/* A ring with no segments is a grey circle claiming a split of nothing -- the same absence
	   the vendors card one over already answers with an empty state. Which sentence depends on
	   which absence: a month with nothing bought, or an account with no categories at all.
	   README: Empty states. */
	if (!shown.length) return (
		<>
			<CardHeader title="Category breakdown" />
			<CardDivider />
			<CardBody>
				<EmptyState>
					<p>{hasCategories
						? `Nothing spent in ${period.shortLabel} yet. An order's categories split it here.`
						: 'No categories yet. Add one and your spending splits by kind.'}</p>
				</EmptyState>
			</CardBody>
		</>
	)
	return (
		<>
			<CardHeader title="Category breakdown" />
			<CardDivider />
			<CardBody>
				<DonutBox>
					<Donut segments={shown.map(c => ({ share: c.share, colour: c.colour }))}
						value={krRound(period.spent)} label="Spent this month"
						ariaLabel={`Category split of ${krRound(period.spent)} this month`} />
				</DonutBox>
				{/* Every category the ring draws, named -- the rows were once sliced to three under a
				    ring built from the whole list, so on a real account it drew six colours and named
				    half, and the reader could see that something was a fifth of the month with no way
				    to find out what. Slicing the ring instead would make it disagree with its own
				    middle, so the tail folds into one segment worth the sum of what it holds.

				    "Without category" and the fold row carry no real category id -- the orders list
				    has no filter for either, so the id would ask for a category that matches nothing
				    and read as an empty list. Same fallback the hero legend and Statistics' own
				    version of this row already use. */}
				<div className="category-rows" ref={listRef}>
					{shown.map(c =>
						<CategoryRow key={c.id ?? 'more'} category={c}
							/* Same month, same reason: the ring in this card reads "Spent this month"
							   in its middle. "Without category" and the fold carry the month without a
							   category, since the list has no filter for either. */
							to={ordersIn({ category: c.id && c.id !== 'none' ? c.id : undefined,
								from: period.from, to: period.to })} />)}
				</div>
			</CardBody>
		</>
	)
}


/* Two more list cards, components for the same reason BreakdownCard is one: what a card can hold
   is the entry count less whatever the card drew above the list, and only the list can measure
   that. Here it is a headline figure and its caption rather than a graphic -- which is the point
   of measuring instead of tabulating chart heights: the card does not have to be told what kind
   of thing is above its rows, or that anything is. */
function TopVendorsCard({ vendors, rows }) {
	const [listRef, budget] = useListBudget(rows)
	if (!vendors.length) return (
		<>
			<CardHeader title="Top vendors" to="/vendors" label="Top vendors, open Vendors" />
			<CardDivider />
			<CardBody>
				<EmptyState>
					<p>No vendors yet. Add an order and its vendor lands here.</p>
				</EmptyState>
			</CardBody>
		</>
	)
	return (
		<>
			<CardHeader title="Top vendors" to="/vendors" label="Top vendors, open Vendors" />
			<CardDivider />
			<CardBody>
				<div className="figure-card tabular-figures">{krRound(vendors[0].spend)}</div>
				<span className="card-caption">{vendors[0].name}<Sep />all time</span>
				<div className="entry-list" ref={listRef}>
					{vendors.slice(0, budget).map(v => (
						<EntryRow key={v.id} avatar={v} name={v.name} meta={`${v.orders} orders`}
							amount={krRound(v.spend)} sub={`saved ${krRound(v.saved)}`}
							to={`/orders/all?vendor=${v.id}`} />
					))}
				</div>
			</CardBody>
		</>
	)
}

function FavouriteCategoriesCard({ categories, rows }) {
	const [listRef, budget] = useListBudget(rows)
	return (
		<>
			<CardHeader title="Favourite categories" to="/categories" label="Favourite categories, open Categories" />
			<CardDivider />
			<CardBody>
				{categories.length ? (
					<div className="category-rows" ref={listRef}>
						{categories.slice(0, budget).map(c =>
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
}


/* The Orders card's list, under its chart. Its own component so it can measure: the chart, the
   caption above it and this list's own heading are all height the rows do not get, and none of
   those numbers is written down anywhere. */
function LatestOrders({ orders, rows }) {
	const [listRef, budget] = useListBudget(rows)
	return (
		<div className="entry-list" ref={listRef}>
			<div className="list-heading">Latest orders</div>
			{orders.slice(0, budget).map(order => (
				<EntryRow key={order.id} avatar={order.vendor} name={order.vendor.name}
					meta={dayMonth(order.date)} amount={kr(order.total)}
					sub={`saved ${kr(order.saved)}`} to={`/orders/${order.id}`} />
			))}
		</div>
	)
}

/* The six cards the dashboard can hold. Each is the body only -- the <section class="card">
   around it belongs to DashboardCards, which is what puts the reorder bar inside it. */
function dashboardCard(key, data) {
	const { period, vendors, categories, favouriteCategories, cardRows } = data
	switch (key) {
		case 'rhythm':
			return (
				<>
					<CardHeader title="Spending rhythm" />
					<CardDivider />
					{/* Fills the card rather than sitting 112px tall in it: this shares a grid row
					    with the category breakdown, which is as long as the month has categories.
					    README: Charts. */}
					<CardBody variant="card-body-fill">
						<div className="figure-card tabular-figures">{kr(period.averageOrder)}</div>
						<span className="card-caption">average order<Sep />{period.shortLabel}</span>
						<WeekdayBars days={period.weekdays} />
						<div className="chart-legend-inline">
							<span className="chart-swatch" />
							<span className="nowrap">{period.busiestDay} peak</span>
							<span className="amount tabular-figures nowrap">
								{krRound(period.busiestDaySpend)}</span>
						</div>
					</CardBody>
				</>
			)
		case 'breakdown':
			return <BreakdownCard period={period} categories={categories}
				hasCategories={data.hasCategories} rows={cardRows} />
		case 'vendors':
			return <TopVendorsCard vendors={vendors} rows={cardRows} />
		case 'favcats':
			return <FavouriteCategoriesCard categories={favouriteCategories} rows={cardRows} />
		case 'saved':
			return (
				<>
					<CardHeader title="Saved vs retail" />
					<CardDivider />
					<CardBody>
						<div className="figure-card tabular-figures">{kr(period.saved)}</div>
						<span className="card-caption">saved this month</span>
						<div className="saving-chip-row">
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
							projected for {period.shortLabel}<Sep />{period.daysIn} days in</span>
						<Meter className="meter-under-caption"
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
	const toast = useToast()

	/* LATER is a preference, not a state that lives until the next reload. It writes the same
	   setting the Settings page toggles, so dismissing the card here and turning it back on
	   there are the same switch seen twice, rather than two that disagree. */
	const dismissScanCard = () => {
		saveSettings({ showScanCard: false })
			.then(() => { invalidate(getSettings); invalidate(getHomeContent); content.refresh() })
			.catch(e => toast(failureMessage(e, 'That did not save.'), 'negative'))
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
										<Chart height={110} className="chart-under-caption"
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
											markers={todayMarker(data.period.todayIndex, { colour: '#4F5BD5' })} />
										<ChartScale marks={data.period.axis} span={data.period.series.cumulative.length} />
										{/* The total, in the slot the total goes in -- this list held the
										    saving there and the total in the meta line beneath the vendor,
										    which is the same pair of figures the other two lists of orders
										    draw and the only one drawing them the other way round.
										    README: Data Rows. */}
										<LatestOrders orders={data.latest} rows={data.cardRows} />
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
										<div className="caption-chip-row">
											<div className="chart-caption">
												<div className="chart-caption-label">Total saved</div>
												<span className="chart-caption-value tabular-figures">{kr(data.period.saved)}</span>
											</div>
											<SavingChip>{percent(data.period.savedPercent)}</SavingChip>
										</div>
										<Chart height={90} className="chart-under-caption"
											label={`Savings growth through ${data.period.shortLabel}`}
											gradients={[{ key: 'savings', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
												{ offset: 0, color: '#14AC72', opacity: 0.22 },
												{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
											baselines={[{ y: 87, stroke: '#E4E7E2', dash: '3 4' }]}
											/* 6.5px of inset at both ends, and it is the marker's: a 4.5px circle with
											   a 2px stroke paints 5.5px past the point it sits on, and a running total
											   peaks on its own last day, so today's mark on the peak would have half
											   its circle cut off by the SVG's edge. It was 3 while this chart had no
											   marker on it -- enough for the 2.2px line's own half-stroke and nothing
											   more -- and 17 before that, held for a spline overshoot the monotone
											   curve cannot draw. The area's own close still runs to height regardless
											   of the top. README: Home, Charts. */
											series={[
												{ points: plotted(data.period.series.savingsGrowth,
													Math.max(...data.period.series.savingsGrowth), 83.5, 6.5), kind: 'area', fill: 'gradient:savings' },
												{ points: plotted(data.period.series.savingsGrowth,
													Math.max(...data.period.series.savingsGrowth), 83.5, 6.5), kind: 'curve', stroke: '#14AC72', strokeWidth: 2.2 }
											]}
											markers={todayMarker(data.period.todayIndex, { series: 1, colour: '#14AC72' })} />
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
