import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, Cards, Panel } from '../components/Card.jsx'
import { Chip } from '../components/Chip.jsx'
import { Choice, Switch } from '../components/Choice.jsx'
import { Bars, Gauge, GaugeKey, Legend, LegendItem, Plot, ShareRow, Shares, Stat, Sum } from '../components/Data.jsx'
import { PeriodPicker, PeriodWindow, Selected } from '../components/DatePickers.jsx'
import { Icon } from '../components/Icon.jsx'
import { Caption, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { getCategories, getOrders, getStats } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { activeLocaleCode, amount, compactAmount, currency, monthNames, percent, plural, shortDate } from '../api/format.js'

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

const weekday = iso => new Intl.DateTimeFormat(activeLocaleCode(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(utcOf(iso)))

/** Months for a quarter or a year, days for a week or a month, each with its spend and saving
    taken from the API's running totals. */
function columnsOf(view) {
	const spend = view.series.current
	const saved = view.series.savedCumulative
	const days = spend.length
	const byMonth = days > 31
	const starts = byMonth ? view.axis.map(mark => mark.day) : spend.map((unused, day) => day)
	const between = (series, a, b) => series[b - 1] - (a > 0 ? series[a - 1] : 0)
	const first = utcOf(view.from)
	return starts.map((start, i) => {
		const end = i + 1 < starts.length ? starts[i + 1] : days
		const from = isoOf(first + start * DAY_MS)
		const at = new Date(first + start * DAY_MS)
		return {
			key: from,
			from,
			to: isoOf(first + (end - 1) * DAY_MS),
			byMonth,
			tick: byMonth ? monthNames()[at.getUTCMonth()] : view.range === 'week' ? weekday(from) : String(at.getUTCDate()),
			spend: Math.max(0, between(spend, start, end)),
			saved: Math.max(0, between(saved, start, end)),
			running: view.todayIndex != null && view.todayIndex >= start && view.todayIndex < end,
			future: view.todayIndex != null && view.todayIndex < start
		}
	})
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
const TOP = 8

/* ---- the page ---- */

export default function Statistics() {
	const shape = useShellShape()
	const touch = shape === 'touch'
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const range = RANGES.includes(params.get('range')) ? params.get('range') : 'year'
	const asked = params.get('period')
	const id = ID_SHAPE[range].test(asked ?? '') ? asked : windowIdAt(range, todayUtc())
	const comparing = params.get('compare') !== 'off'
	const before = yearEarlier(range, id)
	const [fromMs, toMs] = boundsOf(range, id)
	const from = isoOf(fromMs)
	const to = isoOf(toMs)

	const stats = useApi(getStats, [range, id, 'previous'])
	const past = useApi(getStats, [range, before, 'previous'], { enabled: comparing && !touch })
	const categories = useApi(getCategories)
	const delivered = useApi(getOrders, [{ status: 'Delivered', from, to, pageSize: 1 }])
	const ordered = useApi(getOrders, [{ status: 'Ordered', from, to, pageSize: 1 }])
	const returned = useApi(getOrders, [{ status: 'Returned', from, to, pageSize: 1 }])
	const orders = useApi(getOrders, [{ from, to, pageSize: 1000 }], { enabled: !touch })

	// the URL holds only what differs from the page's own default
	const show = (nextRange, nextId, nextComparing = comparing) => setParams({
		...(nextRange === 'year' ? {} : { range: nextRange }),
		...(nextId === windowIdAt(nextRange, todayUtc()) ? {} : { period: nextId }),
		...(nextComparing ? {} : { compare: 'off' })
	})
	const openMonth = column => show('month', column.from.slice(0, 7))

	const settled = stats.data?.window.id === id && stats.data?.window.range === range
	const older = settled ? stats.data.older : null
	const newer = settled ? stats.data.newer : null

	const period = (
		<PeriodPicker
			name="statistics-period"
			presets={PRESETS}
			value={range}
			at={from}
			locale={activeLocaleCode()}
			onChange={({ period: next }) => show(next, reanchor(range, id, next))}
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
						<Choice control={<Switch checked={comparing} onChange={ev => show(range, id, ev.target.checked)} />}>
							Compare with {nameOf(range, before)}
						</Choice>
					</Selected>
				)}
		</PeriodPicker>
	)

	const grid = cards => (shape === 'wide' ? <Cards>{cards}</Cards> : <div className="sp-fields">{cards}</div>)

	if (!stats.data && stats.error) {
		return (
			<>
				{period}
				<Empty dashed>
					<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
					<EmptyTitle>Your statistics could not be shown</EmptyTitle>
					<EmptyBody>Check your connection, then try again.</EmptyBody>
					<Button variant="outline" onClick={stats.refresh}>Try again</Button>
				</Empty>
			</>
		)
	}

	// the cards' own frames with nothing in them yet, so the page keeps its height when figures land
	if (!stats.data) {
		return (
			<>
				{period}
				{grid(['Total spend', 'Orders', 'Average order', 'Saved'].map((label, i) => (
					<Card key={label} aria-busy="true">
						<Stat label={label} figure={<Skeleton shape="line" data-w="104" data-h="22" />} />
						{comparing && !touch ? <Skeleton shape="pill" /> : null}
						{i === 0 && !touch ? <Bars variant="spark" columns={[]} /> : null}
					</Card>
				)))}
				<Card aria-busy="true">
					<span className="sp-section-label">{range === 'week' || range === 'month' ? 'Spend by day' : 'Spend by month'}</span>
					{touch
						? <Bars columns={[]} />
						: <Plot axis={['', '', '', '', '']} gridlines={5}><Bars variant="plot" columns={[]} /></Plot>}
				</Card>
			</>
		)
	}

	const view = stats.data.window
	const name = nameOf(view.range, view.id)

	if (!view.orders) {
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

	const columns = columnsOf(view)
	const was = comparing && !touch && past.data?.window.id === before ? past.data.window : null
	const kpis = (
		<Kpis view={view} was={was} waiting={comparing && !touch && !was && !past.error} wasName={nameOf(range, before)} columns={columns} touch={touch} />
	)
	const chart = <SpendChart columns={columns} touch={touch} onOpen={openMonth} />
	const byCategory = touch
		? <CategoryRows key={`category ${view.id}`} view={view} />
		: <CategoryShares key={`category ${view.id}`} view={view} onOpen={category => navigate(`/orders?category=${category ?? 'none'}&from=${view.from}&to=${view.to}`)} />
	const byStatus = (
		<StatusCard
			total={view.orders}
			counts={[['Delivered', delivered], ['Ordered', ordered], ['Returned', returned]]}
		/>
	)
	const vendors = <VendorsCard key={`vendors ${view.id}`} view={view} name={name} touch={touch} />
	const saving = <SavingChart columns={columns} name={name} touch={touch} onOpen={openMonth} />
	const limits = <LimitCard view={view} name={name} categories={categories.data} touch={touch} />
	const slice = touch
		? <SliceCard view={view} name={name} />
		: <OrdersTable view={view} rows={orders.data?.orders} onOpen={order => navigate(`/orders/${order.id}`)} />

	if (touch) {
		return <>{period}{grid(kpis)}{chart}{byCategory}{byStatus}{vendors}{saving}{limits}{slice}</>
	}
	return (
		<>
			{period}
			{grid(kpis)}
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

/* ---- cards ---- */

// on touch a figure card is its label and figure only (Mobile screens 7a)
function Kpis({ view, was, waiting, wasName, columns, touch }) {
	const shown = columns.filter(column => !column.future)
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
	const unit = columns[0]?.byMonth ? 'month' : 'day'
	const compared = line => {
		if (!was) return waiting ? <Skeleton shape="pill" /> : null
		return was.orders ? line(was) : <span className="sp-meta">No orders in {wasName}</span>
	}
	const rise = (now, then) => signed(now - then, percent(Math.abs(share(now - then, then)), 1))
	const cost = change => (change > 0 ? 'danger' : change < 0 ? 'success' : 'default')
	return [
		<Card key="spend">
			<Stat label="Total spend" figure={currency(view.spent, 0)} />
			{compared(then => <Change tone={cost(view.spent - then.spent)} against={currency(then.spent, 0)}>{rise(view.spent, then.spent)}</Change>)}
			{spark('spend', `Total spend in each ${unit}`)}
		</Card>,
		<Card key="orders">
			<Stat label="Orders" figure={String(view.orders)} />
			{compared(then => <Change against={String(then.orders)}>{signed(view.orders - then.orders, String(Math.abs(view.orders - then.orders)))}</Change>)}
		</Card>,
		<Card key="average">
			<Stat label="Average order" figure={currency(view.average, 0)} />
			{compared(then => <Change against={currency(then.average, 0)}>{rise(view.average, then.average)}</Change>)}
		</Card>,
		<Card key="saved">
			<Stat label="Saved" figure={view.saved > 0 ? <span className="sp-ink-success">{currency(view.saved, 0)}</span> : currency(view.saved, 0)} />
			{compared(then => (
				<Change tone={view.saved > then.saved ? 'success' : 'default'} against={currency(then.saved, 0)}>
					{signed(view.saved - then.saved, currency(Math.abs(view.saved - then.saved), 0))}
				</Change>
			))}
			{spark('saved', `Saved in each ${unit}`)}
		</Card>
	]
}

/** How a figure moved since the window it is compared with, and that window's own figure. */
function Change({ tone = 'default', against, children }) {
	return (
		<div className="sp-row-flex sp-gap-8">
			<Pill color={tone}>{children}</Pill>
			<span className="sp-meta">vs {against}</span>
		</div>
	)
}

function SpendChart({ columns, touch, onOpen }) {
	const byMonth = columns[0]?.byMonth
	const top = scaleFor(Math.max(...columns.map(column => column.spend)))
	const plot = useRef(null)
	// a bar is a share of its whole column, ticks included, so it is scaled to the grid's part of it
	const [fit, setFit] = useState(1)
	useLayoutEffect(() => {
		if (!plot.current) return
		const style = getComputedStyle(plot.current)
		const height = parseFloat(style.getPropertyValue('--plot-h'))
		const foot = parseFloat(style.getPropertyValue('--plot-foot'))
		if (height > 0 && foot >= 0) setFit((height - foot) / height)
	}, [touch])
	const running = columns.some(column => column.running)
	const dense = columns.length > 12
	const bars = columns.map((column, i) => ({
		key: column.key,
		from: column.from,
		to: column.to,
		height: share(column.spend, top) * (touch ? 1 : fit),
		muted: column.running,
		tick: dense && i % 7 ? null : touch && byMonth ? column.tick.slice(0, 1) : column.tick
	}))
	const select = byMonth ? key => onOpen(columns.find(column => column.key === key)) : undefined
	return (
		<Card>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">{byMonth ? 'Spend by month' : 'Spend by day'}</span>
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
				? <Bars columns={bars} onSelect={select} />
				: (
					<Plot ref={plot} axis={[4, 3, 2, 1, 0].map(step => compactAmount((top / 4) * step))} gridlines={5}>
						<Bars variant="plot" columns={bars} onSelect={select} />
					</Plot>
				)}
		</Card>
	)
}

function CategoryShares({ view, onOpen }) {
	const [open, setOpen] = useState(false)
	const split = view.split
	const rest = split.slice(3)
	const folded = !open && rest.length > 1
	const shown = folded ? split.slice(0, 3) : split
	return (
		<Card>
			<span className="sp-section-label">By category</span>
			<Shares>
				{shown.map((entry, i) => (
					<ShareRow key={entry.id ?? 'none'} series={Math.min(i + 1, 4)} value={`${Math.round(entry.share)}%`} onClick={() => onOpen(entry.id)}>
						{entry.name}
					</ShareRow>
				))}
				{folded
					? (
						<ShareRow series={4} value={`${Math.round(rest.reduce((sum, entry) => sum + entry.share, 0))}%`} onClick={() => setOpen(true)}>
							Other {rest.length} categories
						</ShareRow>
					)
					: null}
			</Shares>
		</Card>
	)
}

/** A ranked list with a bar under each line: the top eight and one line for the rest, or all of them. */
function Ranked({ entries, noun, touch, open }) {
	const most = entries[0]?.amount ?? 0
	const rest = entries.slice(TOP)
	const folded = !open && rest.length > 1
	const lines = folded
		? [...entries.slice(0, TOP), { id: 'other', name: `Other ${rest.length} ${noun}`, amount: rest.reduce((sum, entry) => sum + entry.amount, 0) }]
		: entries
	return lines.map(entry => (touch
		? (
			<div className="sp-stack" key={entry.id ?? 'none'}>
				<Sum value={amount(entry.amount, 0)}>{entry.name}</Sum>
				<Gauge thin value={share(entry.amount, most)} aria-label={entry.name} />
			</div>
		)
		: (
			<div className="sp-stack sp-gap-6" key={entry.id ?? 'none'}>
				<div className="sp-row-flex sp-gap-8">
					<span className="sp-data">{entry.name}</span>
					<span className="sp-grow" />
					<span className="sp-amount">{currency(entry.amount, 0)}</span>
				</div>
				<Gauge value={share(entry.amount, most)} aria-label={entry.name} />
			</div>
		)))
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
			{open ? `Show top ${TOP} only` : `Show all ${count} ${noun}`}
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

function StatusCard({ total, counts }) {
	return (
		<Card>
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
										<span className="sp-amount">{count}</span>
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

function SavingChart({ columns, name, touch, onOpen }) {
	const byMonth = columns[0]?.byMonth
	const most = Math.max(...columns.map(column => column.spend), 0)
	const dense = columns.length > 12
	return (
		<Card>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Spend vs saving</span>
				<span className="sp-grow" />
				<span className="sp-meta">{name}</span>
			</div>
			<Bars
				columns={columns.map((column, i) => ({
					key: column.key,
					from: column.from,
					to: column.to,
					pair: [share(column.spend, most), share(column.saved, most)],
					tick: dense && i % 7 ? null : touch && byMonth ? column.tick.slice(0, 1) : column.tick
				}))}
				onSelect={byMonth ? key => onOpen(columns.find(column => column.key === key)) : undefined}
			/>
			<Legend>
				<LegendItem series={1}>Paid</LegendItem>
				<LegendItem series={4}>Saved</LegendItem>
			</Legend>
		</Card>
	)
}

function LimitCard({ view, name, categories, touch }) {
	const months = view.budgets.months
	const spendOf = new Map(view.split.map(entry => [entry.id, entry.amount]))
	const rows = (categories ?? [])
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
	const edit = <Button variant="outline" size="small" to="/categories">Edit on category</Button>
	// a phone button takes the full width, so there it closes the card rather than squeezing the label
	const head = (
		<div className="sp-row-flex sp-gap-12">
			<span className="sp-section-label">Monthly limit</span>
			<span className="sp-grow" />
			{touch ? null : edit}
		</div>
	)
	if (!categories) {
		return <Card aria-busy="true">{head}<Skeleton shape="line" /><Skeleton shape="short" /></Card>
	}
	if (!rows.length) {
		return (
			<Card>
				{head}
				<span className="sp-meta">No category has a monthly limit yet. Give one a limit, and this card shows how close you are.</span>
				{touch ? edit : null}
			</Card>
		)
	}
	const spent = rows.reduce((sum, row) => sum + row.spend, 0)
	const allowed = rows.reduce((sum, row) => sum + row.allowed, 0)
	return (
		<Card>
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
			<div className="sp-card__footer">
				<span className="sp-data">All categories with a limit</span>
				<span className="sp-grow" />
				<span className="sp-amount">{amount(spent, 0)}</span>
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
			{touch ? edit : null}
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

function OrdersTable({ view, rows, onOpen }) {
	return (
		<List data={rows ?? []} recordKey={order => order.id} noun="orders" pageSize={25} selectionKey={view.id} onRowClick={onOpen}>
			<Caption>
				<strong className="sp-data">{plural(view.orders, 'order')} in this slice</strong>
				<span className="sp-meta">· {currency(view.spent)}</span>
				{savingLine(view.saved, 'help')}
				<span className="sp-grow" />
				<span className="sp-meta">newest first</span>
			</Caption>
			<ListHead>
				<ListCell width="title">Order</ListCell>
				<ListCell width="date">Date</ListCell>
				<ListCell width="flex">Categories</ListCell>
				<ListCell width="number">Items</ListCell>
				<ListCell width="status">Status</ListCell>
				<ListCell width="amount">Total</ListCell>
			</ListHead>
			<ListRow>
				{order => (
					<>
						<ListCell><Stacked><span className="sp-title sp-truncate">{order.vendor?.name}</span></Stacked></ListCell>
						<ListCell><span className="sp-data">{shortDate(order.date)}</span></ListCell>
						<ListCell>
							<span className="sp-row-flex sp-gap-6 sp-wrap">
								{order.categories.map(category => <Chip key={category.id}>{category.name}</Chip>)}
							</span>
						</ListCell>
						<ListCell cell="amount"><span className="sp-data">{order.itemCount}</span></ListCell>
						<ListCell><Pill {...STATUS_PILL[order.status]}>{order.status}</Pill></ListCell>
						<ListCell cell="amount"><span className="sp-amount">{currency(order.total)}</span></ListCell>
					</>
				)}
			</ListRow>
		</List>
	)
}

function SliceCard({ view, name }) {
	return (
		<ListItem variant="card" to={`/orders?from=${view.from}&to=${view.to}`} chevron={<Icon name="chevron-right" />}>
			<Stacked>
				<span className="sp-title sp-truncate">{plural(view.orders, 'order')}</span>
				<span className="sp-subtitle sp-truncate">{name}</span>
			</Stacked>
			<span className="sp-grow" />
			<span className="sp-stacked sp-cell-amount">
				<span className="sp-amount">{currency(view.spent)}</span>
				{savingLine(view.saved, 'amount')}
			</span>
		</ListItem>
	)
}
