import { useSearchParams } from 'react-router'
import { Page } from '../legacy/Shell.jsx'
import { Async } from '../legacy/Async.jsx'
import { SkeletonBlock, SkeletonCard, SkeletonKpiRow } from '../legacy/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../legacy/Card.jsx'
import { MonthColumns, SpendChart, SpendGauge, WeekdayBars, bucketOf, bucketsFor, sampled } from '../legacy/Chart.jsx'
import { Segmented } from '../legacy/Form.jsx'
import { Combobox } from '../legacy/Combobox.jsx'
import { Meter, foldForRing } from '../legacy/Viz.jsx'
import { CategoryRow, LegendRow } from '../legacy/Rows.jsx'
import { ReturnsCard } from '../legacy/Returns.jsx'
import { Button, IconButton } from '../legacy/Button.jsx'
import { useApi } from '../api/useApi.js'
import { getStats, ordersIn, ranges } from '../api/client.js'
import { compactAmount, currency, currencySymbol, fullStop, percent, plural, sep } from '../api/format.js'

/* Statistics.

   The width picker and the pager are one control, so they are drawn as one: the two arrows,
   the window's name and the five widths in a single band, every button the same 32px box. The
   picker chooses how wide the window is and the arrows step by that width, so Week pages a
   week and Month pages a month: the pager always steps exactly what the picker shows, since a
   pager that steps something other than what is drawn is a pager for a page nobody is looking
   at. README: Statistics.

   Every card on the page is that window's. The pace, the weekly rhythm, the category split,
   the columns and the returns note all read off the same window the picker shows, so choosing
   a week moves every card, not just the tiles and the chart -- one control, one answer. The
   charts are the same charts; the days under them are the window's. What a month authors and a
   day does not is split across that month's days by what each day cost, the same way the tiles
   already are.

   The picker sits in the page band rather than a card header: it is the pager's own row, it
   already wraps at narrow widths, and the buttons in it are the size of the buttons beside
   them. README: Cards. */

/** What a slice of the ring says about its own budget, or that it has none. Every row in the
    list gets a second line either way -- a category with a budget above one without would
    grow the row it sits in, and the rows would stop lining up at the same height. The
    percentage is the window's -- the same ratio the card below prints. Which reading it is
    ("124% of budget" over a year is a different sentence from the same words over August) is
    said once in the card's header rather than on all ten rows: the qualifier is the same for
    every row in the card, and repeating it wrapped half of them onto a second line. */
const splitBudgetMeta = entry => (entry.budget ? `${percent(entry.budgetUsed, 0)} of budget` : 'No budget set')

/* What every delta on the page is measured against: the window right before this one, or the
   same stretch of calendar a year back. One switch, not one per card -- the KPI tiles, the
   Overview chart's dashed line and the Pace marker all read the same `was` window the API
   picked, so there is nowhere on the page a second control could disagree with this one about
   what "compared to" means. README: two controls that describe one thing must not disagree. */
const COMPARE_LABEL = { year: 'Last year', previous: 'Prev. period' }
const COMPARE_CODE = Object.fromEntries(Object.entries(COMPARE_LABEL).map(([code, label]) => [label, code]))
const COMPARE_OPTIONS = Object.values(COMPARE_LABEL)

/* Which window a width change lands on, computed here rather than asked for.

   The picker and the pager are one control, so changing the width keeps the window: the new
   one holds the *last day* of the old one, clamped to today, since a window later than today
   is one the pager's own forward arrow refuses to reach. The API re-anchors the same way for a
   link typed by hand -- this is the same rule on the near side of the wire, so the URL the
   click writes is already the window the answer will be about.

   The URL is never derived from the rendered answer: `useApi` keeps the previous window's data
   across a refetch, so a URL written from an effect reacting to that data could disagree with
   what the reader actually clicked, and every guard against that disagreement is a guard on a
   loop that has the address bar, the router and the fetch in it. State the reader chose goes
   into the URL when the reader chooses it, once, and nothing derives it back out. README:
   Statistics. */
const DAY_MS = 86400000
const pad = n => String(n).padStart(2, '0')

const utcOf = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const mondayFirst = ms => (new Date(ms).getUTCDay() + 6) % 7

/** ISO week of a day: Monday-first, week 1 is the one holding 4 January. The same arithmetic
    the API does, because a week is the one width whose id cannot be read off the date. */
