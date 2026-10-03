import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, Panel } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { Choice, Switch } from '../components/Choice.jsx'
import { Bars, Gauge, GaugeKey, Legend, LegendItem, Plot, ShareRow, Shares, Stat, Sum } from '../components/Data.jsx'
import { PeriodPicker, PeriodWindow, Selected } from '../components/DatePickers.jsx'
import { Icon } from '../components/Icon.jsx'
import { Caption, Foot, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Alert } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { Halves } from '../components/Well.jsx'
import { useListMemory } from '../app/listMemory.js'
import { useMedia, useShellShape, useWidth } from '../app/useMedia.js'
import { StatusPill, columnsFor, orderLine } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import { failureMessage, getCategories, getOrders, getStats } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import {
	NUMBER_LOCALE, activeLocaleCode, amount, compactAmount, currency, dot, isSaving, longDate, monthNames, percent,
	shortDate, today
} from '../api/format.js'

/* ---- windows: the ids the API pages through, worked out here so the control answers at once ---- */

const RANGES = ['week', 'month', 'quarter', 'year']
const PRESETS = [
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: 'quarter', label: 'Quarter' },
	{ value: 'year', label: 'Year' }
]
const DAY_MS = 86400000
const pad = n => String(n).padStart(2, '0')
const utcOf = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const isoOf = ms => new Date(ms).toISOString().slice(0, 10)
// the reader's own date, the one the API is told is today
const todayUtc = () => utcOf(today())
const mondayFirst = ms => (new Date(ms).getUTCDay() + 6) % 7

// ISO weeks, the same arithmetic as the API's lib/stats.js
function isoWeekOf(ms) {
	const thursday = ms + (3 - mondayFirst(ms)) * DAY_MS
	const year = new Date(thursday).getUTCFullYear()
	const jan4 = Date.UTC(year, 0, 4)
	return { year, week: Math.round((thursday - (jan4 + (3 - mondayFirst(jan4)) * DAY_MS)) / (7 * DAY_MS)) + 1 }
}
const mondayOfWeek = (year, week) => {
	const jan4 = Date.UTC(year, 0, 4)
	return jan4 - mondayFirst(jan4) * DAY_MS + (week - 1) * 7 * DAY_MS
}

