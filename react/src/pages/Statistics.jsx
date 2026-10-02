import { useLayoutEffect, useRef, useState } from 'react'
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
import { useMedia, useShellShape } from '../app/useMedia.js'
import { orderLine } from '../app/orderRow.jsx'
import { failureMessage, getCategories, getOrders, getStats } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { activeLocaleCode, amount, compactAmount, currency, longDate, monthNames, percent, shortDate } from '../api/format.js'

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
const todayUtc = () => { const t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) }
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

/** The same window a year earlier, which is what the switch compares with. */
function yearEarlier(range, id) {
	const from = new Date(boundsOf(range, id)[0])
	return windowIdAt(range, Date.UTC(from.getUTCFullYear() - 1, from.getUTCMonth(), from.getUTCDate()))
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

/** Months for a quarter or a year, weeks for a month, days for a week, each with its spend and
    saving taken from the API's running totals, and the window a press on it opens. */
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
			tick: unit === 'month' ? monthNames()[month] : unit === 'week' ? `W${week}` : weekday(from),
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
	return { unit, columns }
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
	const toDate = useCurrent(getOrders, [{ from: isoOf(pastFrom), to: isoOf(pastFrom + ((sameDays ?? 1) - 1) * DAY_MS), pageSize: 1 }], { enabled: comparing && sameDays != null })

	// the table pages on the server; the pages already shown are kept for this window only
	const slice = `${from}/${to}`
	const [more, setMore] = useState({ slice, pages: [] })
	const earlier = more.slice === slice ? more.pages : []
	const next = useCurrent(getOrders, [{ from, to, page: earlier.length + 1, pageSize: SLICE }], { enabled: !touch })
	const loadMore = () => {
		if (next.error) return next.refresh()
		if (next.data) setMore({ slice, pages: [...earlier, next.data] })
	}

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
						<Choice control={<Switch checked={compareOn} onChange={ev => show(range, id, ev.target.checked)} />}>
							Compare with {nameOf(range, before)}
						</Choice>
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

	if (!stats.data) return arrange({ shape, stacked, period, ...busyParts({ range, touch, comparing }) })

	const view = stats.data.window
	const name = nameOf(view.range, view.id)

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
		kpis: <Kpis view={view} chart={chart} was={was} waiting={comparing && !was && !compareFailed} touch={touch} />,
		chart: <SpendChart chart={chart} touch={touch} onOpen={open} />,
		byCategory: touch
			? <CategoryRows key={`category ${view.id}`} view={view} />
			: <CategoryShares view={view} onOpen={category => navigate(`/orders?category=${category ?? 'none'}&from=${view.from}&to=${view.to}`)} />,
		byStatus: <StatusCard total={view.orders} counts={[['Delivered', delivered], ['Ordered', ordered], ['Returned', returned]]} onRetry={retry} />,
		vendors: <VendorsCard key={`vendors ${view.id}`} view={view} name={name} touch={touch} />,
		saving: <SavingChart chart={chart} name={name} touch={touch} onOpen={open} />,
		limits: <LimitCard view={view} name={name} categories={categories} touch={touch} onRetry={retry} />,
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
					onOpen={order => navigate(`/orders/${order.id}`)}
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
				: <>{chart}<div className="sp-halves">{byCategory}{byStatus}</div></>}
			<div className="sp-halves">
				<div className="sp-stack sp-gap-12">{vendors}{saving}</div>
				{limits}
			</div>
			{slice}
		</>
	)
}

/* ---- the frames before the figures land (6b): the loaded layout's own cards, empty ---- */

// figure spaces, about as wide as a label like "80k", so the axis keeps its width
const AXIS_HOLD = Array.from({ length: 5 }, () => '\u2007\u2007\u2007')
const LINES = ['62pc', '48pc', '55pc', '36pc']

// the figure's own line holds the card at its loaded height while the bar stands in for the number
const figureHold = <span className="sp-row-flex"><Skeleton shape="line" data-w="104" data-h="22" />{'\u00a0'}</span>

