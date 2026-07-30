import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { Chart, ChartAxis, ChartRuler, RangeTabs, ranged } from '../components/Chart.jsx'
import { Meter, MonthColumns, SpendGauge, WeekdayBars } from '../components/Viz.jsx'
import { LegendRow } from '../components/Rows.jsx'
import { ButtonLink, IconButton } from '../components/Button.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { useApi } from '../api/useApi.js'
import { getStats } from '../api/client.js'
import { kr, krRound } from '../api/format.js'

/* Statistics.

   The range chips sit in the card body, where the hero card's identical control sits, rather
   than in the header. In the header they were the one right-hand item taller than the band --
   five buttons wrapping to two rows and 66px at 390, beside a label that wrapped with them --
   so the header stood at 57.94 and 93.88 against every other header's 44.67. README: Cards. */

export default function Stats() {
	/* Which month is on screen lives in the URL, so a link to a month is a link to a month --
	   and the browser's own Back walks the pager. */
	const [params, setParams] = useSearchParams()
	const periodId = params.get('period') ?? '2026-07'
	const state = useApi(getStats, [periodId])
	const [range, setRange] = useState('1M')
	const goTo = id => setParams(id === '2026-07' ? {} : { period: id })

	return (
		<Page variant="page-grid">
			<Async state={state} label="Loading your statistics">{({ period, categories, newer, older }) => (
				<>
					<div className="space-between" style={{ flexWrap: 'wrap', gap: 12, padding: '2px 2px 0' }}>
						<div className="row-inline">
							{/* A real pager over the months the source holds. Each arrow is disabled only at
							    its own end, which is the one honest reason to disable a control -- the
							    prototype disabled the right-hand one permanently and left the left-hand one
							    live and inert. README: Honest Affordances. */}
							<IconButton icon="chevronLeft" label={older ? 'Previous period' : 'No earlier period'}
								disabled={!older} style={older ? undefined : { opacity: 0.45 }}
								onClick={() => older && goTo(older)} />
							<span className="panel-heading" style={{ fontSize: 16, letterSpacing: '-.01em' }}>
								{period.label}</span>
							<IconButton icon="chevronRight" label={newer ? 'Next period' : 'No later period'}
								disabled={!newer} style={newer ? undefined : { opacity: 0.45 }}
								onClick={() => newer && goTo(newer)} />
						</div>
						<div className="row-inline">
							<span className="figure-large tabular-figures">{kr(period.spent)}</span>
							<StatusChip tone="warning">{period.deltaLabel}</StatusChip>
						</div>
					</div>

					<div className="kpi-row">
						{period.kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
					</div>

					<Card aria-label="Overview">
						<CardHeader title={`Overview · ${period.shortLabel} against ${period.previousLabel}`} />
						<CardDivider />
						<CardBody variant="card-body-tight">
							<RangeTabs value={range} onChange={setRange} />
							<Chart height={210} pad={10}
								label={`Cumulative spend per day, ${period.shortLabel} solid, ${period.previousLabel} dashed`}
								gradients={[{ key: 'spend', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
									{ offset: 0, color: '#14AC72', opacity: 0.2 },
									{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
								series={[
									{ points: ranged(period.series.statsCurrent, range), kind: 'area', fill: 'gradient:spend' },
									{ points: ranged(period.series.statsCurrent, range), kind: 'curve', stroke: '#14AC72', strokeWidth: 2.4 },
									{ points: ranged(period.series.statsPrevious, range), kind: 'curve', stroke: '#95ABAA', strokeWidth: 1.6, dash: '4 4' }
								]} />
							<ChartRuler />
							<ChartAxis />
						</CardBody>
					</Card>

					<div className="two-column">
						<Card aria-label="Pace">
							<CardHeader title="Pace">
								<span className="field-help">{period.daysIn} days in</span>
							</CardHeader>
							<CardDivider />
							<CardBody>
								<div className="figure-large tabular-figures">{krRound(period.projected)}</div>
								<span className="field-help">
									projected for {period.shortLabel} · {kr(period.spent)} spent so far</span>
								<Meter style={{ marginTop: 14 }}
									fill={Math.round(period.spent / period.projected * 100)}
									marker={Math.round(period.previousTotal / period.projected * 100)}
									ariaLabel={`Spent ${krRound(period.spent)} of a projected ${krRound(period.projected)}; the marker is where ${period.previousLabel} ended`} />
								<span className="field-help" style={{ marginTop: 8, display: 'block' }}>
									The marker is where {period.previousLabel} ended: {krRound(period.previousTotal)}.</span>
							</CardBody>
						</Card>

						<Card aria-label="Weekly rhythm">
							<CardHeader title="Weekly rhythm">
								<span className="field-help">busiest day: {period.busiestDay}</span>
							</CardHeader>
							<CardDivider />
							<CardBody>
								<div className="figure-large tabular-figures">{period.weekendShare}%{' '}
									<span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-muted)' }}>
										of spend lands on weekends</span></div>
								<WeekdayBars days={period.weekdays} field="stats" style={{ height: 86 }} />
							</CardBody>
						</Card>
					</div>

					<div className="two-column">
						<Card aria-label="Where it went">
							<CardHeader title="Where it went" />
							<CardDivider />
							<CardBody variant="spend-gauge-row">
								<SpendGauge segments={period.statsLegend.map((entry, i) =>
									({ share: categories[i]?.share ?? 25, colour: entry.colour }))}
									value={krRound(period.spent)} label={period.label}
									ariaLabel={`Category split of ${krRound(period.spent)} in ${period.label}`} />
								<div className="chart-legend" style={{ flex: 1, minWidth: 170 }}>
									{period.statsLegend.map(entry => {
										/* The row names a category, so the link filters by it. A legend row that
										   opens an unfiltered list is a link that does not go where it says. */
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

						<Card aria-label="Last six months">
							<CardHeader title="Last six months">
								<span className="field-help">{period.shortLabel} is the highest so far</span>
							</CardHeader>
							<CardDivider />
							<CardBody>
								<MonthColumns months={period.months} />
							</CardBody>
						</Card>
					</div>

					<Card aria-label="Returns">
						<CardHeader title={`Returns · ${period.shortLabel}`} />
						<CardDivider />
						<CardBody>
							<EmptyState icon={null} style={{ padding: '14px 12px' }}>
								<p>{period.returnsNote}</p>
								<ButtonLink to="/orders/all?status=Returned">SEE RETURN HISTORY</ButtonLink>
							</EmptyState>
						</CardBody>
					</Card>
				</>
			)}</Async>
		</Page>
	)
}