function windowIdAt(range, ms) {
	const at = new Date(ms)
	if (range === 'week') { const { year, week } = isoWeekOf(ms); return `${year}-W${pad(week)}` }
	if (range === 'month') return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`
	if (range === 'quarter') return `${at.getUTCFullYear()}-Q${Math.floor(at.getUTCMonth() / 3) + 1}`
	return String(at.getUTCFullYear())
}

const ID_SHAPE = { week: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, month: /^\d{4}-(0[1-9]|1[0-2])$/, quarter: /^\d{4}-Q[1-4]$/, year: /^\d{4}$/ }

// most years have 52 ISO weeks, so a W53 is real only when its Monday reads back as the same week
const validId = (range, id) => ID_SHAPE[range].test(id ?? '')
	&& (range !== 'week' || windowIdAt('week', mondayOfWeek(Number(id.slice(0, 4)), Number(id.slice(6)))) === id)

/** The first and last day of a window, as UTC midnights. */
function boundsOf(range, id) {
	if (range === 'week') {
		const from = mondayOfWeek(Number(id.slice(0, 4)), Number(id.slice(6)))
		return [from, from + 6 * DAY_MS]
	}
	const y = Number(id.slice(0, 4))
	if (range === 'month') { const m = Number(id.slice(5)); return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 0)] }
	if (range === 'quarter') { const q = Number(id.slice(6)); return [Date.UTC(y, (q - 1) * 3, 1), Date.UTC(y, q * 3, 0)] }
	return [Date.UTC(y, 0, 1), Date.UTC(y, 11, 31)]
}

/** The same window a year earlier, which is what the switch compares with: a week keeps its number,
    and a week 53 the year before did not have is compared with that year's week 52. */
function yearEarlier(range, id) {
	const earlier = `${Number(id.slice(0, 4)) - 1}${id.slice(4)}`
	return range !== 'week' || validId('week', earlier) ? earlier : `${earlier.slice(0, 4)}-W52`
}

/** A window of another size around the same stretch: the one holding this window's last day,
    or today when this window runs past it. */
function reanchor(range, id, next) {
	const [from, to] = boundsOf(range, id)
	return windowIdAt(next, Math.max(from, Math.min(todayUtc(), to)))
}

/** "2026", "Q3 2026", "August 2026", "Week 34, 2026". */
function nameOf(range, id) {
	const y = id.slice(0, 4)
	if (range === 'week') return `Week ${Number(id.slice(6))}, ${y}`
	if (range === 'month') return `${monthNames('long')[Number(id.slice(5)) - 1]} ${y}`
	if (range === 'quarter') return `${id.slice(5)} ${y}`
	return y
}

// the stepper's own short name; its width is set by the longest month
function stepLabel(range, id) {
	if (range === 'week') return `W${Number(id.slice(6))}`
	if (range === 'month') return monthNames('long')[Number(id.slice(5)) - 1]
	if (range === 'quarter') return id.slice(5)
	return id
}

/* ---- the window's own days, cut into the columns the charts draw ---- */

// a chart stays within about ten columns (4d), so a month is drawn by its weeks
const UNIT = { week: 'day', month: 'week', quarter: 'month', year: 'month' }

const weekday = iso => new Intl.DateTimeFormat(activeLocaleCode(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(utcOf(iso)))
// "2 Oct": the compare switch already names the earlier window's year
const dayAndMonth = iso => new Intl.DateTimeFormat(activeLocaleCode(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(utcOf(iso)))
// a month's first and last weeks hold only the month's own days, so a week's column is named by its days
const daySpan = (from, to) => (from === to ? String(Number(from.slice(8))) : `${Number(from.slice(8))}-${Number(to.slice(8))}`)

/** Months for a quarter or a year, weeks for a month, days for a week, up to the one holding today
    (4a), each with its spend and saving from the API's running totals and the window a press opens. */
function chartOf(view) {
	const spend = view.series.current
	const saved = view.series.savedCumulative
	const days = spend.length
	const unit = UNIT[view.range]
	const first = utcOf(view.from)
	const starts = unit === 'month'
		? view.axis.map(mark => mark.day)
		: spend.map((unused, day) => day).filter(day => unit === 'day' || day === 0 || mondayFirst(first + day * DAY_MS) === 0)
	const between = (series, a, b) => series[b - 1] - (a > 0 ? series[a - 1] : 0)
	const columns = starts.map((start, i) => {
		const end = i + 1 < starts.length ? starts[i + 1] : days
		const at = first + start * DAY_MS
		const from = isoOf(at)
		const to = isoOf(first + (end - 1) * DAY_MS)
		const month = new Date(at).getUTCMonth()
		const week = isoWeekOf(at).week
		return {
			key: from,
			from,
			to,
			tick: unit === 'month' ? monthNames()[month] : unit === 'week' ? daySpan(from, to) : weekday(from),
			name: unit === 'month'
				? `${monthNames('long')[month]} ${new Date(at).getUTCFullYear()}`
				: unit === 'week' ? `Week ${week}, ${shortDate(from)} - ${shortDate(to)}` : longDate(from),
			open: unit === 'month' ? { range: 'month', id: windowIdAt('month', at) } : unit === 'week' ? { range: 'week', id: windowIdAt('week', at) } : null,
			spend: Math.max(0, between(spend, start, end)),
			saved: Math.max(0, between(saved, start, end)),
			running: view.todayIndex != null && view.todayIndex >= start && view.todayIndex < end,
			future: view.todayIndex != null && view.todayIndex < start
		}
	})
	return { unit, columns: columns.filter(column => !column.future) }
}

/** An axis of four even steps whose top is a round number at or above the largest value. */
function scaleFor(most) {
	if (!(most > 0)) return 4
	const raw = most / 4
	const power = 10 ** Math.floor(Math.log10(raw))
	const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * power).find(s => s >= raw)
	return step * 4
}

const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0)
const signed = (n, text) => (n > 0 ? `+${text}` : n < 0 ? `-${text}` : text)
const counted = (n, noun, nouns = `${noun}s`) => `${amount(n, 0)} ${n === 1 ? noun : nouns}`
const TOP = 8
const SLICE = 25
// the API answers at most 1000 orders at once (MAX_PAGE_SIZE)
const MOST_PAGES = 1000 / SLICE
const RETRY_COPY = 'Check your connection, then try again.'

/* useApi keeps its last answer while new arguments load or fail. This returns data only when it
   answers these arguments, so one window's figures never stand under another window's name. */
function useCurrent(fn, args, options) {
	const state = useApi(fn, args, options)
	const key = JSON.stringify(args)
	const [seen, setSeen] = useState({ data: state.data, key })
	if (seen.data !== state.data) setSeen({ data: state.data, key })
	const answers = seen.data === state.data ? seen.key : key
	const current = state.data !== undefined && answers === key && !state.loading && !state.error
	return { ...state, data: current ? state.data : undefined }
}

/* ---- the page ---- */

export default function Statistics() {
	const shape = useShellShape()
	const touch = shape === 'touch'
	// Layout rules: below 900 the paired cards stack
	const stacked = useMedia('(max-width: 899.98px)')
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const range = RANGES.includes(params.get('range')) ? params.get('range') : 'year'
	const asked = params.get('period')
	const id = validId(range, asked) ? asked : windowIdAt(range, todayUtc())
	const compareOn = params.get('compare') !== 'off'
	const comparing = compareOn && !touch
	const before = yearEarlier(range, id)
	const [fromMs, toMs] = boundsOf(range, id)
	const from = isoOf(fromMs)
	const to = isoOf(toMs)

	const stats = useCurrent(getStats, [range, id, 'previous'])
	const past = useCurrent(getStats, [range, before, 'previous'], { enabled: comparing })
	const categories = useApi(getCategories)
	const delivered = useCurrent(getOrders, [{ status: 'Delivered', from, to, pageSize: 1 }])
	const ordered = useCurrent(getOrders, [{ status: 'Ordered', from, to, pageSize: 1 }])
	const returned = useCurrent(getOrders, [{ status: 'Returned', from, to, pageSize: 1 }])

	// a window still running is compared with the same number of days of the earlier one
	const pace = stats.data?.window.pace
	const [pastFrom, pastTo] = boundsOf(range, before)
	const sameDays = pace?.running ? Math.min(pace.daysIn, Math.round((pastTo - pastFrom) / DAY_MS) + 1) : null
	const pastLast = isoOf(pastFrom + ((sameDays ?? 1) - 1) * DAY_MS)
	const toDate = useCurrent(getOrders, [{ from: isoOf(pastFrom), to: pastLast, pageSize: 1 }], { enabled: comparing && sameDays != null })

	/* The table pages on the server; the pages already shown are kept for this window only. Back to
	   this step asks for every page the reader had open in one answer, then Load more one at a time. */
	const { pages, setPages, restored } = useListMemory('orders')
	const slice = `${from}/${to}`
	const [more, setMore] = useState({ slice, pages: [], count: 0 })
	const kept = more.slice === slice ? more : { pages: [], count: 0 }
	const earlier = kept.pages
	const first = Math.min(pages, MOST_PAGES)
	const ask = kept.count ? { page: kept.count + 1, pageSize: SLICE } : { page: 1, pageSize: SLICE * first }
	const next = useCurrent(getOrders, [{ from, to, ...ask }], { enabled: !touch })
	const loadMore = () => {
		if (next.error) return next.refresh()
		if (!next.data) return
		setMore({ slice, pages: [...earlier, next.data], count: kept.count ? kept.count + 1 : first })
		setPages(n => n + 1)
	}
	// the window goes back to where the reader left it once the rows are drawn, or there are none to draw
	const drawn = !!stats.error || (!!stats.data && (touch || !stats.data.window.orders || !!next.data || !!next.error))
	useLayoutEffect(() => { if (drawn) restored() }, [drawn, restored])

	const retry = () => {
		for (const call of [stats, past, toDate, categories, delivered, ordered, returned, next]) if (call.error) call.refresh()
	}

	// the URL holds only what differs from the page's own default
	const show = (nextRange, nextId, nextComparing = compareOn) => setParams({
		...(nextRange === 'year' ? {} : { range: nextRange }),
		...(nextId === windowIdAt(nextRange, todayUtc()) ? {} : { period: nextId }),
		...(nextComparing ? {} : { compare: 'off' })
	})
	const open = target => show(target.range, target.id)

	// until the API answers for this window, the stepper stays live on the calendar alone, so it keeps its focus
	const older = stats.data ? stats.data.older : windowIdAt(range, fromMs - DAY_MS)
	const newer = stats.data ? stats.data.newer : toMs < todayUtc() ? windowIdAt(range, toMs + DAY_MS) : null

	const period = (
		<PeriodPicker
			name="statistics-period"
			presets={PRESETS}
			value={range}
			at={from}
			locale={activeLocaleCode()}
			onChange={({ period: nextRange }) => show(nextRange, reanchor(range, id, nextRange))}
			onPresent={() => show(range, windowIdAt(range, todayUtc()))}
			stepper={(
				<PeriodWindow
					touch={touch}
					unit={range}
					label={stepLabel(range, id)}
					previousLabel={`Previous ${range}`}
					nextLabel={`Next ${range}`}
					onPrevious={older ? () => show(range, older) : undefined}
					onNext={newer ? () => show(range, newer) : undefined}
				/>
			)}
		>
			{touch
				? null
				: (
					<Selected>
						{shape => (
							<Choice control={<Switch checked={compareOn} onChange={ev => show(range, id, ev.target.checked)} />}>
								Compare with {nameOf(range, yearEarlier(range, windowIdAt(range, Date.parse(shape.selected.from + 'T00:00:00Z'))))}
							</Choice>
						)}
					</Selected>
				)}
		</PeriodPicker>
	)

	if (stats.error) {
		return (
			<>
				{period}
				<Empty dashed>
					<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
					<EmptyTitle>Your statistics could not be shown</EmptyTitle>
					<EmptyBody>{failureMessage(stats.error, RETRY_COPY)}</EmptyBody>
					<Button variant="outline" onClick={retry}>Try again</Button>
				</Empty>
			</>
		)
	}

	const name = nameOf(range, id)
	if (!stats.data) {
		const running = fromMs <= todayUtc() && todayUtc() <= toMs
		return arrange({ shape, stacked, period, ...busyParts({ range, name, running, touch, comparing, categories }) })
	}

	const view = stats.data.window

	if (!view.orders) {
		// with no window on either side there are no orders at all yet (6a)
		if (!older && !newer) {
			return (
				<>
					{period}
					<Card variant="flush">
						<Empty>
							<Mark size="large" aria-hidden="true" aria-label="Receipt"><Icon name="receipt" size={26} /></Mark>
							<EmptyTitle>No orders yet</EmptyTitle>
							<EmptyBody>Drop a receipt and the vendor, date and lines are filled in for you. Or start an empty order and type it yourself.</EmptyBody>
							<div className="sp-row-flex sp-gap-8">
								<Button size="small" to="/orders/new?source=scan">Scan a receipt</Button>
								<Button variant="outline" size="small" to="/orders/new">Empty order</Button>
							</div>
						</Empty>
					</Card>
				</>
			)
		}
		return (
			<>
				{period}
				<Empty dashed>
					<EmptyTitle>No orders in {name}</EmptyTitle>
					<EmptyBody>Choose another period above, or add an order.</EmptyBody>
					<Button variant="outline" to="/orders/new">New order</Button>
				</Empty>
			</>
		)
	}

	const chart = chartOf(view)
	const wasName = nameOf(range, before)
	const was = !comparing || !past.data
		? null
		: sameDays == null
			? past.data.window
			: toDate.data ? sameDaysOf(past.data.window, sameDays, toDate.data.matched) : null
	const compareFailed = comparing && (past.error || toDate.error)
	const failedNotice = compareFailed
		? (
			<Alert color="danger" mark="!" title={`${wasName} did not load`} action={<Button variant="outline" size="small" onClick={retry}>Try again</Button>}>
				The figures are shown without the comparison.
			</Alert>
		)
		: null

	// an order added while paging shifts the pages by one, so a row can arrive twice
	const rows = [...new Map([...earlier.flatMap(page => page.orders), ...(next.data?.orders ?? [])].map(order => [order.id, order])).values()]

	return arrange({
		shape,
		stacked,
		period,
		notice: failedNotice,
		kpis: (
			<Kpis view={view} chart={chart} was={was} by={sameDays == null ? null : dayAndMonth(pastLast)}
				waiting={comparing && !was && !compareFailed} touch={touch} />
		),
		chart: <SpendChart range={range} chart={chart} touch={touch} onOpen={open} />,
		byCategory: touch
			? <CategoryRows key={`category ${view.id}`} view={view} />
			: <CategoryShares view={view} onOpen={category => navigate(`/orders?category=${category ?? 'none'}&from=${view.from}&to=${view.to}`)} />,
		byStatus: <StatusCard total={view.orders} counts={[['Delivered', delivered], ['Ordered', ordered], ['Returned', returned]]} onRetry={retry} />,
		vendors: <VendorsCard key={`vendors ${view.id}`} view={view} name={name} touch={touch} />,
		saving: <SavingChart chart={chart} name={name} touch={touch} onOpen={open} />,
		limits: <LimitCard range={range} view={view} name={name} categories={categories} touch={touch} onRetry={retry} />,
		slice: touch
			? <SliceCard view={view} />
			: (
				<OrdersTable
					view={view}
					rows={rows}
					matched={next.data?.matched ?? earlier.at(-1)?.matched}
					failed={next.error}
					onLoadMore={loadMore}
					onRetry={retry}
				/>
			)
	})
}

/** The earlier window cut to its first `days` days: its running totals give spend and saving, and
    the count of its orders in those days comes from the order list. */
function sameDaysOf(window, days, orders) {
	const spent = window.series.current[days - 1] ?? 0
	return { spent, saved: window.series.savedCumulative[days - 1] ?? 0, orders, average: orders ? spent / orders : 0 }
}

/** Where each card sits: beside the chart on a wide screen, in pairs on a narrower one, and one
    column below 900 and on a phone. */
function arrange({ shape, stacked, period, notice = null, kpis, chart, byCategory, byStatus, vendors, saving, limits, slice }) {
	const figures = <div className="os-stats">{kpis}</div>
	// the period control stays first in every state, so it keeps its focus while a window loads
	if (shape === 'touch' || stacked) return <>{period}{notice}{figures}{chart}{byCategory}{byStatus}{vendors}{saving}{limits}{slice}</>
	return (
		<>
			{period}
			{notice}
			{figures}
			{shape === 'wide'
				? <div className="sp-shell__body--split">{chart}<Panel>{byCategory}{byStatus}</Panel></div>
				: <>{chart}<Halves cards>{byCategory}{byStatus}</Halves></>}
			<Halves>
				<div className="sp-stack sp-gap-12">{vendors}{saving}</div>
				{limits}
			</Halves>
			{slice}
		</>
	)
}

/* ---- the frames before the figures land (6b): the loaded layout's own cards, empty ---- */

// two figure spaces and an en space are as wide as a label like "60k", so the axis keeps its width
const AXIS_HOLD = Array.from({ length: 5 }, () => '   ')
const WIDTHS = ['96', '76', '88', '64', '104', '70', '82', '58', '92']

/** A skeleton bar on the line of text it stands in for, at that text's own height (6b). */
const hold = (w, h = '13', shape = 'line') => <span className="sp-row-flex"><Skeleton shape={shape} data-w={w} data-h={h} />{'​'}</span>

/** A skeleton over the outline button it stands in for, which is kept unseen beneath it so its size holds. */
const buttonHold = key => (
	<span className="os-hold" key={key}>
		<span className="os-ghost" aria-hidden="true"><Button variant="outline" size="small">Show all</Button></span>
		<span className="os-over"><Skeleton shape="bar" /></span>
	</span>
)

function busyParts({ range, name, running, touch, comparing, categories }) {
	const pending = { data: undefined, error: null }
	// the account's categories bound a breakdown's length before its window answers
	const known = categories.data?.length
	return {
		kpis: ['Total spend', 'Orders', 'Average order', 'Saved'].map((label, i) => (
			<Card key={label} aria-busy="true">
				<Stat label={label} figure={hold('104', '22')} />
				{comparing ? <Skeleton shape="pill" /> : null}
				{!touch && (i === 0 || i === 3) ? <Bars variant="spark" loading /> : null}
			</Card>
		)),
		chart: <SpendChart range={range} running={running} touch={touch} />,
		byCategory: touch ? <CategoryRows known={known} /> : <CategoryShares known={known} />,
		byStatus: <StatusCard counts={[['Delivered', pending], ['Ordered', pending], ['Returned', pending]]} />,
		vendors: <VendorsCard name={name} touch={touch} />,
		saving: <SavingChart name={name} touch={touch} />,
		limits: <LimitCard range={range} name={name} running={running} categories={categories} touch={touch} />,
		slice: touch ? <SliceCard /> : <OrdersTable rows={[]} />
	}
}

/* ---- cards ---- */

/** A card whose figures did not load, and the way to ask again. */
function Failed({ label, what, error, onRetry }) {
	return (
		<Card footer={[<Button key="retry" variant="outline" size="small" onClick={onRetry}>Try again</Button>]}>
			<span className="sp-section-label">{label}</span>
			<Alert color="danger" mark="!" title={what}>{failureMessage(error, RETRY_COPY)}</Alert>
		</Card>
	)
}

// on touch a figure card is its label and figure only (Mobile screens 7a)
function Kpis({ view, chart, was, by, waiting, touch }) {
	const shown = chart.columns
	const spark = (key, label) => {
		const most = Math.max(...shown.map(column => column[key]), 0)
		if (touch) return null
		return (
			<Bars
				variant="spark"
				role="img"
				aria-label={label}
				columns={shown.map((column, i) => ({ key: column.key, height: share(column[key], most), muted: i < shown.length - 1 }))}
			/>
		)
	}
	const compared = line => (was ? line(was) : waiting ? <Skeleton shape="pill" /> : null)
	// a phone tile draws the figure without its currency (Mobile screens 7a), so a million still fits on one line
	const figure = n => (touch ? amount(n, 0) : currency(n, 0))
	// a change against nothing has no percentage, so it reads as a dash (Actions inventory)
	const rise = (now, then) => (then ? signed(now - then, percent(Math.abs(share(now - then, then)), 1)) : '-')
	const cost = (now, then) => (!then || now === then ? 'default' : now > then ? 'danger' : 'success')
	return [
		<Card key="spend">
			<Stat label="Total spend" figure={figure(view.spent)} />
			{compared(then => <Change tone={cost(view.spent, then.spent)} against={currency(then.spent, 0)} by={by}>{rise(view.spent, then.spent)}</Change>)}
			{spark('spend', `Total spend in each ${chart.unit}`)}
		</Card>,
		<Card key="orders">
			<Stat label="Orders" figure={amount(view.orders, 0)} />
			{compared(then => (
				<Change tone={view.orders > then.orders ? 'success' : 'default'} against={amount(then.orders, 0)} by={by}>
					{signed(view.orders - then.orders, amount(Math.abs(view.orders - then.orders), 0))}
				</Change>
			))}
		</Card>,
		<Card key="average">
			<Stat label="Average order" figure={figure(view.average)} />
			{compared(then => (
				<Change state={then.average && Math.round(view.average) !== Math.round(then.average) ? 'progress' : undefined} against={currency(then.average, 0)} by={by}>
					{rise(view.average, then.average)}
				</Change>
			))}
		</Card>,
		<Card key="saved">
			<Stat label="Saved" color={isSaving(view.saved, 0) ? 'success' : 'zero'} figure={figure(view.saved)} />
			{compared(then => (
				<Change tone={view.saved > then.saved ? 'success' : 'default'} against={currency(then.saved, 0)} by={by}>
					{signed(view.saved - then.saved, currency(Math.abs(view.saved - then.saved), 0))}
				</Change>
			))}
			{spark('saved', `Saved in each ${chart.unit}`)}
		</Card>
	]
}

/** How a figure moved since the window it is compared with, and that window's own figure: up to
    the same day of it, `by`, while this window is still running. */
function Change({ tone = 'default', state, against, by, children }) {
	return (
		<div className="sp-row-flex sp-gap-8">
			<Pill color={tone} state={state}>{children}</Pill>
			<span className="sp-meta">vs {against}{by ? ` by ${by}` : ''}</span>
		</div>
	)
}

/** A bar's height is a share of its whole column, tick included: this is the part above the tick. */
function useFit(bars, layout) {
	const [fit, setFit] = useState(1)
	useLayoutEffect(() => {
		const column = bars.current?.firstElementChild
		const tick = column?.lastElementChild
		if (!column?.clientHeight || !tick) return
		setFit((column.clientHeight - tick.offsetHeight - parseFloat(getComputedStyle(column).rowGap)) / column.clientHeight)
	}, [bars, layout])
	return fit
}

// on a phone twelve months are cut to their first letter (Mobile screens 7a); the bar keeps its full name
const tickOf = (chart, column, touch) => (touch && chart.unit === 'month' && chart.columns.length > 6 ? column.tick.slice(0, 1) : column.tick)

function SpendChart({ range, chart, running: soon, touch, onOpen }) {
	const unit = UNIT[range]
	const columns = chart?.columns ?? []
	const top = scaleFor(Math.max(...columns.map(column => column.spend)))
	const bars = useRef(null)
	const fit = useFit(bars, `${touch} ${columns.length}`)
	// before the window answers, the calendar says whether it is still running
	const running = chart ? columns.some(column => column.running) : soon
	const drawn = columns.map(column => ({
		key: column.key,
		from: column.from,
		to: column.to,
		label: `${column.name}, ${currency(column.spend, 0)}`,
		height: share(column.spend, top) * fit,
		muted: column.running,
		tick: tickOf(chart, column, touch)
	}))
	const select = unit === 'day' ? undefined : key => onOpen(columns.find(column => column.key === key).open)
	const current = columns.find(column => column.running)?.key
	return (
		<Card aria-busy={chart ? undefined : 'true'}>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Spend by {unit}</span>
				<span className="sp-grow" />
				{running
					? (
						<Legend>
							<LegendItem series={1}>Spend</LegendItem>
							<LegendItem series={4}>Not yet complete</LegendItem>
						</Legend>
					)
					: null}
			</div>
			{touch
				? <Bars ref={bars} columns={drawn} current={current} onSelect={select} loading={!chart} />
				: (
					<Plot axis={chart ? [4, 3, 2, 1, 0].map(step => compactAmount((top / 4) * step)) : AXIS_HOLD} gridlines={5}>
						<Bars ref={bars} variant="plot" columns={drawn} current={current} onSelect={select} loading={!chart} />
					</Plot>
				)}
		</Card>
	)
}

/** The top three categories and one line for the rest, which opens nothing (4d). */
function CategoryShares({ view, known, onOpen }) {
	if (!view) {
		return (
			<Card aria-busy="true">
				<span className="sp-section-label">By category</span>
				<Shares aria-hidden="true">
					{WIDTHS.slice(0, Math.min(4, Math.max(1, known ?? 4))).map((w, i) => (
						<ShareRow key={w} series={i + 1} value={hold('18')} disabled>{hold(w)}</ShareRow>
					))}
				</Shares>
			</Card>
		)
	}
	const split = view.split
	const rest = split.slice(3)
	const folded = rest.length > 1
	const shown = folded ? split.slice(0, 3) : split
	return (
		<Card>
			<span className="sp-section-label">By category</span>
			<Shares>
				{shown.map((entry, i) => (
					<ShareRow key={entry.id ?? 'none'} series={i + 1} value={`${Math.round(entry.share)}%`} onClick={() => onOpen(entry.id)}>
						{entry.name}
					</ShareRow>
				))}
				{folded
					? (
						<ShareRow series={4} value={`${Math.round(rest.reduce((sum, entry) => sum + entry.share, 0))}%`} aria-disabled="true">
							Other {counted(rest.length, 'category', 'categories')}
						</ShareRow>
					)
					: null}
			</Shares>
		</Card>
	)
}

/** A ranked list with a bar under each line: the top eight and one line for the rest, or all of
    them in a region that scrolls inside the card (4d). With no entries yet, `rows` skeleton lines. */
function Ranked({ entries, rows = TOP + 1, noun, touch, open }) {
	if (!entries) {
		return WIDTHS.slice(0, rows).map(w => (touch
			? (
				<div className="sp-stack" key={w} aria-hidden="true">
					<Sum value={hold('44')}>{hold(w)}</Sum>
					<Gauge thin value={0} />
				</div>
			)
			: (
				<div className="sp-stack sp-gap-6" key={w} aria-hidden="true">
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-data">{hold(w)}</span>
						<span className="sp-grow" />
						<span className="sp-amount">{hold('76')}</span>
					</div>
					<Gauge value={0} />
				</div>
			)))
	}
	const rest = entries.slice(TOP)
	const folded = !open && rest.length > 1
	const lines = folded
		? [...entries.slice(0, TOP), { id: 'other', other: true, name: `Other ${amount(rest.length, 0)} ${noun}`, amount: rest.reduce((sum, entry) => sum + entry.amount, 0) }]
		: entries
	// the remainder can outweigh the top entry, so each bar is a share of the largest line shown
	const most = Math.max(...lines.map(entry => entry.amount), 0)
	const drawn = lines.map(entry => (touch
		? (
			<div className="sp-stack" key={entry.id ?? 'none'}>
				<Sum value={amount(entry.amount, 0)}>{entry.other ? <span className="sp-subtitle">{entry.name}</span> : entry.name}</Sum>
				<Gauge thin value={share(entry.amount, most)} remainder={entry.other} aria-label={entry.name} />
			</div>
		)
		: (
			<div className="sp-stack sp-gap-6" key={entry.id ?? 'none'}>
				<div className="sp-row-flex sp-gap-8">
					<span className={entry.other ? 'sp-data sp-subtitle' : 'sp-data'}>{entry.name}</span>
					<span className="sp-grow" />
					<span className="sp-amount">{currency(entry.amount, 0)}</span>
				</div>
				<Gauge value={share(entry.amount, most)} remainder={entry.other} aria-label={entry.name} />
			</div>
		)))
	return open ? <div className="os-scroll sp-scrolls">{drawn}</div> : drawn
}

/** The card's footer: the way to every line once there are more than the resting nine. */
function moreFooter(entries, count, noun, open, setOpen) {
	if (count <= TOP + 1) return null
	if (!entries) return [buttonHold('all')]
	return [<ShowAll key="all" open={open} onClick={() => setOpen(!open)} count={count} noun={noun} />]
}

function CategoryRows({ view, known }) {
	const [open, setOpen] = useState(false)
	const entries = view?.split
	const count = entries ? entries.length : known ?? TOP + 2
	return (
		<Card aria-busy={entries ? undefined : 'true'} footer={moreFooter(entries, count, 'categories', open, setOpen)}>
			<span className="sp-section-label">By category</span>
			<Ranked entries={entries} rows={Math.min(count, TOP + 1)} noun="categories" touch open={open} />
		</Card>
	)
}

function ShowAll({ open, onClick, count, noun }) {
	return (
		<Button variant="outline" size="small" onClick={onClick}>
			{open ? `Show top ${TOP} only` : `Show all ${amount(count, 0)} ${noun}`}
		</Button>
	)
}

function VendorsCard({ view, name, touch }) {
	const [open, setOpen] = useState(false)
	const vendors = view?.vendorSplit
	// before the window answers, the card holds its resting cap: eight, the rest, and the way to all
	const count = vendors ? vendors.length : TOP + 2
	return (
		<Card aria-busy={vendors ? undefined : 'true'} footer={moreFooter(vendors, count, 'vendors', open, setOpen)}>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Top vendors</span>
				<span className="sp-grow" />
				<span className="sp-meta">{name}</span>
			</div>
			<Ranked entries={vendors} noun="vendors" touch={touch} open={open} />
		</Card>
	)
}

function StatusCard({ total, counts, onRetry }) {
	const failed = counts.find(([, state]) => state.error)
	if (failed) return <Failed label="By status" what="The counts by status did not load." error={failed[1].error} onRetry={onRetry} />
	const busy = counts.some(([, state]) => !state.data)
	return (
		<Card aria-busy={busy ? 'true' : undefined}>
			<span className="sp-section-label">By status</span>
			{counts.map(([status, state]) => {
				const count = state.data?.matched
				return (
					<div className="sp-stack sp-gap-6" key={status}>
						<div className="sp-row-flex sp-gap-8">
							<span className="sp-data">{status}</span>
							<span className="sp-grow" />
							{count == null
								? <span className="sp-amount">{hold('44')}</span>
								: (
									<>
										<span className="sp-amount">{amount(count, 0)}</span>
										<span className="sp-meta">{Math.round(share(count, total))}%</span>
									</>
								)}
						</div>
						<Gauge value={share(count ?? 0, total)} aria-label={status} />
					</div>
				)
			})}
		</Card>
	)
}

function SavingChart({ chart, name, touch, onOpen }) {
	const columns = chart?.columns
	const most = Math.max(...(columns ?? []).map(column => column.spend), 0)
	return (
		<Card aria-busy={chart ? undefined : 'true'}>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Spend vs saving</span>
				<span className="sp-grow" />
				<span className="sp-meta">{name}</span>
			</div>
			{chart
				? (
					<Bars
						columns={columns.map(column => ({
							key: column.key,
							from: column.from,
							to: column.to,
							label: `${column.name}, paid ${currency(column.spend, 0)}, saved ${currency(column.saved, 0)}`,
							pair: [share(column.spend, most), share(column.saved, most)],
							tick: tickOf(chart, column, touch)
						}))}
						current={columns.find(column => column.running)?.key}
						onSelect={chart.unit === 'day' ? undefined : key => onOpen(columns.find(column => column.key === key).open)}
					/>
				)
				: <Bars loading />}
			<Legend>
				<LegendItem series={1}>Paid</LegendItem>
				<LegendItem series={4}>Saved</LegendItem>
			</Legend>
		</Card>
	)
}

/* How many categories had a limit when this tab last knew, so a fresh load holds that many rows. */
const LIMITED = 'spendly:limited'
const rememberedLimits = () => { try { return Number(sessionStorage.getItem(LIMITED)) || 0 } catch { return 0 } }
const rememberLimits = n => { try { sessionStorage.setItem(LIMITED, String(n)) } catch { /* storage denied */ } }

function LimitCard({ range, view, name, running, categories, touch, onRetry }) {
	const edit = <Button key="edit" variant="outline" size="small" to="/categories">Edit on category</Button>
	// a phone button takes the full width, so there it sits in the card's footer rather than squeezing the label
	const head = (
		<div className="sp-row-flex sp-gap-12">
			<span className="sp-section-label">Monthly limit</span>
			<span className="sp-grow" />
			{touch ? null : edit}
		</div>
	)
	const limited = categories.data?.filter(category => category.budget > 0)
	useEffect(() => { if (limited) rememberLimits(limited.length) }, [limited?.length])
	if (categories.error) return <Failed label="Monthly limit" what="The limits did not load." error={categories.error} onRetry={onRetry} />
	const footer = touch ? [edit] : null
	// the limits set the card's length, so until they answer it holds the rows last seen, else two lines
	const held = limited ? limited.length : rememberedLimits()
	if (!limited && !held) return <Card aria-busy="true" footer={footer}>{head}<Skeleton shape="line" /><Skeleton shape="short" /></Card>
	if (limited && !limited.length) {
		return (
			<Card footer={footer}>
				{head}
				<span className="sp-meta">No category has a monthly limit yet. Give one a limit, and this card shows how close you are.</span>
			</Card>
		)
	}
	const note = range === 'month'
		? 'Each category has one limit that applies to every month.'
		: `Each category has one limit that applies to every month. The amounts below cover ${name}.`
	if (!view || !limited) {
		return (
			<Card aria-busy="true" footer={footer}>
				{head}
				<span className="sp-meta">{note}</span>
				{running ?? view?.pace.running
					? <ListItem aria-hidden="true"><span className="sp-data">{hold('130')}</span><span className="sp-grow" /><span className="sp-amount">{hold('18')}</span></ListItem>
					: null}
				{Array.from({ length: held }, (unused, i) => (
					<div className="sp-stack sp-gap-6" key={i} aria-hidden="true">
						<div className="sp-row-flex sp-gap-8">
							<span className="sp-data">{hold(WIDTHS[i % WIDTHS.length])}</span>
							<span className="sp-grow" />
							<span className="sp-amount">{hold('104')}</span>
						</div>
						<Gauge value={0} />
						<span className="sp-meta">{hold('88', '11')}</span>
					</div>
				))}
				<div className="sp-card__footer" aria-hidden="true">
					<span className="sp-data">All categories</span>
					<span className="sp-grow" />
					<span className="sp-amount">{hold('104')}</span>
				</div>
				{running ?? view?.pace.running ? <div className="sp-row-flex sp-gap-8" aria-hidden="true"><GaugeKey /><span className="sp-meta">{hold('130', '11')}</span></div> : null}
			</Card>
		)
	}
	const months = view.budgets.months
	const spendOf = new Map(view.split.map(entry => [entry.id, entry.amount]))
	const rows = limited
		.map(category => {
			const spend = spendOf.get(category.id) ?? 0
			const allowed = category.budget * months
			return { id: category.id, name: category.name, spend, allowed, used: share(spend, allowed) }
		})
		.sort((a, b) => b.used - a.used || b.spend - a.spend || a.name.localeCompare(b.name))
	const pace = view.pace.running ? share(view.pace.daysIn, view.pace.unitDays) : null
	const allowed = rows.reduce((sum, row) => sum + row.allowed, 0)
	return (
		<Card footer={footer}>
			{head}
			<span className="sp-meta">{note}</span>
			{pace != null
				? (
					<ListItem>
						<span className="sp-data">Day {view.pace.daysIn} of {view.pace.unitDays} - expected pace</span>
						<span className="sp-grow" />
						<span className="sp-amount">{Math.round(pace)}%</span>
					</ListItem>
				)
				: null}
			{rows.map(row => {
				const over = row.spend > row.allowed
				const scale = Math.max(row.spend, row.allowed)
				const ahead = !over && pace != null && row.used > pace
				const text = over
					? `${currency(row.spend - row.allowed, 0)} over budget`
					: `${currency(row.allowed - row.spend, 0)} left${ahead ? `${dot}ahead of pace` : ''}`
				return (
					<div className="sp-stack sp-gap-6" key={row.id}>
						<div className="sp-row-flex sp-gap-8">
							<span className="sp-data">{row.name}</span>
							<span className="sp-grow" />
							<span className="sp-amount">{amount(row.spend, 0)}</span>
							<span className="sp-meta">/ {currency(row.allowed, 0)}</span>
						</div>
						<Gauge
							value={share(Math.min(row.spend, row.allowed), scale)}
							over={over ? share(row.spend - row.allowed, scale) : undefined}
							marker={pace != null ? share(row.allowed * (pace / 100), scale) : undefined}
							aria-label={row.name}
						/>
						<span className={over || ahead ? 'sp-meta sp-meta--over' : 'sp-meta'}>{text}</span>
					</div>
				)
			})}
			{/* the whole window's spend against every limit, the same share Home states */}
			<div className="sp-card__footer">
				<span className="sp-data">All categories</span>
				<span className="sp-grow" />
				<span className="sp-amount">{amount(view.spent, 0)}</span>
				<span className="sp-meta">/ {currency(allowed, 0)}</span>
			</div>
			{pace != null
				? (
					<div className="sp-row-flex sp-gap-8">
						<GaugeKey aria-hidden="true" />
						<span className="sp-meta">Marker shows where you should be on day {view.pace.daysIn}.</span>
					</div>
				)
				: null}
		</Card>
	)
}

// List reads its head from its own children, so this returns the element rather than being a component
function sliceHead(show) {
	return (
		<ListHead>
			<ListCell width="title">Order</ListCell>
			<ListCell width="date">Date</ListCell>
			{show.categories ? <ListCell width="flex">Categories</ListCell> : null}
			{show.items ? <ListCell width="number">Items</ListCell> : null}
			<ListCell width="status">Status</ListCell>
			<ListCell width="amount">Total</ListCell>
		</ListHead>
	)
}

function OrdersTable({ view, rows, matched, failed, onLoadMore, onRetry }) {
	const column = useRef(null)
	const show = columnsFor(useWidth(column))
	let body
	if (!rows.length && failed) {
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>The orders in {nameOf(view.range, view.id)} did not load</EmptyTitle>
					<EmptyBody>{failureMessage(failed, RETRY_COPY)}</EmptyBody>
					<Button size="small" onClick={onRetry}>Try again</Button>
				</Empty>
			</Card>
		)
	}
	// a page of rows holds the table's place, or the window's own count once it is known
	else if (!rows.length) body = <RowsLoading show={show} size={view ? Math.min(view.orders, SLICE) : SLICE} total={view?.orders} />
	else {
		body = (
			<List data={rows} recordKey={order => order.id} noun="orders" pageSize={SLICE} total={matched} onLoadMore={onLoadMore} selectionKey={view.id}
				rowTo={order => `/orders/${order.id}`} locale={NUMBER_LOCALE}>
				<Caption>
					<strong className="sp-data">{counted(view.orders, 'order')} in this slice</strong>
					<span className="sp-meta">{dot}{currency(view.spent)}</span>
					<Saving value={view.saved} variant="help" />
					<span className="sp-grow" />
					<span className="sp-meta">newest first</span>
				</Caption>
				{sliceHead(show)}
				<ListRow>
					{order => (
						<>
							<ListCell><Stacked><span className="sp-title sp-truncate">{order.vendor?.name}</span><span className="sp-meta sp-truncate">{orderLine(order)}</span></Stacked></ListCell>
							<ListCell><span className="sp-data">{shortDate(order.date)}</span></ListCell>
							{show.categories
								? (
									<ListCell>
										<span className="sp-row-flex sp-gap-6 sp-wrap">
											{order.categories.map(category => <Chip key={category.id}>{category.name}</Chip>)}
										</span>
									</ListCell>
								)
								: null}
							{show.items ? <ListCell cell="number"><span className="sp-data">{order.itemCount}</span></ListCell> : null}
							<ListCell><StatusPill status={order.status} /></ListCell>
							<ListCell cell="amount"><span className="sp-amount">{currency(order.total)}</span></ListCell>
						</>
					)}
				</ListRow>
				{failed ? <Foot><span className="sp-meta sp-meta--over">The next orders did not load. Press Load more to try again.</span></Foot> : null}
			</List>
		)
	}
	return <div ref={column}>{body}</div>
}

const LOADING_ROWS = [['62pc', '58', '88'], ['48pc', '74', '74'], ['55pc', '46', '92']]

/* Skeletons hold the real rows' places, so nothing moves when the orders land (6b). */
function RowsLoading({ show, size, total }) {
	const rows = Array.from({ length: size }, (unused, i) => ({ id: i, r: LOADING_ROWS[i % LOADING_ROWS.length] }))
	// a count already known holds the foot the rows will have; its Load more waits for them
	const foot = total > SLICE ? { total, onLoadMore: () => {} } : {}
	return (
		<List data={rows} recordKey={x => x.id} noun="orders" pageSize={SLICE} {...foot}>
			<Caption><Skeleton shape="line" data-w="82" data-h="13" /></Caption>
			{sliceHead(show)}
			<ListRow>{({ r }) => (
				<>
					<ListCell><Stacked><span className="sp-title">{hold(r[0])}</span><span className="sp-meta">{hold('44pc', '10')}</span></Stacked></ListCell>
					<ListCell><span className="sp-data">{hold(r[1])}</span></ListCell>
					{show.categories ? <ListCell><Skeleton shape="line" data-w="52" data-h="22" /></ListCell> : null}
					{show.items ? <ListCell cell="number"><span className="sp-data">{hold('18', '13', 'end')}</span></ListCell> : null}
					<ListCell><Skeleton shape="pill" /></ListCell>
					<ListCell cell="amount"><span className="sp-amount">{hold(r[2], '13', 'end')}</span></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

function SliceCard({ view }) {
	const chevron = <Icon name="chevron-right" />
	if (!view) {
		return (
			<ListItem variant="card" chevron={chevron} aria-busy="true">
				<Stacked><span className="sp-title">{hold('130')}</span></Stacked>
				<span className="sp-stacked sp-cell-amount">
					<span className="sp-amount">{hold('96', '13', 'end')}</span>
					<span className="sp-amount-secondary">{hold('104', '11', 'end')}</span>
				</span>
			</ListItem>
		)
	}
	// the title wraps rather than cut: on the narrowest phone the count does not fit beside the total
	return (
		<ListItem variant="card" to={`/orders?from=${view.from}&to=${view.to}`} chevron={chevron}>
			<Stacked>
				<span className="sp-title">{counted(view.orders, 'order')} in this slice</span>
			</Stacked>
			<span className="sp-stacked sp-cell-amount">
				<span className="sp-amount">{currency(view.spent)}</span>
				<Saving value={view.saved} />
			</span>
		</ListItem>
	)
}