function isoWeekOf(ms) {
	const thursday = ms + (3 - mondayFirst(ms)) * DAY_MS
	const year = new Date(thursday).getUTCFullYear()
	const jan4 = Date.UTC(year, 0, 4)
	const firstThursday = jan4 + (3 - mondayFirst(jan4)) * DAY_MS
	return { year, week: Math.round((thursday - firstThursday) / (7 * DAY_MS)) + 1 }
}

function windowIdAt(range, ms) {
	const at = new Date(ms)
	if (range === 'week') { const { year, week } = isoWeekOf(ms); return `${year}-W${pad(week)}` }
	if (range === 'month') return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`
	if (range === 'quarter') return `${at.getUTCFullYear()}-Q${Math.floor(at.getUTCMonth() / 3) + 1}`
	if (range === 'year') return String(at.getUTCFullYear())
	return 'all'
}

const todayUtc = () => { const t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) }

/** The window of `width` to open when the picker moves off the window on screen. `to` is that
    window's last day, inclusive, as the API answers it. */
function reanchor(view, width) {
	// 'All time' has one window, so it has nothing to carry in the URL: the id is the width.
	if (width === 'all') return ''
	return windowIdAt(width, Math.min(Math.max(todayUtc(), utcOf(view.from)), utcOf(view.to)))
}

/** The window a width opens with, which is the one id the URL leaves out -- a link to this
    month is `/stats`, not `/stats?period=2026-08`. Computed here rather than read off the last
    answer: the answer on screen is the *previous* width's while a change is in flight, so its
    default belongs to the width being left, and the URL took a redundant parameter every time
    a picker was clicked from a settled page. */
const defaultIdFor = width => (width === 'all' ? '' : windowIdAt(width, todayUtc()))

/* The three sentences a budget row can be, and which one it is depends only on how many months
   the window holds. A month is the plain case both sides were already written for; anything
   wider averages the spend down to a month; anything narrower cuts the allowance down to the
   window. `months` is exact -- a quarter is 3 and a week is about 0.23 -- so the "exactly one
   month" case is a comparison against 1 and not a range check. */
const isMonth = budgets => Math.abs(budgets.months - 1) < 0.005

const budgetBasis = budgets => (
	isMonth(budgets) ? 'monthly budgets'
		: budgets.months > 1 ? `monthly average over ${plural(Math.round(budgets.months), 'month')}`
			: `${percent(budgets.months * 100, 0)} of a month's budgets`)

/** The figure a row states: the window's own spend, or its monthly average where the window is
    wider than the budget it is measured against. */
const budgetFigure = (budgets, entry) => (budgets.months > 1 ? entry.perMonth : entry.spend)

/* One short sentence, the same shape at every width: the percentage and the budget it is a
   percentage *of*. Which reading that percentage is -- a month's own spend, a monthly average,
   a window's share -- is the same for every row in the card, so it is said once in the header
   rather than nine times down the rows: spelled out per row it ran to 44 characters, wrapped
   all six rows onto two lines at 390px and three on the week, and a meta that wraps reads as a
   broken list rather than as more text. README: Data Rows. */
const budgetMeta = entry => `${percent(entry.used, 0)} of a ${currency(entry.budget, 0)} budget`

export default function Stats() {
	/* Which window is on screen lives in the URL, so a link to a week is a link to a week --
	   and the browser's own Back walks the pager. The width is a parameter of its own because
	   it is what the arrows step: a link naming a week but not the width would page it a month
	   at a time. `period` is still a month id where the window is a month, so every link that
	   was ever shared to a month still opens that month. */
	const [params, setParams] = useSearchParams()
	const range = params.get('range') ?? 'month'
	const periodId = params.get('period') ?? ''
	// 'all' has one window and nothing before it to compare against, so the URL cannot hold a
	// choice that width has no use for -- the same reason 'previous', not 'year', is the one
	// that never appears in the address bar.
	// Named compareMode, not compare: the render callback below already has its own `compare`
	// (the chart's sampled previous-window series), and shadowing it silently broke the
	// switch's own selected state -- neither button ever matched a value that was actually the
	// chart's series array, not 'previous'/'year'.
	const compareMode = params.get('compare') === 'year' ? 'year' : 'previous'
	const state = useApi(getStats, [range, periodId, compareMode])

	const show = (width, id, options) => setParams({
		...(width === 'month' ? {} : { range: width }),
		...(id && id !== defaultIdFor(width) ? { period: id } : {}),
		...(compareMode !== 'previous' && width !== 'all' ? { compare: compareMode } : {})
	}, options)

	const setCompare = mode => setParams({
		...(range === 'month' ? {} : { range }),
		...(periodId ? { period: periodId } : {}),
		...(mode !== 'previous' ? { compare: mode } : {})
	})

	return (
		<Page variant="page-grid">
			<Async state={state} label="Loading your statistics"
				skeleton={<>
					<SkeletonBlock width={180} height={34} style={{ margin: '4px 0 18px' }} />
					<SkeletonKpiRow />
					<SkeletonCard bodyHeight={210} />
				</>}>{({ window: view, newer, older }) => {
				/* One scale for both lines, and the running total the figure above the chart
				   states is the line itself -- a chart drawn from other numbers than the ones
				   printed beside it cannot fail visibly. README: Charts. */
				const buckets = bucketsFor(view.range, view.axis, view.series.current.length)
				const points = sampled(view.series.current, buckets)
				const compare = view.series.previous && sampled(view.series.previous, buckets)
				// Real day offsets, not point index: a bucketed point stands for a whole month,
				// and its x has to land on the day-numbered line the axis marks below share.
				const dayOf = Array.isArray(buckets) ? buckets : points.map((_, i) => i)
				const chartData = points.map((y1, i) => ({ x: dayOf[i], y1, ...(compare ? { y2: compare[i] } : {}) }))
				const chartToday = view.todayIndex == null ? null
					: bucketOf(view.todayIndex, view.series.current.length, buckets)

				/* The Where it went legend, folded to the account's own card length -- foldForRing
				   reads `spend`, and the fold row is the one entry with no `amount` of its own. */
				const split = foldForRing(
					view.split.map(entry => ({ ...entry, spend: entry.amount })), view.cardRows)

				/* The window's own read on itself, in one sentence: what it's measured against
				   (nothing to say for the oldest window there is), how many orders, how much of
				   the window has records. All three are said once, here, so the tiles below
				   only ever need a bare percent rather than each repeating "vs Aug" beside
				   their own figure. */
				const daysNote = view.pace.running
					? `${plural(view.pace.daysIn, 'day')} in`
					: `${plural(view.pace.daysIn, 'day')} of records`
				const heroCaption = [
					view.deltaLabel ? `${view.deltaLabel} vs ${view.previousLabel}` : null,
					plural(view.orders, 'order'),
					daysNote
				].filter(Boolean).join(sep)

				return (
					<>
						<div className="stats-hero-row">
							<section className="card card-ai stats-hero" aria-label="This window">
								<div className="stats-hero-pager">
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
									    and the stylesheet renders exactly one. */}
									<span className="panel-heading pager-heading">
										<span className="pager-wide">{view.label}</span>
										<span className="pager-narrow">{view.abbr}</span></span>
									<IconButton icon="chevronRight"
										label={newer ? `Next ${view.unit}` : `No later ${view.unit}`}
										disabled={!newer} className="pager-arrow"
										onClick={() => newer && show(view.range, newer)} />
									{/* The five widths, as a picker rather than five buttons -- the pager and
									    the width it steps are one control, and the window on screen converts
									    straight to whichever width is picked: Month while paged back to 2022
									    opens December 2022 rather than this month, so moving one never
									    silently discards where the other was. The one dropdown pattern in the
									    app (README: Combobox) rather than a second kind of picker; nothing
									    here is typed into, so onChange is a no-op and onSelect is the only
									    thing that ever moves the window. */}
									<Combobox className="stats-window-select" label="Window width" pickOnly
										value={ranges.find(r => r.key === view.range)?.label ?? ''}
										onChange={() => {}}
										onSelect={o => show(o.id, reanchor(view, o.id))}
										groups={[{ heading: '', options: ranges.map(r => ({ id: r.key, label: r.label })) }]} />
								</div>
								<div className="stats-hero-total tabular-figures">{currency(view.spent)}</div>
								<p className="stats-hero-caption">{heroCaption}</p>
								{/* 'All time' has no earlier window and no same-time-last-year to hold itself
								    against -- every delta on the page is already null for it -- so the switch
								    that picks between the two would offer a choice this width cannot answer. */}
								{view.range !== 'all'
									? <Segmented options={COMPARE_OPTIONS} value={COMPARE_LABEL[compareMode]}
										onChange={label => setCompare(COMPARE_CODE[label])}
										label="Compare statistics to" />
									: null}
							</section>

							{/* The tiles are the window's -- every one of the four is derived from the
							    same days the total above is. Each carries a bare percentage now, not a
							    repeat of what it's compared to: that sentence is the hero's, said once. */}
							<div className="kpi-row">
								{view.kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
							</div>
						</div>

						<Card aria-label="Overview">
							<CardHeader title={`Overview${sep}${view.shortLabelFull}`}>
								{view.previousLabel
									? <span className="field-help">vs {view.previousLabel}</span>
									: null}
							</CardHeader>
							<CardDivider />
							<CardBody variant="card-body-tight">
								{/* Today only on the current window's own line, and only where it holds one:
								    this is the page with a pager, so the same chart draws a month that ended
								    in March. Never on the dashed line -- that is the window before, whose
								    days are not today's. README: Charts. */}
								<SpendChart data={chartData} days={view.series.current.length} from={view.from}
									marks={view.axis} height={210} todayIndex={chartToday} yFormat={compactAmount}
									label={`Cumulative spend across ${view.shortLabelFull}${compare ? `, ${view.previousLabel} dashed behind it` : ''}, y-axis in ${currencySymbol()}`}
									series={[
										{ key: 'current', dataKey: 'y1', name: view.shortLabelFull, color: 'var(--green)',
											area: true, strokeWidth: 2.4, today: true },
										...(compare ? [{ key: 'previous', dataKey: 'y2', name: view.previousLabel,
											color: 'var(--green-light)', dash: '4 4', strokeWidth: 1.6 }] : [])
									]} />
							</CardBody>
						</Card>

						<div className="two-column">
							{/* The four cards under the chart, every one of them the window's. Each says
							    which stretch it is about in its own heading, rather than borrowing the
							    one over the tiles, because a card that names nothing is a card a reader
							    has to scroll up to date. */}
							<Card aria-label="Pace">
								<CardHeader title={`Pace${sep}${view.shortLabelFull}`}>
									<span className="field-help">{plural(view.pace.daysIn, 'day')} in</span>
								</CardHeader>
								<CardDivider />
								<CardBody>
									<div className="figure-large tabular-figures">{currency(view.pace.projected, 0)}</div>
									{/* A projection only where there is something left to project: the newest
									    window is the one still being written, and everywhere else this figure
									    is the total itself and says so. */}
									<span className="field-help">
										{view.pace.running
											? `projected for ${view.label}${sep}${currency(view.spent)} spent so far`
											: `total for ${view.label}${sep}${plural(view.pace.daysIn, 'day')} of records`}</span>
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
										ariaLabel={`Spent ${currency(view.spent, 0)} of ${view.pace.running ? 'a projected ' : ''}${currency(view.pace.projected, 0)}`
											+ (view.previousTotal != null ? `; the marker is where ${view.previousLabel} ended` : '')} />
									{/* fullStop rather than a written "." : the amount closes this sentence, and
									    whether it needs a stop is the currency's business -- "20.680 kr." carries
									    one and "$20.680" does not. Written here, it printed "20.680 kr.."; deleted
									    here, it left every prefix currency unpunctuated. */}
									{view.previousTotal != null
										? <span className="field-help field-help-below">
											The marker is where {view.previousLabel} ended: {currency(view.previousTotal, 0)}{fullStop()}</span>
										: null}
								</CardBody>
							</Card>

							<Card aria-label="Weekly rhythm">
								<CardHeader title={`Weekly rhythm${sep}${view.shortLabelFull}`} />
								<CardDivider />
								<CardBody>
									<div className="figure-large tabular-figures">{view.rhythm.weekendShare}%{' '}
										<span className="figure-unit">
											of spend happens on weekends</span></div>
									{/* The bars already carry this: the peak fill is the visible answer to
									    "which day", so the sentence is only left as this row's aria-label
									    now rather than printed twice. */}
									<WeekdayBars days={view.rhythm.weekdays} className="rhythm-bars"
										ariaLabel={view.rhythm.busiestDay ? `Busiest day: ${view.rhythm.busiestDay}` : undefined} />
								</CardBody>
							</Card>
						</div>

						<div className="two-column">
							<Card aria-label="Where it went">
								{/* The basis for every "% of budget" in the rows below, said once. */}
								<CardHeader title={`Where it went${sep}${view.shortLabelFull}`}>
									{view.budgets.total
										? <span className="field-help">{budgetBasis(view.budgets)}</span>
										: null}
								</CardHeader>
								<CardDivider />
								<CardBody variant="ring-row">
									{/* The ring and the rows are one list of numbers: the segments are the
									    shares the amounts beside them make, so a ring drawn from all-time
									    category totals over a month's legend cannot happen again. */}
									<SpendGauge segments={split.map(entry =>
										({ share: entry.share, colour: entry.colour }))}
										value={currency(view.spent, 0)} label={view.shortLabelFull}
										ariaLabel={`Category split of ${currency(view.spent, 0)} in ${view.label}`} />
									<div className="chart-legend chart-legend-fill">
										{split.map(entry => (
											/* The row names a category and states the window's amount for it, so
											   the link carries both: an unfiltered list, or the category across
											   all time, is a link that does not go where the row says. The split's
											   "Without category" remainder has a null id and filters as `none` --
											   the window's orders with no category at all. The fold row stands for
											   several categories at once, so it opens the whole window instead. */
											<LegendRow key={entry.name} colour={entry.colour} title={entry.name}
												meta={entry.amount == null ? undefined : splitBudgetMeta(entry)}
												amount={currency(entry.spend, 0)}
												to={'/orders/all?'
													+ (entry.amount == null ? '' : `category=${entry.id ?? 'none'}&`)
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

						{/* The budgets, on the window's own scale.

						    A budget is a monthly allowance and this page draws five widths, so one of
						    the two has to be converted before they can be printed in one sentence.
						    Longer than a month, the *spend* comes down to a monthly average, because
						    that is the figure a monthly budget can be read against without dividing by
						    twelve in your head; shorter, the *budget* goes down to the window's share
						    of the month, because scaling four days up to a month is a claim about days
						    that have not happened. The ratio is the same either way, so every row of
						    the card is read under the one basis its header names.
						    README: Meters and progress. */}
						<Card aria-label="Against budget">
							<CardHeader title={`Against budget${sep}${view.shortLabelFull}`}
								to={view.budgets.total ? '/categories/all' : undefined}
								label="Against budget, open all categories">
								{view.budgets.total
									? <span className="field-help">{budgetBasis(view.budgets)}</span>
									: null}
							</CardHeader>
							<CardDivider />
							<CardBody>
								{view.budgets.total ? (
									<>
										{/* Rows, and no ring over them: a budget is a ceiling on one category,
										    so the only ratio it supports is that category against its own. The
										    sum of every budget is an allowance nobody set -- a window measured
										    against it reads low whenever the quiet categories were never going
										    to be bought from, and a category far past its own budget
										    disappears into a total that looks calm.
										    README: Meters and progress. */}
										<div className="category-rows">
											{view.budgets.items.map(entry => (
												/* The row's own amount is the figure its meta line is about -- the
												   monthly average where that is what is being compared, the window's
												   spend where it is -- so the number on the right and the sentence
												   under the name are never two different periods. */
												<CategoryRow key={entry.id}
													category={{ ...entry, spend: budgetFigure(view.budgets, entry) }}
													meta={budgetMeta(entry)}
													to={ordersIn({ category: entry.id, from: view.from, to: view.to })} />
											))}
											{view.budgets.total > view.budgets.items.length
												? <span className="field-help field-help-below">
													{view.budgets.total - view.budgets.items.length} more budgeted
													categor{view.budgets.total - view.budgets.items.length === 1 ? 'y' : 'ies'}
													{sep}{view.budgets.over
														? `${view.budgets.over} over budget in ${view.label}`
														: `none over budget in ${view.label}`}</span>
												: <span className="field-help field-help-below">
													{plural(view.budgets.total, 'category', 'categories')} with a budget
													{sep}{view.budgets.over ? `${view.budgets.over} over it` : 'none over it'}</span>}
										</div>
									</>
								) : (
									/* No budgets is not no data: the card says where a budget is set rather
									   than drawing an empty list of them. README: Empty states. */
									<EmptyState>
										<p>No budgets set. Give a category a monthly budget and this card measures
											{' '}{view.label} against it.</p>
										<Button variant="block" to="/categories/all">ALL CATEGORIES</Button>
									</EmptyState>
								)}
							</CardBody>
						</Card>

						<ReturnsCard title={`Returns${sep}${view.shortLabelFull}`}
							span={view.shortLabelFull} returns={view.returns} />
					</>
				)
			}}</Async>
		</Page>
	)
}
