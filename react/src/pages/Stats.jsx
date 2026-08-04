import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard, SectionHeader, SectionLabel } from '../components/Card.jsx'
import { Chart, ChartAxis, ChartRuler, RangeTabs, RANGE_POINTS, plotted, sampled } from '../components/Chart.jsx'
import { Meter, MonthColumns, SpendGauge, WeekdayBars } from '../components/Viz.jsx'
import { LegendRow } from '../components/Rows.jsx'
import { ButtonLink, IconButton } from '../components/Button.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { useApi } from '../api/useApi.js'
import { getStats, ranges } from '../api/client.js'
import { kr, krRound } from '../api/format.js'

/* Statistics.

   The range chips and the pager are one control. The chips choose how wide the window is and
   the arrows step by that width, so Week pages a week and Month pages a month -- they used to
   disagree, and a pager that steps something other than what is drawn is a pager for a page
   nobody is looking at. The header, the tiles and the chart are all the window's, derived from
   the same days. What the records cannot cut that fine stays the month's and says which month
   in its own heading -- the pace, the rhythm, the split and the returns -- because a pace is a
   month's by definition, a weekly rhythm needs more than one of each weekday, and the other two
   are written per month. README: Statistics.

   The chips sit in the card body, where the hero card's identical control sits, rather than in
   the header. In the header they were the one right-hand item taller than the band -- five
   buttons wrapping to two rows and 66px at 390, beside a label that wrapped with them -- so the
   header stood at 57.94 and 93.88 against every other header's 44.67. README: Cards. */

export default function Stats() {
	/* Which window is on screen lives in the URL, so a link to a week is a link to a week --
	   and the browser's own Back walks the pager. The width is a parameter of its own because
	   it is what the arrows step: a link naming a week but not the width would page it a month
	   at a time. `period` is still a month id where the window is a month, so every link that
	   was ever shared to a month still opens that month. */
	const [params, setParams] = useSearchParams()
	const range = params.get('range') ?? 'month'
	const periodId = params.get('period') ?? ''
	const state = useApi(getStats, [range, periodId])
	const defaultId = state.data?.defaultId

	const show = (width, id) => setParams({
		...(width === 'month' ? {} : { range: width }),
		...(id && id !== defaultId ? { period: id } : {})
	})

	return (
		<Page variant="page-grid">
			<Async state={state} label="Loading your statistics">{({ period, categories, window: view, newer, older }) => {
				/* One scale for both lines, and the running total the figure above the chart
				   states is the line itself -- a chart drawn from other numbers than the ones
				   printed beside it cannot fail visibly. README: Charts. */
				const points = sampled(view.series.current, RANGE_POINTS[view.range])
				const compare = view.series.previous && sampled(view.series.previous, RANGE_POINTS[view.range])
				const ceiling = Math.max(view.spent, compare ? view.series.previous.at(-1) : 0)

				return (
					<>
						<div className="space-between" style={{ flexWrap: 'wrap', gap: 12, padding: '2px 2px 0' }}>
							<div className="row-inline">
								{/* A real pager over the windows the chosen width offers. Each arrow is
								    disabled only at its own end, which is the one honest reason to disable
								    a control -- the prototype disabled the right-hand one permanently and
								    left the left-hand one live and inert. It names its own step, because
								    "previous period" over a week that pages a week says less than the
								    control does. README: Honest Affordances. */}
								<IconButton icon="chevronLeft"
									label={older ? `Previous ${view.unit}` : `No earlier ${view.unit}`}
									disabled={!older} style={older ? undefined : { opacity: 0.45 }}
									onClick={() => older && show(view.range, older)} />
								{/* One name, drawn and announced. Two of the units used to be abbreviated
								    here -- W30, 2026 and Q2, 2026 -- with the unabbreviated string carried
								    beside them for screen readers, which is a label a reader could not
								    read and a second copy to keep in step. They are written out now. The
								    days the window covers are on the card below, over the chart. */}
								<span className="panel-heading" style={{ fontSize: 16, letterSpacing: '-.01em' }}>
									{view.label}</span>
								<IconButton icon="chevronRight"
									label={newer ? `Next ${view.unit}` : `No later ${view.unit}`}
									disabled={!newer} style={newer ? undefined : { opacity: 0.45 }}
									onClick={() => newer && show(view.range, newer)} />
							</div>
							<div className="row-inline">
								<span className="figure-large tabular-figures">{kr(view.spent)}</span>
								{/* Nothing before the oldest window in the store, so nothing to be up
								    against: no chip beats an invented comparison. Amber is for the ups
								    only -- spending less is a good down, which is the split the tiles
								    below already make. */}
								{view.deltaLabel
									? <StatusChip tone={view.deltaUp ? 'warning' : undefined}>{view.deltaLabel}</StatusChip>
									: null}
							</div>
						</div>

						{/* The tiles are the window's -- every one of the four is derived from the
						    same days the figure above is -- so the heading names the window rather
						    than a month it may only be part of. 23 orders under a seven-day heading
						    is a wrong number rather than a missing one. */}
						<SectionHeader>
							<SectionLabel>{view.label} in numbers</SectionLabel>
						</SectionHeader>
						<div className="kpi-row">
							{view.kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
						</div>

						<Card aria-label="Overview">
							<CardHeader title={`Overview · ${view.shortLabel}`}>
								{view.previousLabel
									? <span className="field-help">vs {view.previousLabel}</span>
									: null}
							</CardHeader>
							<CardDivider />
							<CardBody variant="card-body-tight">
								{/* Selected is whichever width the window on screen actually is, not
								    whatever the URL asked for -- a link carrying a width this app no
								    longer has, `?range=3M` from before these were named after their
								    units, is served as the month it falls back to, and a chip row with
								    nothing selected over a month of data is the URL's claim drawn over
								    the API's. The first click writes a name that exists. */}
								<RangeTabs options={ranges} value={view.range} onChange={key => show(key, periodId)} />
								<Chart height={210} pad={10}
									label={`Cumulative spend across ${view.shortLabel}${compare ? `, ${view.previousLabel} dashed behind it` : ''}`}
									gradients={[{ key: 'spend', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
										{ offset: 0, color: '#14AC72', opacity: 0.2 },
										{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
									series={[
										{ points: plotted(points, ceiling), kind: 'area', fill: 'gradient:spend' },
										{ points: plotted(points, ceiling), kind: 'curve', stroke: '#14AC72', strokeWidth: 2.4 },
										...(compare ? [{ points: plotted(compare, ceiling), kind: 'curve', stroke: '#95ABAA', strokeWidth: 1.6, dash: '4 4' }] : [])
									]} />
								<ChartRuler />
								<ChartAxis labels={view.axis} />
							</CardBody>
						</Card>

						<div className="two-column">
							{/* Four cards the records cannot cut finer than a month: a pace is a month's,
							    a weekly rhythm needs more than one of each weekday, and the split and the
							    returns are written per month. Each says which month in its own heading,
							    rather than borrowing the one over the tiles -- that one now moves. */}
							<Card aria-label="Pace">
								<CardHeader title={`Pace · ${period.shortLabel}`}>
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
								<CardHeader title={`Weekly rhythm · ${period.shortLabel}`}>
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
								<CardHeader title={`Where it went · ${period.shortLabel}`} />
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
				)
			}}</Async>
		</Page>
	)
}
