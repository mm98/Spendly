import { useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { Chart, ChartAxis, RangeTabs, ranged } from '../components/Chart.jsx'
import { Donut, DonutBox, Meter, SplitBar, WeekdayBars } from '../components/Viz.jsx'
import { CategoryRow, EntryRow, LegendRow } from '../components/Rows.jsx'
import { DashboardCards } from '../components/DashboardCards.jsx'
import { AiCard, AiCardMark } from '../components/AiCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { SavingChip } from '../components/Chip.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import { getDashboardCards, getHomeContent, getSettings, saveSettings } from '../api/client.js'
import { dayMonth, kr, krRound, percent } from '../api/format.js'

/* Home.

   Two columns: the month, then the cards the user chose, then the rail. The hero is the one
   card whose chart is driven by two controls at once -- the Orders/Saved tabs choose which
   series, the range chips choose how much of it -- so the tab hands over the full series and
   lets the range re-apply. Letting each write the chart directly is how one of them silently
   stops working: whichever was clicked last wins. README: Buttons. */

const HERO_SERIES = [
	{ key: 'orders', label: 'Orders' },
	{ key: 'saved', label: 'Saved' }
]

function Hero({ period, categories }) {
	const [range, setRange] = useState('1M')
	const [series, setSeries] = useState('orders')
	const refs = useMemo(() => [], [])

	const points = useMemo(() => ranged(period.series[series], range), [period.series, series, range])
	const heroValue = key => key === 'orders' ? String(period.orderCount) : kr(period.saved)

	return (
		<Card aria-label="Spent this month">
			<CardHeader title="Spent this month" to="/stats" label="Spent this month, open Statistics" />
			<CardDivider />
			{/* No padding-top override. 2px here put the big number 10px under the hairline
			    against an 18-24px band everywhere else, and a number that close to the rule
			    reads as a drawing error. README: Cards. */}
			<CardBody>
				<div>
					<div className="figure-headline tabular-figures">{kr(period.spent)}</div>
					<div className="figure-delta tabular-figures">
						saved {kr(period.saved)} vs retail ({percent(period.savedPercent)})
					</div>
				</div>
				<RangeTabs value={range} onChange={setRange} />
				<div className="chart-wrap">
					<Chart height={130} pad={0} label="Daily spend through July"
						series={[{ points, kind: 'line', stroke: '#3A423D', strokeWidth: 1.6 }]} />
					<div className="chart-callout">{period.callout}</div>
				</div>
				<div className="compare-tabs" role="tablist" aria-label="Hero chart series">
					{HERO_SERIES.map((tab, i) => (
						<button key={tab.key} type="button" role="tab" ref={el => { refs[i] = el }}
							aria-selected={tab.key === series}
							tabIndex={tab.key === series ? 0 : -1}
							className={tab.key === series ? 'is-on' : undefined}
							onClick={() => setSeries(tab.key)}
							onKeyDown={e => {
								const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
								if (!step) return
								e.preventDefault()
								const next = (i + step + HERO_SERIES.length) % HERO_SERIES.length
								setSeries(HERO_SERIES[next].key)
								refs[next]?.focus()
							}}>
							<span className="compare-tabs-value">{tab.label}</span>
							<span className="compare-tabs-label tabular-figures">{heroValue(tab.key)}</span>
						</button>
					))}
				</div>
				<SplitBar segments={[{ width: 8, colour: 'var(--green)' }, { width: 92, colour: 'var(--teal)' }]} />
				<div className="chart-legend">
					{period.heroLegend.map(entry => {
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
							{categories.slice(0, 3).map(c =>
								<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
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
						<div className="figure-card tabular-figures">{krRound(vendors[0].spend)}</div>
						<span className="card-caption">{vendors[0].name} · all time</span>
						<div className="entry-list">
							{vendors.map(v => (
								<EntryRow key={v.id} avatar={v} name={v.name} meta={`${v.orders} orders`}
									amount={krRound(v.spend)} sub={`saved ${krRound(v.saved)}`}
									to={`/orders/all?vendor=${v.id}`} />
							))}
						</div>
					</CardBody>
				</>
			)
		case 'favcats':
			return (
				<>
					<CardHeader title="Favourite categories" />
					<CardDivider />
					<CardBody>
						<div className="category-rows">
							{favouriteCategories.map(c =>
								<CategoryRow key={c.id} category={c} meta={`saved ${krRound(c.saved)}`}
									to={`/orders/all?category=${c.id}`} />)}
						</div>
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
							fill={Math.round(period.spent / period.projected * 100)}
							marker={Math.round(period.previousTotal / period.projected * 100)}
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
						<Hero period={data.period} categories={data.categories} />

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
								<div className="chart-caption">
									<div className="chart-caption-label">Spent this month</div>
									<span className="chart-caption-value tabular-figures">{kr(data.period.spent)}</span>
								</div>
								<Chart height={110} pad={6} style={{ marginTop: 6 }}
									label="Cumulative spend through July"
									gradients={[{ key: 'spend', x1: 0, y1: 0, x2: 1, y2: 0, stops: [
										{ offset: 0, color: '#4F5BD5' }, { offset: 1, color: '#A5B4FC' }] }]}
									baselines={[{ y: 92, stroke: '#E4E7E2', dash: '3 4' }]}
									series={[{ points: data.period.series.cumulative, kind: 'curve',
										stroke: 'gradient:spend', strokeWidth: 2.4 }]}
									markers={[{ index: 1, series: 0, r: 4.5, fill: '#fff', stroke: '#4F5BD5', strokeWidth: 2 }]} />
								<ChartAxis />
								<div className="entry-list">
									<div className="list-heading">Latest orders</div>
									{data.latest.map(order => (
										<EntryRow key={order.id} avatar={order.vendor} name={order.vendor.name}
											meta={`${dayMonth(order.date)} · ${kr(order.total)}`}
											amount={'+' + kr(order.saved)} to={`/orders/${order.id}`} />
									))}
								</div>
							</CardBody>
						</Card>

						<Card aria-label="Saved vs retail">
							<CardHeader title="Saved vs retail" to="/stats" label="Saved vs retail, open Statistics" />
							<CardDivider />
							<CardBody>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
									<div className="chart-caption">
										<div className="chart-caption-label">Total saved</div>
										<span className="chart-caption-value tabular-figures">{kr(data.period.saved)}</span>
									</div>
									<SavingChip>{percent(data.period.savedPercent)}</SavingChip>
								</div>
								<Chart height={90} pad={0} style={{ marginTop: 8 }} label="Savings growth through July"
									gradients={[{ key: 'savings', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
										{ offset: 0, color: '#14AC72', opacity: 0.22 },
										{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
									series={[
										{ points: data.period.series.savingsGrowth, kind: 'area', fill: 'gradient:savings' },
										{ points: data.period.series.savingsGrowth, kind: 'curve', stroke: '#14AC72', strokeWidth: 2.2 }
									]} />
								<ChartAxis labels={['10', '15', '20', '25', '30']} />
							</CardBody>
						</Card>
					</div>
				</>
			)}</Async>
		</Page>
	)
}