function BusyLines({ label, count = 4 }) {
	return (
		<Card aria-busy="true">
			<span className="sp-section-label">{label}</span>
			{LINES.slice(0, count).map(w => <Skeleton key={w} shape="line" data-w={w} data-h="13" />)}
		</Card>
	)
}

function busyParts({ range, touch, comparing }) {
	const unit = UNIT[range]
	const pending = { data: undefined, error: null }
	return {
		kpis: ['Total spend', 'Orders', 'Average order', 'Saved'].map((label, i) => (
			<Card key={label} aria-busy="true">
				<Stat label={label} figure={figureHold} />
				{comparing ? <Skeleton shape="pill" /> : null}
				{!touch && (i === 0 || i === 3) ? <Bars variant="spark" loading /> : null}
			</Card>
		)),
		chart: (
			<Card aria-busy="true">
				<span className="sp-section-label">Spend by {unit}</span>
				{touch
					? <Bars loading />
					: <Plot axis={AXIS_HOLD} gridlines={5}><Bars variant="plot" loading /></Plot>}
			</Card>
		),
		byCategory: <BusyLines label="By category" />,
		byStatus: <StatusCard counts={[['Delivered', pending], ['Ordered', pending], ['Returned', pending]]} />,
		vendors: <BusyLines label="Top vendors" />,
		saving: (
			<Card aria-busy="true">
				<span className="sp-section-label">Spend vs saving</span>
				<Bars loading />
			</Card>
		),
		limits: <LimitCard categories={{ data: undefined, error: null }} touch={touch} />,
		slice: touch ? <BusyLines label="Orders in this slice" count={2} /> : <OrdersTable rows={[]} />
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
function Kpis({ view, chart, was, waiting, touch }) {
	const shown = chart.columns.filter(column => !column.future)
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
			{compared(then => <Change tone={cost(view.spent, then.spent)} against={currency(then.spent, 0)}>{rise(view.spent, then.spent)}</Change>)}
			{spark('spend', `Total spend in each ${chart.unit}`)}
		</Card>,
		<Card key="orders">
			<Stat label="Orders" figure={amount(view.orders, 0)} />
			{compared(then => (
				<Change tone={view.orders > then.orders ? 'success' : 'default'} against={amount(then.orders, 0)}>
					{signed(view.orders - then.orders, amount(Math.abs(view.orders - then.orders), 0))}
				</Change>
			))}
		</Card>,
		<Card key="average">
			<Stat label="Average order" figure={figure(view.average)} />
			{compared(then => (
				<Change state={then.average && Math.round(view.average) !== Math.round(then.average) ? 'progress' : undefined} against={currency(then.average, 0)}>
					{rise(view.average, then.average)}
				</Change>
			))}
		</Card>,
		<Card key="saved">
			<Stat label="Saved" color={view.saved > 0 ? 'success' : 'default'} figure={figure(view.saved)} />
			{compared(then => (
				<Change tone={view.saved > then.saved ? 'success' : 'default'} against={currency(then.saved, 0)}>
					{signed(view.saved - then.saved, currency(Math.abs(view.saved - then.saved), 0))}
				</Change>
			))}
			{spark('saved', `Saved in each ${chart.unit}`)}
		</Card>
	]
}

/** How a figure moved since the window it is compared with, and that window's own figure. */
function Change({ tone = 'default', state, against, children }) {
	return (
		<div className="sp-row-flex sp-gap-8">
			<Pill color={tone} state={state}>{children}</Pill>
			<span className="sp-meta">vs {against}</span>
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

function SpendChart({ chart, touch, onOpen }) {
	const { unit, columns } = chart
	const top = scaleFor(Math.max(...columns.map(column => column.spend)))
	const bars = useRef(null)
	const fit = useFit(bars, `${touch} ${columns.length}`)
	const running = columns.some(column => column.running)
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
	return (
		<Card>
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
				? <Bars ref={bars} columns={drawn} onSelect={select} />
				: (
					<Plot axis={[4, 3, 2, 1, 0].map(step => compactAmount((top / 4) * step))} gridlines={5}>
						<Bars ref={bars} variant="plot" columns={drawn} onSelect={select} />
					</Plot>
				)}
		</Card>
	)
}

/** The top three categories and one line for the rest, which opens nothing (4d). */
function CategoryShares({ view, onOpen }) {
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
    them in a region that scrolls inside the card (4d). */
function Ranked({ entries, noun, touch, open }) {
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
				<Gauge thin value={share(entry.amount, most)} aria-label={entry.name} />
			</div>
		)
		: (
			<div className="sp-stack sp-gap-6" key={entry.id ?? 'none'}>
				<div className="sp-row-flex sp-gap-8">
					<span className={entry.other ? 'sp-data sp-subtitle' : 'sp-data'}>{entry.name}</span>
					<span className="sp-grow" />
					<span className="sp-amount">{currency(entry.amount, 0)}</span>
				</div>
				<Gauge value={share(entry.amount, most)} aria-label={entry.name} />
			</div>
		)))
	return open ? <div className="os-scroll sp-scrolls">{drawn}</div> : drawn
}

