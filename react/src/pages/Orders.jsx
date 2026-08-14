import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Chart, ChartAxis, ChartRuler, plotted } from '../components/Chart.jsx'
import { Donut, DonutBox } from '../components/Viz.jsx'
import { CategoryRow, EntryRow } from '../components/Rows.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { TagChip } from '../components/Chip.jsx'
import { Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getOrdersOverview } from '../api/client.js'
import { dayMonth, kr, krRound, percent } from '../api/format.js'
import { useState } from 'react'
import { Note } from '../components/Card.jsx'

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
	/* HOW IT WORKS and ASK SPENDLY both open something. A button that explains and a button
	   that answers are the two shapes a decorative control most often takes, because neither
	   has an obvious destination -- so each one owns a disclosure here, with aria-expanded
	   saying which state it is in. README: Honest Affordances. */
	const [explaining, setExplaining] = useState(false)
	const [answering, setAnswering] = useState(false)

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
								<Chart height={250} pad={10} style={{ marginTop: 8 }}
									label={`${data.period.shortLabel} against ${data.period.previousLabel}, day by day`}
									baselines={[{ y: 128, stroke: '#D9DDD8', dash: '5 5' }]}
									/* 17px of inset, not 10 -- a day of no spend beside a day of a lot of it is
									   this chart's sharpest turn, and the spline's control points overshoot a
									   turn that sharp by about as much again as the jump. 10px left the
									   overshoot nowhere to go but past the box edge, where the SVG's own
									   clipping cut it off. README: Home. */
									series={[
										{ points: plotted(data.period.series.monthPrevious, chartMax, 233, 17), kind: 'curve', stroke: '#B9BFF0', strokeWidth: 2 },
										{ points: plotted(data.period.series.monthCurrent, chartMax, 233, 17), kind: 'curve', stroke: '#4F5BD5', strokeWidth: 2.6 }
									]}
									/* Same fix as Home's Orders card: monthCurrent is that same running
									   total (both read w.series.current), and a marker fixed at index 3
									   landed on the flat lead-in for any account whose first order came
									   later than the 3rd. daysIn - 1 is where the line actually is today. */
									markers={[
										{ index: data.period.daysIn - 1, series: 1, r: 13, fill: '#4F5BD5', opacity: 0.14 },
										{ index: data.period.daysIn - 1, series: 1, r: 5.5, fill: '#fff', stroke: '#4F5BD5', strokeWidth: 3 }
									]} />
								<ChartRuler />
								<ChartAxis />
							</CardBody>
						</Card>

						<div className="two-column">
							<Card aria-label="Latest orders">
								<CardHeader title="Latest orders" />
								<CardDivider />
								<CardBody variant="entry-list card-body-tight">
									{data.latest.map(order => (
										<EntryRow key={order.id} avatar={order.vendor} name={order.vendor.name}
											meta={dayMonth(order.date)} amount={'+' + kr(order.saved)}
											to={`/orders/${order.id}`} />
									))}
									<Button variant="block" to="/orders/all">SEE ALL</Button>
								</CardBody>
							</Card>

							<Card aria-label="Waiting receipts">
								<CardHeader title="Latest receipts" />
								<CardDivider />
								<CardBody variant="card-body-tight">
									<EmptyState>
										<p>No receipts waiting. Scan one and the order drafts itself.</p>
										<ButtonLink to="/scan">SCAN A RECEIPT</ButtonLink>
									</EmptyState>
									<Button variant="block" to="/orders/all">SEE ALL</Button>
								</CardBody>
							</Card>
						</div>

						<Card aria-label="For you">
							<CardHeader title="For you">
								<button type="button" className="button button-pill"
									aria-expanded={explaining} aria-controls="for-you-explainer"
									onClick={() => setExplaining(o => !o)}>HOW IT WORKS</button>
							</CardHeader>
							<CardDivider />
							{explaining ? (
								<div className="card-body" id="for-you-explainer">
									<Note tone="positive" title="What these are.">
										General tips on using Spendly, not suggestions read from your own orders --
										the vendor-matching and stale-order checks this card once described were
										never wired up. Nothing here looks at your data.
									</Note>
								</div>
							) : null}
							<CardBody variant="promo-row">
								{data.promos.map(promo => (
									<div className="promo" key={promo.id}>
										<TagChip tone={promo.tone} icon={promo.tagIcon}>{promo.tag}</TagChip>
										<span className="promo-title">{promo.title}</span>
										<p>{promo.body}</p>
									</div>
								))}
							</CardBody>
						</Card>
					</div>

					<div className="order-list-column">
						<Card aria-label="Returns this month">
							<CardHeader title="Returns this month" />
							<CardDivider />
							<CardBody>
								<EmptyState>
									<p>No open returns found</p>
									<ButtonLink to="/orders/all?status=Returned">SEE RETURN HISTORY</ButtonLink>
								</EmptyState>
							</CardBody>
						</Card>

						<Card aria-label="Question of the day">
							<CardHeader title="Question of the day" />
							<CardDivider />
							<CardBody>
								<div className="card-headline card-headline-question">
									{data.question?.question ?? 'Ask Spendly about your spending.'}</div>
								{answering && data.question ? (
									<>
										<Note tone="positive" title={data.question.answer}>{data.question.detail}</Note>
										<Button variant="block" iconAfter="chevronRight"
											to={`/orders/all?category=${data.question.categoryId}&from=${data.question.from}&to=${data.question.to}`}>
											SEE THOSE ORDERS</Button>
									</>
								) : (
									<Button variant="block" icon="sparkles" style={{ marginTop: 0 }}
										aria-expanded={answering} onClick={() => setAnswering(true)}
										disabled={!data.question}>ASK SPENDLY</Button>
								)}
							</CardBody>
						</Card>

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
										<div className="category-rows">
											{data.categories.map(c =>
												<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
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
												<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`}
													meta={c.budget
														? `${krRound(c.spend)} of ${krRound(c.budget)} budget`
														: 'No budget set'} />
											))}
										</div>
									</>
								)}
								<Button variant="block" to="/orders/all">SEE ALL</Button>
							</CardBody>
						</Card>

						<Button variant="block" icon="settings" style={{ marginTop: 0 }} to="/settings">ORDER SETTINGS</Button>
					</div>
				</div>
				)
			}}</Async>
		</Page>
	)
}
