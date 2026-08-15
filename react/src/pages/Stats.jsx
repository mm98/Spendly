import { useSearchParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, KpiCard, SectionHeader, SectionLabel } from '../components/Card.jsx'
import { Chart, ChartScale, RangeTabs, bucketOf, bucketsFor, plotted, sampled, todayMarker } from '../components/Chart.jsx'
import { Meter, MonthColumns, SpendGauge, WeekdayBars } from '../components/Viz.jsx'
import { LegendRow } from '../components/Rows.jsx'
import { ReturnsCard } from '../components/Returns.jsx'
import { IconButton } from '../components/Button.jsx'
import { StatusChip } from '../components/Chip.jsx'
import { useApi } from '../api/useApi.js'
import { getStats, ranges } from '../api/client.js'
import { kr, krRound } from '../api/format.js'

/* Statistics.

   The width picker and the pager are one control, so they are drawn as one: the two arrows,
   the window's name and the five widths in a single band, every button the same 32px box. The
   picker chooses how wide the window is and the arrows step by that width, so Week pages a
   week and Month pages a month -- they used to disagree, and a pager that steps something
   other than what is drawn is a pager for a page nobody is looking at. README: Statistics.

   Every card on the page is that window's. The pace, the weekly rhythm, the category split,
   the columns and the returns note used to come off the month record whatever the picker said,
   so choosing a week moved the tiles and the chart and left five cards reading July -- a page
   with one control and two answers to it. The charts are the same charts; the days under them
   are the window's. What a month authors and a day does not is split across that month's days
   by what each day cost, the same way the tiles already are.

   The picker was in the Overview card's header once, where it was the one right-hand item
   taller than the band -- five buttons wrapping to two rows and 66px at 390 -- so the header
   stood at 57.94 and 93.88 against every other header's 44.67. The page band is not a card
   header: it is the pager's own row, it already wraps, and the buttons in it are the size of
   the buttons beside them. README: Cards. */

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
			<Async state={state} label="Loading your statistics">{({ window: view, newer, older }) => {
				/* One scale for both lines, and the running total the figure above the chart
				   states is the line itself -- a chart drawn from other numbers than the ones
				   printed beside it cannot fail visibly. README: Charts. */
				const buckets = bucketsFor(view.range, view.axis, view.series.current.length)
				const points = sampled(view.series.current, buckets)
				const compare = view.series.previous && sampled(view.series.previous, buckets)
				const ceiling = Math.max(view.spent, compare ? view.series.previous.at(-1) : 0)

				return (
					<>
						<div className="space-between stats-toolbar">
							<div className="row-inline">
								{/* The arrows and the name they step hold a width, so the picker beside
								    them does not slide when the name changes length: Year to Quarter is
								    2026 to Quarter 3, 2026, and that moved every width button 87px --
								    a different width under the pointer that had just clicked one. The
								    number it holds is in the stylesheet, on `.stats-window`. */}
								<div className="row-inline stats-window">
									{/* A real pager over the windows the chosen width offers. Each arrow is
									    disabled only at its own end, which is the one honest reason to disable
									    a control -- the prototype disabled the right-hand one permanently and
									    left the left-hand one live and inert. It names its own step, because
									    "previous period" over a week that pages a week says less than the
									    control does. README: Honest Affordances. */}
									<IconButton icon="chevronLeft"
										label={older ? `Previous ${view.unit}` : `No earlier ${view.unit}`}
										disabled={!older} className="pager-arrow"
										onClick={() => older && show(view.range, older)} />
									{/* One name at any width, drawn and announced. Both forms are in the markup
									    and the stylesheet renders exactly one -- the unit written out wherever
									    the band has room for it, and W31 2026 on a phone, where the row it
									    shares with the arrows and the five widths has about 96px for a name
									    that wants 128.6. What made the short form a defect before was the
									    long one being announced *beside* it, which is a label a reader could
									    not read and a second copy to keep in step; `display:none` is not
									    announced, so there is one string here either way. The days the window
									    covers are on the card below, over the chart. */}
									<span className="panel-heading pager-heading">
										<span className="pager-wide">{view.label}</span>
										<span className="pager-narrow">{view.abbr}</span></span>
									<IconButton icon="chevronRight"
										label={newer ? `Next ${view.unit}` : `No later ${view.unit}`}
										disabled={!newer} className="pager-arrow"
										onClick={() => newer && show(view.range, newer)} />
								</div>
								{/* The widths, beside the arrows that step them, in the same box the
								    arrows are drawn in. Selected is whichever width the window on
								    screen actually is, not whatever the URL asked for -- a link
								    carrying a width this app no longer has, `?range=3M` from before
								    these were named after their units, is served as the month it falls
								    back to, and a picker with nothing selected over a month of data is
								    the URL's claim drawn over the API's. The first click writes a name
								    that exists. */}
								<RangeTabs variant="pager" options={ranges} value={view.range}
									onChange={key => show(key, periodId)} />
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
								<Chart height={210}
									label={`Cumulative spend across ${view.shortLabel}${compare ? `, ${view.previousLabel} dashed behind it` : ''}`}
									gradients={[{ key: 'spend', x1: 0, y1: 0, x2: 0, y2: 1, stops: [
										{ offset: 0, color: '#14AC72', opacity: 0.2 },
										{ offset: 1, color: '#14AC72', opacity: 0 }] }]}
									series={[
										{ points: plotted(points, ceiling, 203.5, 6.5), kind: 'area', fill: 'gradient:spend' },
										{ points: plotted(points, ceiling, 203.5, 6.5), kind: 'curve', stroke: '#14AC72', strokeWidth: 2.4 },
										...(compare ? [{ points: plotted(compare, ceiling, 203.5, 6.5), kind: 'curve', stroke: '#95ABAA', strokeWidth: 1.6, dash: '4 4' }] : [])
									]}
									/* Today, and only where the window holds one: this is the page with a
									   pager, so the same chart draws a month that ended in March. The index
									   is a day, and this series may be cut into months -- so it goes through
									   the same cut the points did, or the mark would sit on the 15th point
									   of twelve rather than in the month it is in. Not on the dashed line:
									   that is the window before, whose days are not today's.
									   README: Charts. */
									markers={todayMarker(view.todayIndex == null ? null
										: bucketOf(view.todayIndex, view.series.current.length, buckets),
									{ series: 1, colour: '#14AC72' })} />
								<ChartScale marks={view.axis} span={view.series.current.length} buckets={buckets} />
							</CardBody>
						</Card>

						<div className="two-column">
							{/* The four cards under the chart, every one of them the window's. Each says
							    which stretch it is about in its own heading, rather than borrowing the
							    one over the tiles, because a card that names nothing is a card a reader
							    has to scroll up to date. */}
							<Card aria-label="Pace">
								<CardHeader title={`Pace · ${view.shortLabel}`}>
									<span className="field-help">{view.pace.daysIn} days in</span>
								</CardHeader>
								<CardDivider />
								<CardBody>
									<div className="figure-large tabular-figures">{krRound(view.pace.projected)}</div>
									{/* A projection only where there is something left to project: the newest
									    window is the one still being written, and everywhere else this figure
									    is the total itself and says so. */}
									<span className="field-help">
										{view.pace.running
											? `projected for ${view.label} · ${kr(view.spent)} spent so far`
											: `total for ${view.label} · ${view.pace.daysIn} days of records`}</span>
									<Meter className="meter-under-caption"
										/* projected is 0 exactly when spent is -- nothing bought yet this
										   window -- and 0/0 is NaN, an invalid CSS width the browser drops
										   silently rather than rejecting: no fill at all instead of an
										   honest 0%. Spent nothing of a projected nothing is 0% spent. */
										fill={view.pace.projected ? Math.round(view.spent / view.pace.projected * 100) : 0}
										/* The marker is a position on this window's track, so a previous
										   window that spent more than this one is projected to sits at the
										   end of it -- the figure it stands for is printed under the meter,
										   where it can exceed the track without falling off it. */
										marker={view.previousTotal != null
											? Math.min(100, Math.round(view.previousTotal / view.pace.projected * 100))
											: undefined}
										ariaLabel={`Spent ${krRound(view.spent)} of ${view.pace.running ? 'a projected ' : ''}${krRound(view.pace.projected)}`
											+ (view.previousTotal != null ? `; the marker is where ${view.previousLabel} ended` : '')} />
									{/* No full stop after the amount: krRound ends in "kr." and this line has been
									    closing a second one on top of it -- "20.680 kr..". */}
									{view.previousTotal != null
										? <span className="field-help field-help-below">
											The marker is where {view.previousLabel} ended: {krRound(view.previousTotal)}</span>
										: null}
								</CardBody>
							</Card>

							<Card aria-label="Weekly rhythm">
								<CardHeader title={`Weekly rhythm · ${view.shortLabel}`}>
									<span className="field-help">busiest day: {view.rhythm.busiestDay}</span>
								</CardHeader>
								<CardDivider />
								<CardBody>
									<div className="figure-large tabular-figures">{view.rhythm.weekendShare}%{' '}
										<span className="figure-unit">
											of spend lands on weekends</span></div>
									<WeekdayBars days={view.rhythm.weekdays} className="rhythm-bars" />
								</CardBody>
							</Card>
						</div>

						<div className="two-column">
							<Card aria-label="Where it went">
								<CardHeader title={`Where it went · ${view.shortLabel}`} />
								<CardDivider />
								<CardBody variant="ring-row">
									{/* The ring and the rows are one list of numbers: the segments are the
									    shares the amounts beside them make, so a ring drawn from all-time
									    category totals over a month's legend cannot happen again. */}
									<SpendGauge segments={view.split.map(entry =>
										({ share: entry.share, colour: entry.colour }))}
										value={krRound(view.spent)} label={view.tick}
										ariaLabel={`Category split of ${krRound(view.spent)} in ${view.label}`} />
									<div className="chart-legend chart-legend-fill">
										{view.split.map(entry => (
											/* The row names a category and states the window's amount for it, so
											   the link carries both: an unfiltered list, or the category across
											   all time, is a link that does not go where the row says. */
											<LegendRow key={entry.name} colour={entry.colour} title={entry.name}
												amount={krRound(entry.amount)}
												to={'/orders/all?' + (entry.id ? `category=${entry.id}&` : '')
													+ `from=${view.from}&to=${view.to}`} />
										))}
									</div>
								</CardBody>
							</Card>

							{/* Six of whatever the picker chose, the one on screen marked -- Week draws six
							    weeks here, not six months. All time and a single year have no second window
							    of their own width to stand beside, so both fall back to the months inside
							    the window, which is what this card has always drawn. */}
							<Card aria-label={view.recent.title}>
								<CardHeader title={view.recent.title}>
									{view.recent.note ? <span className="field-help">{view.recent.note}</span> : null}
								</CardHeader>
								<CardDivider />
								{/* Fills the card rather than sitting 150px tall in it: this shares a row
								    with the category breakdown, which is as long as the account has
								    categories. README: Charts. */}
								<CardBody variant="card-body-fill">
									<MonthColumns months={view.recent.columns} />
								</CardBody>
							</Card>
						</div>

						<ReturnsCard title={`Returns · ${view.shortLabel}`} span={view.shortLabel}
							returns={view.returns} />
					</>
				)
			}}</Async>
		</Page>
	)
}
