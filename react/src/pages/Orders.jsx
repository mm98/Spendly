import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from '../components/Card.jsx'
import { Chart, ChartAxis, ChartRuler } from '../components/Chart.jsx'
import { Donut, DonutBox } from '../components/Viz.jsx'
import { CategoryRow, EntryRow } from '../components/Rows.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { TagChip } from '../components/Chip.jsx'
import { Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getOrdersOverview } from '../api/client.js'
import { dayMonth, kr, krRound } from '../api/format.js'
import { useState } from 'react'

/* Orders, overview.

   The comparison period is fixed to the one before, so the key names both plotted lines
   instead of offering a choice the app does not have -- a legend that looks like a control
   and is not is the same defect as a control that looks live and does nothing. README 13. */

export default function Orders() {
	const state = useApi(getOrdersOverview)
	const [breakdown, setBreakdown] = useState('Expenses')

	return (
		<Page>
			<Async state={state} label="Loading your orders">{data => (
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label="Spent over July">
							<CardHeader title={`Spent · ${data.period.label}`} to="/stats"
								label={`Spent · ${data.period.label}, open Statistics`} />
							<CardDivider />
							{/* No padding-top override here either -- the 2px this card carried put the
							    first line 4.5px under the hairline, the tightest in the file. README 10. */}
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
									series={[
										{ points: data.period.series.monthPrevious, kind: 'curve', stroke: '#B9BFF0', strokeWidth: 2 },
										{ points: data.period.series.monthCurrent, kind: 'curve', stroke: '#4F5BD5', strokeWidth: 2.6 }
									]}
									markers={[
										{ index: 3, series: 1, r: 13, fill: '#4F5BD5', opacity: 0.14 },
										{ index: 3, series: 1, r: 5.5, fill: '#fff', stroke: '#4F5BD5', strokeWidth: 3 }
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
									{data.latest.map((order, i) => (
										<EntryRow key={order.id} glyph="receipt" name={order.vendor.name}
											meta={dayMonth(order.date)} amount={'+' + kr(order.saved)}
											to={i === 0 ? `/orders/${order.id}` : undefined} />
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
								<button type="button" className="button button-pill">HOW IT WORKS</button>
							</CardHeader>
							<CardDivider />
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
								<div className="card-headline card-headline-question">{data.question.long}</div>
								<Button variant="block" icon="sparkles" style={{ marginTop: 0 }}>ASK SPENDLY</Button>
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
								<DonutBox>
									<Donut segments={data.categories.map(c => ({ share: c.share, colour: c.colour }))}
										value={krRound(data.period.spent)} label="Spent this month"
										ariaLabel={`Category split of ${krRound(data.period.spent)} this month`} />
								</DonutBox>
								<div className="category-rows">
									{data.categories.map(c =>
										<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
								</div>
								<Button variant="block" to="/orders/all">SEE ALL</Button>
							</CardBody>
						</Card>

						<Button variant="block" icon="settings" style={{ marginTop: 0 }}>ORDER SETTINGS</Button>
					</div>
				</div>
			)}</Async>
		</Page>
	)
}