function CategoryRows({ view }) {
	const [open, setOpen] = useState(false)
	return (
		<Card footer={view.split.length > TOP + 1 ? [<ShowAll key="all" open={open} onClick={() => setOpen(!open)} count={view.split.length} noun="categories" />] : null}>
			<span className="sp-section-label">By category</span>
			<Ranked entries={view.split} noun="categories" touch open={open} />
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
	const vendors = view.vendorSplit
	return (
		<Card footer={vendors.length > TOP + 1 ? [<ShowAll key="all" open={open} onClick={() => setOpen(!open)} count={vendors.length} noun="vendors" />] : null}>
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
								? <Skeleton shape="line" data-w="44" />
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
	const { unit, columns } = chart
	const most = Math.max(...columns.map(column => column.spend), 0)
	return (
		<Card>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Spend vs saving</span>
				<span className="sp-grow" />
				<span className="sp-meta">{name}</span>
			</div>
			<Bars
				columns={columns.map(column => ({
					key: column.key,
					from: column.from,
					to: column.to,
					label: `${column.name}, paid ${currency(column.spend, 0)}, saved ${currency(column.saved, 0)}`,
					pair: [share(column.spend, most), share(column.saved, most)],
					tick: tickOf(chart, column, touch)
				}))}
				onSelect={unit === 'day' ? undefined : key => onOpen(columns.find(column => column.key === key).open)}
			/>
			<Legend>
				<LegendItem series={1}>Paid</LegendItem>
				<LegendItem series={4}>Saved</LegendItem>
			</Legend>
		</Card>
	)
}

function LimitCard({ view, name, categories, touch, onRetry }) {
	const edit = <Button key="edit" variant="outline" size="small" to="/categories">Edit on category</Button>
	// a phone button takes the full width, so there it sits in the card's footer rather than squeezing the label
	const head = (
		<div className="sp-row-flex sp-gap-12">
			<span className="sp-section-label">Monthly limit</span>
			<span className="sp-grow" />
			{touch ? null : edit}
		</div>
	)
	if (categories.error) return <Failed label="Monthly limit" what="The limits did not load." error={categories.error} onRetry={onRetry} />
	if (!categories.data || !view) {
		return <Card aria-busy="true">{head}<Skeleton shape="line" /><Skeleton shape="short" /></Card>
	}
	const footer = touch ? [edit] : null
	const months = view.budgets.months
	const spendOf = new Map(view.split.map(entry => [entry.id, entry.amount]))
	const rows = categories.data
		.filter(category => category.budget > 0)
		.map(category => {
			const spend = spendOf.get(category.id) ?? 0
			const allowed = category.budget * months
			return { id: category.id, name: category.name, spend, allowed, used: share(spend, allowed) }
		})
		.sort((a, b) => b.used - a.used || b.spend - a.spend || a.name.localeCompare(b.name))
	const pace = view.pace.running ? share(view.pace.daysIn, view.pace.unitDays) : null
	const note = Math.abs(months - 1) < 0.005
		? 'Each category has one limit that applies to every month.'
		: `Each category has one limit that applies to every month. The amounts below cover ${name}.`
	if (!rows.length) {
		return (
			<Card footer={footer}>
				{head}
				<span className="sp-meta">No category has a monthly limit yet. Give one a limit, and this card shows how close you are.</span>
			</Card>
		)
	}
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
					: `${currency(row.allowed - row.spend, 0)} left${ahead ? ' · ahead of pace' : ''}`
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

const STATUS_PILL = {
	Delivered: { color: 'success' },
	Ordered: { state: 'progress' },
	Returned: { color: 'danger' }
}

function savingLine(saved, kind) {
	const text = `Saved ${currency(saved)}`
	if (kind === 'help') return saved > 0 ? <span className="sp-field__help" data-color="success">{text}</span> : <span className="sp-field__help">{text}</span>
	return saved > 0 ? <span className="sp-amount-secondary" data-color="success">{text}</span> : <span className="sp-amount-secondary">{text}</span>
}

/** The table's own width: which columns it keeps answers to it, never to the window (2i). */
function useWidth(ref) {
	const [width, setWidth] = useState(0)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		setWidth(el.getBoundingClientRect().width)
		const watch = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
		watch.observe(el)
		return () => watch.disconnect()
	}, [ref])
	return width
}

// the order list's rule (2i): Items goes below 1040, Categories below 880
const columnsFor = width => ({ items: width >= 1040, categories: width >= 880 })

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

function OrdersTable({ view, rows, matched, failed, onLoadMore, onRetry, onOpen }) {
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
	else if (!rows.length) body = <RowsLoading show={show} />
	else {
		body = (
			<List data={rows} recordKey={order => order.id} noun="orders" pageSize={SLICE} total={matched} onLoadMore={onLoadMore} selectionKey={view.id} onRowClick={onOpen}>
				<Caption>
					<strong className="sp-data">{counted(view.orders, 'order')} in this slice</strong>
					<span className="sp-meta">· {currency(view.spent)}</span>
					{savingLine(view.saved, 'help')}
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
							<ListCell><Pill {...STATUS_PILL[order.status]}>{order.status}</Pill></ListCell>
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
function RowsLoading({ show }) {
	const rows = [...LOADING_ROWS, ...LOADING_ROWS].map((r, i) => ({ id: i, r }))
	return (
		<List data={rows} recordKey={x => x.id} noun="orders">
			<Caption><Skeleton shape="line" data-w="82" data-h="13" /></Caption>
			{sliceHead(show)}
			<ListRow>{({ r }) => (
				<>
					<ListCell><span className="sp-stacked sp-grow"><Skeleton shape="line" data-w={r[0]} data-h="13" /><Skeleton shape="line" data-w="44pc" data-h="10" /></span></ListCell>
					<ListCell><Skeleton shape="line" data-w={r[1]} data-h="13" /></ListCell>
					{show.categories ? <ListCell><Skeleton shape="line" data-w="52" data-h="22" /></ListCell> : null}
					{show.items ? <ListCell cell="number"><Skeleton shape="end" data-w="18" data-h="13" /></ListCell> : null}
					<ListCell><Skeleton shape="pill" /></ListCell>
					<ListCell cell="amount"><Skeleton shape="end" data-w={r[2]} data-h="13" /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

function SliceCard({ view }) {
	return (
		<ListItem variant="card" to={`/orders?from=${view.from}&to=${view.to}`} chevron={<Icon name="chevron-right" />}>
			<Stacked>
				<span className="sp-title sp-truncate">{counted(view.orders, 'order')} in this slice</span>
			</Stacked>
			<span className="sp-grow" />
			<span className="sp-stacked sp-cell-amount">
				<span className="sp-amount">{currency(view.spent)}</span>
				{savingLine(view.saved, 'amount')}
			</span>
		</ListItem>
	)
}
