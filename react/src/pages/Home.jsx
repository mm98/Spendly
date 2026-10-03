import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardBody, Toolbar } from '../components/Card.jsx'
import { Bars, Gauge, GaugeKey, Stat } from '../components/Data.jsx'
import { FILE_TYPES, FileDrop } from '../components/FileDrop.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Caption, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Well } from '../components/Well.jsx'
import { Icon } from '../components/Icon.jsx'

import { Empty, Hold, Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { CategoryMark, glyphOf } from '../app/categoryMark.jsx'
import { OrderPhoto, StatusPill } from '../app/orderRow.jsx'
import {
	failureMessage, getCategories, getCurrentUser, getHomeAttention, getMonthlySummary, getOrders, getSettings, getStatsSlice,
	overBudget, putSummaryAway, withMonthSpend
} from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, activeLocaleCode, amount, currency, dot, isSaving, monthNames, plural, shortDate, today } from '../api/format.js'

const RECENT = 4
const MONTHS = 8
const ALERTS = 3
// Home's figures are what was paid, as Statistics opens on
const MONTH = { range: 'month', flow: 'expenses' }
const YEAR = { range: 'year', flow: 'expenses' }
const CHEVRON = <Icon name="chevron-right" size={15} />

/* ---- reading the data ---- */

/** How loudly the limits speak (8b, Settings): the summary on or off, and the share of a limit a
    warning starts at, where 100 is only once it is passed. A setting not stored yet is the default. */
function loudness(settings) {
	const early = Number(settings?.notifyEarly)
	return { summary: settings?.notifyMonthlySummary ?? true, early: [75, 90, 100].includes(early) ? early : 90 }
}

/** A category with a limit is near it from the reader's chosen share up to the limit itself. */
const nearLimit = (c, early) => c.budget > 0 && early < 100 && !overBudget(c) && c.monthSpend >= (c.budget * early) / 100

/** The month window and the account's categories, joined: what three cards are drawn from. */
function monthView(window, list, early) {
	if (!window || !list) return null
	const categories = withMonthSpend(list, window.split)
	const limits = categories.reduce((sum, c) => sum + (c.budget > 0 ? c.budget : 0), 0)
	const byOverage = c => c.monthSpend - c.budget
	const spent = categories.filter(c => c.monthSpend > 0).sort((a, b) => b.monthSpend - a.monthSpend)
	return {
		window,
		count: categories.length,
		withSpend: spent.length,
		limits,
		early,
		over: categories.filter(overBudget).sort((a, b) => byOverage(b) - byOverage(a)),
		near: categories.filter(c => nearLimit(c, early)).sort((a, b) => b.monthSpend / b.budget - a.monthSpend / a.budget),
		top: spent.slice(0, 4),
		pace: window.pace.unitDays ? (window.pace.daysIn / window.pace.unitDays) * 100 : 100
	}
}

/** Where a gauge's fill, overage and marker sit: the bar is the larger of spend and limit. */
function against(spent, limit, pace) {
	const scale = Math.max(spent, limit) || 1
	return {
		value: (Math.min(spent, limit) / scale) * 100,
		over: spent > limit ? ((spent - limit) / scale) * 100 : undefined,
		marker: pace === undefined ? undefined : (pace * limit) / scale
	}
}

/** The window's month in the account's own language, as Statistics and the month bars write it. */
const monthOf = w => monthNames('long')[Number(w.from.slice(5, 7)) - 1]
const capital = text => text.charAt(0).toLocaleUpperCase() + text.slice(1)

const ordersFor = (category, window) => `/orders?category=${category.id}&from=${window.from}&to=${window.to}`

const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const dayNumbers = () => new Intl.DateTimeFormat(activeLocaleCode(), { day: '2-digit', month: '2-digit' })
/** "08/08" in the reader's own order, with the year once it is not this one. */
const rowDate = iso => (iso.slice(0, 4) === today().slice(0, 4) ? dayNumbers().format(dateOf(iso)) : shortDate(iso))

/** The reader's own calendar day of a moment in epoch seconds. */
const localDay = seconds => { const at = new Date(seconds * 1000); return new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

function daysAgo(iso) {
	const days = Math.round((dateOf(today()) - dateOf(iso)) / 86400000)
	if (days < 0) return null
	return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

/** The last eight calendar months, ending with this one, from the year's running totals. */
function lastMonths(window) {
	const year = Number(window.from.slice(0, 4))
	const day = (y, m, d) => Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / 86400000)
	const spendIn = (y, m) => {
		const series = y === year ? window.series.current : y === year - 1 ? window.series.previous : null
		if (!series?.length) return 0
		const end = series[Math.min(day(y, m + 1, 0), series.length - 1)] ?? 0
		const first = day(y, m, 1)
		return end - (first > 0 ? series[first - 1] ?? 0 : 0)
	}
	const [y0, m0] = today().split('-').map(Number)
	const short = monthNames('short')
	const long = monthNames('long')
	const months = Array.from({ length: MONTHS }, (unused, i) => {
		const at = new Date(y0, m0 - 1 - (MONTHS - 1 - i), 1)
		const y = at.getFullYear(), m = at.getMonth()
		const mm = String(m + 1).padStart(2, '0')
		const spend = spendIn(y, m)
		return {
			key: `${y}-${mm}`, from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`,
			tick: short[m].charAt(0).toLocaleUpperCase(), label: `${long[m]} ${y}, ${currency(spend, 0)}`, spend
		}
	})
	const most = Math.max(...months.map(c => c.spend), 0)
	return months.map((c, i) => ({ ...c, height: most ? (c.spend / most) * 100 : 0, muted: i < MONTHS - 1 }))
}

function greeting(name) {
	const hour = new Date().getHours()
	const words = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'
	return name ? `${words}, ${name}` : words
}

/** The account's own first name, when it has one. */
const firstName = user => String(user?.name ?? '').trim().split(/\s+/)[0] || null

/* ---- the page ---- */

export default function Home() {
	const touch = useShellShape() === 'touch'
	const month = useApi(getStatsSlice, [MONTH])
	const categories = useApi(getCategories)
	const recent = useApi(getOrders, [{ pageSize: RECENT }])
	const attention = useApi(getHomeAttention)
	const name = firstName(useApi(getCurrentUser).data)
	const settings = useApi(getSettings)
	const loud = loudness(settings.data)
	const view = monthView(month.data?.window, categories.data, loud.early)
	// the summary waits for the settings, so one switched off never flashes up
	const known = settings.data !== undefined || !!settings.error
	const summary = useApi(getMonthlySummary, [], { enabled: known && loud.summary })
	const toast = useToast()
	const [putAway, setPutAway] = useState(null)
	const hide = async month => {
		setPutAway(month)
		try {
			await putSummaryAway(month)
		} catch (error) {
			setPutAway(null)
			toast({ message: failureMessage(error, 'The summary was not hidden. Try again.'), color: 'danger' })
		}
	}
	const due = summary.data
	const notice = known && loud.summary && due?.orders && !due.seen && putAway !== due.month && categories.data
		? <MonthlySummary summary={due} categories={categories.data} early={loud.early} onHide={() => hide(due.month)} />
		: null
	if (recent.data && !recent.data.total) return <DayOne categories={categories.data} name={name} touch={touch} />
	const props = { month, categories, view, recent, attention: attention.data, name, notice }
	return touch ? <PhoneHome {...props} /> : <DesktopHome {...props} />
}

/** Asks again only for what failed. */
const retrying = (...reads) => () => reads.forEach(read => { if (read.error) read.refresh() })

function DesktopHome({ month, categories, view, recent, attention, notice }) {
	const newest = recent.data?.orders[0]
	const lost = month.error || categories.error
	return (
		<div className="hm-page sp-stack sp-gap-12">
			{notice}
			<div className="hm-split sp-gap-12">
				{month.error
					? (
						<Hold shape={<MonthCard />}>
							<Failed variant="card" label="This month" what="This month" error={month.error} onRetry={month.refresh} />
						</Hold>
					)
					: <MonthCard w={month.data?.window} view={view} limitsLost={!!categories.error} lastAdded={attention?.lastAdded} />}
				<CaptureCard newest={newest} loading={recent.loading && !recent.data} />
			</div>
			<div className="hm-split hm-split--start sp-gap-12">
				<div className="sp-stack sp-gap-12">
					{lost ? null : <AlertsCard view={view} attention={attention} />}
					<RecentCard recent={recent} />
				</div>
				<div className="sp-stack sp-gap-12">
					{lost
						? (
							<Hold shape={<CategoriesCard />}>
								<Failed variant="card" label="Categories this month" what="This month's categories" error={lost} onRetry={retrying(month, categories)} />
							</Hold>
						)
						: <CategoriesCard view={view} />}
					<MonthsCard />
				</div>
			</div>
		</div>
	)
}

/** A skeleton the size of the small text button it stands in for. */
function ButtonSkeleton({ label }) {
	return (
		<Hold shape={<Button variant="text" size="small">{label}</Button>}>
			<span className="hm-fill"><Skeleton shape="line" data-w="44" data-h="13" /></span>
		</Hold>
	)
}

function MonthCard({ w, view, limitsLost = false, lastAdded }) {
	const ago = lastAdded ? daysAgo(localDay(lastAdded)) : null
	const figure = width => <span className="hm-line"><Skeleton shape="line" data-w={width} data-h="22" /></span>
	return (
		<Card variant="shell">
			<div className="sp-stack sp-grow sp-gap-12 hm-spread">
				<div className="sp-row-flex sp-gap-12">
					{w
						? <span className="sp-section-label">{capital(monthOf(w))} {w.from.slice(0, 4)}{dot}day {w.pace.daysIn} of {w.pace.unitDays}</span>
						: <span className="sp-section-label hm-line"><Skeleton shape="line" data-w="130" data-h="11" /></span>}
					<span className="sp-grow" />
					{ago ? <span className="sp-meta">last added {ago}</span> : null}
				</div>
				<div className="sp-row-flex sp-gap-16 sp-wrap">
					<Stat label="Spent this month" large figure={w ? currency(w.spent, 0) : figure('130')} />
					<Stat label="Saved" color={!w ? 'default' : isSaving(w.saved, 0) ? 'success' : 'zero'} figure={w ? currency(w.saved, 0) : figure('96')} />
					<Stat label="Orders" figure={w ? amount(w.orders, 0) : figure('44')} />
				</div>
				{view
					? <Limits view={view} />
					: (
						<div className="sp-stack sp-gap-8">
							<Gauge value={0} untargeted={limitsLost} aria-label="Share of this month's limits used" />
							{limitsLost
								? <span className="sp-meta">Your limits did not load.</span>
								: <span className="sp-meta hm-line"><Skeleton shape="line" data-w="130" data-h="11" /></span>}
						</div>
					)}
			</div>
		</Card>
	)
}

function Limits({ view }) {
	const { window: w, limits, pace } = view
	if (!limits) return (
		<div className="sp-stack sp-gap-8">
			<Gauge value={0} untargeted aria-label="No limit set" />
			<span className="sp-meta">No monthly limits yet. Set one on a category to follow the month here.</span>
		</div>
	)
	const used = (w.spent / limits) * 100
	const ahead = used > pace
	return (
		<div className="sp-stack sp-gap-8">
			<Gauge {...against(w.spent, limits, pace)} aria-label="Share of this month's limits used" />
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-meta">{amount(Math.round(used), 0)}% of {currency(limits, 0)} in limits</span>
				<span className="sp-grow" />
				<span className={ahead ? 'sp-meta sp-meta--over sp-row-flex sp-gap-6' : 'sp-meta sp-row-flex sp-gap-6'}>
					<GaugeKey aria-hidden="true" />{ahead ? 'ahead of pace' : 'below pace'}
				</span>
			</div>
		</div>
	)
}

/** An alert row while the month loads: the row's own box, holding bars. */
function AlertSkeleton({ width }) {
	return (
		<ListItem mark={<span className="hm-mark"><Skeleton shape="line" data-w="18" data-h="22" /></span>}>
			<span className="sp-data sp-grow hm-line"><Skeleton shape="line" data-w={width} data-h="13" /></span>
		</ListItem>
	)
}

/** What needs a look, by severity: categories over their limit, then near it (8b), then orders
    without a receipt, then vendors whose names look alike. A count of zero is no row at all. */
function alertsOf(view, attention) {
	const w = view.window
	const over = view.over.map(c => ({
		key: c.id, to: ordersFor(c, w), color: 'warning', count: '!', phone: 'over',
		text: <><b>{c.name} is {currency(c.monthSpend - c.budget, 0)} over</b> its limit for {monthOf(w)}</>
	}))
	const near = view.near.map(c => ({
		key: c.id, to: ordersFor(c, w), color: 'warning', count: '!',
		text: <><b>{c.name} is at {Math.floor((c.monthSpend / c.budget) * 100)}%</b> of its limit for {monthOf(w)}</>
	}))
	const receipts = attention?.withoutReceipt
		? [{
			key: 'receipt', to: '/orders?view=missing-receipt', count: amount(attention.withoutReceipt, 0),
			text: `${attention.withoutReceipt === 1 ? 'order' : 'orders'} without a receipt attached`, phone: 'missing a receipt'
		}]
		: []
	// one obvious pair also offers Merge, which opens 5j's comparison over the list (16a)
	const pair = attention?.lookalikePair
	const lookalikes = attention?.lookalikeVendors
		? [{
			key: 'vendors', to: '/vendors?flag=possible-duplicate', count: amount(attention.lookalikeVendors, 0),
			// with two buttons beside it a phone's line is shorter, so it stays one line
			text: 'vendors look like duplicates', phone: pair ? 'look alike' : 'look like duplicates',
			actions: pair
				? <>
					<Button variant="outline" size="small" to="/vendors?flag=possible-duplicate">Review</Button>
					<Button variant="outline" size="small" to="/vendors?flag=possible-duplicate" state={{ merge: { source: pair.merge, target: pair.keep } }}>Merge</Button>
				</>
				: null
		}]
		: []
	return { over, near, others: [...receipts, ...lookalikes] }
}

function AlertsCard({ view, attention }) {
	const alerts = view ? alertsOf(view, attention) : null
	const all = alerts ? [...alerts.over, ...alerts.near, ...alerts.others] : []
	if (alerts && !all.length) return null
	const shown = all.slice(0, ALERTS)
	const counted = alerts ? <span className="sp-meta">{all.length > ALERTS ? `${shown.length} of ${amount(all.length, 0)} things` : plural(all.length, 'thing')}</span> : null
	// past the cap the true total of categories over their limit rides on a link, as Recent orders' does
	const more = alerts && alerts.over.length > ALERTS
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">Needs a look</span>
				{more ? counted : null}
				<span className="sp-grow" />
				{more ? <Button variant="text" size="small" to="/categories">All {amount(alerts.over.length, 0)}</Button> : counted}
			</Toolbar>
			<CardBody>
				<div className="sp-stack sp-gap-8">
					{alerts
						? shown.map(a => (
							<ListItem key={a.key} to={a.actions ? undefined : a.to} color={a.color} chevron={a.actions ? undefined : CHEVRON} count={a.count} actions={a.actions}>
								<span className="sp-grow sp-truncate">{a.text}</span>
							</ListItem>
						))
						: ['62pc', '48pc', '55pc'].map(width => <AlertSkeleton key={width} width={width} />)}
				</div>
			</CardBody>
		</Card>
	)
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh']
const countWord = n => COUNT_WORDS[n] ?? amount(n, 0)
// the summary says three things at most; the sentence above them counts every category
const SUMMARY_ROWS = 3

/** "One category went over, one finished close, and Textiles has room to spare." */
function summarySentence(over, close, room) {
	const parts = [
		over.length ? `${countWord(over.length)} ${over.length === 1 ? 'category' : 'categories'} went over` : 'every category stayed under its limit',
		close.length ? `${countWord(close.length)} finished close` : null,
		room ? `${room.name} has room to spare` : null
	].filter(Boolean)
	const said = parts.length > 2 ? `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}` : parts.join(' and ')
	return `${capital(said)}.`
}

/** Last month against its limits, said once (8b, 6f): from the first of the month until the reader
    hides it. Each row opens that month's orders in the category. */
function MonthlySummary({ summary, categories, early, onHide }) {
	const month = monthNames('long')[Number(summary.month.slice(5)) - 1]
	const byId = new Map(categories.map(c => [c.id, c]))
	const rows = summary.limits
		.map(l => ({ ...byId.get(l.id), spend: l.spend, overs: l.overs }))
		.filter(c => c.name && c.budget > 0)
		.map(c => ({ ...c, used: (c.spend / c.budget) * 100 }))
	const over = rows.filter(c => c.spend > c.budget).sort((a, b) => b.spend - b.budget - (a.spend - a.budget))
	const close = early < 100 ? rows.filter(c => c.spend <= c.budget && c.used >= early).sort((a, b) => b.used - a.used) : []
	const room = rows.filter(c => !over.includes(c) && !close.includes(c)).sort((a, b) => a.used - b.used || a.name.localeCompare(b.name))[0]
	const limits = rows.reduce((sum, c) => sum + c.budget, 0)
	const of = c => `${amount(c.spend, 0)} of ${currency(c.budget, 0)}`
	const link = c => `/orders?category=${c.id}&from=${summary.from}&to=${summary.to}`
	const lines = [
		...over.map(c => ({
			c, color: 'danger', mark: <CategoryMark category={c} size="small" />,
			said: `went ${currency(c.spend - c.budget, 0)} over`,
			meta: c.overs >= 12 ? 'Over in all twelve months. The limit may be too low.'
				: c.overs >= 2 ? `${ORDINALS[c.overs]} time in twelve months.${c.overs >= 3 ? ' The limit may be too low.' : ''}` : of(c),
			adjust: true
		})),
		...close.map(c => ({
			c, mark: <Mark size="small" fill="solid" swatch="green-3" aria-hidden="true" aria-label="Close to its limit"><Icon name="alert-triangle" size={13} /></Mark>,
			said: `finished at ${Math.floor(c.used)}%`, meta: of(c)
		})),
		...(room ? [{ c: room, mark: <Mark size="small" aria-hidden="true" aria-label={room.name}><Icon name={glyphOf(room.icon)} size={13} /></Mark>, said: `used ${Math.round(room.used)}%`, meta: of(room) }] : [])
	].slice(0, SUMMARY_ROWS)
	return (
		<Card footer={[
			<div className="sp-stack sp-grow" key="saved">
				<span className="sp-section-label">Saved in {month}</span>
				<span className={isSaving(summary.saved, 0) ? 'sp-stat__figure sp-ink-accent' : 'sp-stat__figure sp-ink-5'}>{currency(summary.saved, 0)}</span>
			</div>,
			<Button key="open" size="small" to={`/statistics?range=month&period=${summary.month}`}>Open statistics</Button>
		]}>
			<div className="hm-top">
				<div className="sp-stack sp-gap-6 sp-grow">
					<span className="sp-section-label">{month} {summary.month.slice(0, 4)}</span>
					<span className="sp-heading">
						{limits ? `You spent ${currency(summary.spent, 0)} against ${amount(limits, 0)} in limits` : `You spent ${currency(summary.spent, 0)} in ${month}`}
					</span>
					{rows.length ? <span className="sp-data">{summarySentence(over, close, room)}</span> : null}
				</div>
				<IconButton icon="x" aria-label={`Hide the summary of ${month}`} onClick={onHide} />
			</div>
			{lines.length
				? (
					<div className="sp-stack sp-gap-12">
						{lines.map(line => (
							<ListItem key={line.c.id} color={line.color} mark={line.mark}
								actions={line.adjust ? <Button variant="outline" size="small" to={`/categories/${line.c.id}/edit`}>Adjust</Button> : null}>
								<Link className="sp-stack sp-gap-6 sp-grow hm-link" to={link(line.c)}>
									<span className="sp-title hm-said"><span className="sp-truncate">{line.c.name}</span><span className="sp-nowrap">{line.said}</span></span>
									<span className="sp-meta">{line.meta}</span>
								</Link>
							</ListItem>
						))}
					</div>
				)
				: null}
		</Card>
	)
}

function RecentCard({ recent }) {
	const orders = recent.data?.orders
	const total = recent.data?.total
	const caption = (
		<>
			<span className="sp-section-label">Recent orders</span>
			{total ? <span className="sp-meta">newest {Math.min(RECENT, orders.length)}</span> : null}
			<span className="sp-grow" />
			{total ? <Button variant="text" size="small" to="/orders">All {amount(total, 0)}</Button> : null}
		</>
	)
	const loading = <RecentList caption={caption} />
	if (recent.error) return (
		<Hold shape={loading}>
			<Failed variant="card" label="Recent orders" what="Your recent orders" error={recent.error} onRetry={recent.refresh} />
		</Hold>
	)
	if (orders && !orders.length) return (
		<Hold shape={loading}>
			<Card variant="flush">
				<Toolbar>{caption}</Toolbar>
				<div className="sp-stack sp-grow hm-fill">
					<Empty>
						<span className="sp-heading">No orders yet</span>
						<span className="sp-meta">Drop a receipt and it becomes your first order. Or start an empty order and type it yourself.</span>
						<Button size="small" to="/orders/new">Empty order</Button>
					</Empty>
				</div>
			</Card>
		</Hold>
	)
	return <RecentList caption={caption} orders={orders} />
}

function RecentList({ caption, orders }) {
	return (
		<List data={orders ?? [1, 2, 3, 4]} recordKey={o => o.id ?? o} noun="orders" headless locale={NUMBER_LOCALE}
			rowTo={orders ? o => `/orders/${o.id}` : undefined}>
			<Caption>{caption}</Caption>
			<ListHead>
				<ListCell width="title" />
				<ListCell width="date" />
				<ListCell width="status" />
				<ListCell width="amount" />
			</ListHead>
			<ListRow>{o => (orders ? (
				<>
					<ListCell cell="flex"><OrderHead order={o} /></ListCell>
					<ListCell><span className="sp-data">{rowDate(o.date)}</span></ListCell>
					<ListCell><StatusPill status={o.status} /></ListCell>
					<ListCell cell="amount"><span className="sp-amount">{currency(o.total)}</span></ListCell>
				</>
			) : (
				<>
					<ListCell cell="flex">
						<Skeleton shape="mark" />
						<span className="sp-stacked sp-grow"><Skeleton shape="line" data-w="62pc" data-h="13" /><Skeleton shape="line" data-w="44pc" data-h="10" /></span>
					</ListCell>
					<ListCell><Skeleton shape="line" data-w="44" /></ListCell>
					<ListCell><Skeleton shape="pill" /></ListCell>
					<ListCell cell="amount"><Skeleton shape="end" data-w="96" /></ListCell>
				</>
			))}</ListRow>
		</List>
	)
}

function OrderHead({ order }) {
	return (
		<>
			<OrderPhoto order={order} />
			<span className="sp-stacked">
				<span className="sp-title sp-truncate">{order.vendor?.name}</span>
				<span className="sp-meta sp-truncate">{order.reference ? `${order.reference}${dot}` : ''}{plural(order.itemCount, 'item')}</span>
			</span>
		</>
	)
}

function CaptureCard({ newest, loading }) {
	const navigate = useNavigate()
	const input = useId()
	const reads = useApi(getCurrentUser).data?.scanAiEnabled
	const take = files => { if (files?.[0]) navigate('/orders/new?source=scan', { state: { file: files[0] } }) }
	const footer = newest
		? [
			<span className="sp-subtitle sp-grow" key="ask">Bought from {newest.vendor?.name} again?</span>,
			<Button variant="text" size="small" to={`/orders/new?duplicate=${newest.id}`} key="copy">Duplicate last order</Button>
		]
		: loading
			? [
				<span className="sp-subtitle sp-grow hm-line" key="ask"><Skeleton shape="line" data-w="130" data-h="13" /></span>,
				<ButtonSkeleton label="Duplicate last order" key="copy" />
			]
			: undefined
	return (
		<Card footer={footer}>
			<span className="sp-section-label">Add an order</span>
			<FileDrop id={input} accept={FILE_TYPES} onFiles={take}>
				<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Receipt"><Icon name="camera" size={19} /></Mark>
				<span className="sp-title">Drop a receipt here</span>
				<span className="sp-subtitle">
					{reads === false
						? 'Image or PDF. It is attached to a new order, and you type in the details.'
						: 'Image or PDF. The vendor, date and lines are read for you to check.'}
				</span>
			</FileDrop>
			<div className="sp-fields">
				<Button size="small" onClick={() => document.getElementById(input)?.click()}>Choose file</Button>
				<Button variant="outline" size="small" to="/orders/new">Empty order</Button>
			</div>
		</Card>
	)
}

function CategoriesCard({ view }) {
	const top = view?.top
	const loading = (
		<Card>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">Categories this month</span>
				<span className="sp-grow" />
				<ButtonSkeleton label="All 10" />
			</div>
			{['96', '76', '88', '64'].map(width => (
				<div className="sp-stack sp-gap-6" key={width}>
					<div className="sp-row-flex sp-gap-8">
						<span className="hm-mark"><Skeleton shape="line" data-w="18" data-h="22" /></span>
						<span className="sp-data hm-line"><Skeleton shape="line" data-w={width} data-h="13" /></span>
						<span className="sp-grow" />
						<span className="sp-meta hm-line"><Skeleton shape="line" data-w="76" data-h="11" /></span>
					</div>
					<Gauge value={0} untargeted aria-label="Loading" />
				</div>
			))}
		</Card>
	)
	if (!view) return loading
	const header = (
		<div className="sp-row-flex sp-gap-8">
			<span className="sp-section-label">Categories this month</span>
			{top.length ? <span className="sp-meta">top {top.length} by spend</span> : null}
			<span className="sp-grow" />
			{view.withSpend ? <Button variant="text" size="small" to="/categories">All {amount(view.withSpend, 0)}</Button> : null}
		</div>
	)
	if (top.length) return (
		<Card>
			{header}
			{top.map(c => <CategoryLine key={c.id} category={c} early={view.early} />)}
		</Card>
	)
	return (
		<Hold shape={loading}>
			<Card>
				{header}
				<div className="sp-stack sp-grow hm-fill">
					{view.count
						? (
							<Empty>
								<span className="sp-heading">Nothing spent in {monthOf(view.window)} yet</span>
								<span className="sp-meta">Add an order and its categories show here, against their limits.</span>
							</Empty>
						)
						: (
							<Empty>
								<span className="sp-heading">No categories yet</span>
								<span className="sp-meta">Categories group your spend and carry the monthly limit.</span>
								<Button size="small" to="/categories/new">New category</Button>
							</Empty>
						)}
				</div>
			</Card>
		</Hold>
	)
}

/* Each row opens Statistics on this month with the category as its crumb (10a). Its figures warn
   from the share of the limit the reader chose (8b). */
function CategoryLine({ category: c, early }) {
	const limited = c.budget > 0
	const warn = overBudget(c) || nearLimit(c, early)
	return (
		<Link className="sp-stack sp-gap-6 hm-link" to={`/statistics?range=month&crumbs=category:${c.id}`}>
			<div className="sp-row-flex sp-gap-8">
				<CategoryMark category={c} size="small" />
				<span className="sp-data sp-grow sp-truncate">{c.name}</span>
				<span className={warn ? 'sp-meta sp-meta--over' : 'sp-meta'}>
					{limited ? `${amount(c.monthSpend, 0)} / ${amount(c.budget, 0)}` : `${amount(c.monthSpend, 0)}${dot}no limit`}
				</span>
			</div>
			{limited
				? <Gauge {...against(c.monthSpend, c.budget)} aria-label={`${c.name} against its limit`} />
				: <Gauge value={0} untargeted aria-label="No limit set" />}
		</Link>
	)
}

function MonthsCard() {
	const navigate = useNavigate()
	const year = useApi(getStatsSlice, [YEAR])
	const months = year.data ? lastMonths(year.data.window) : null
	const average = months ? months.reduce((sum, c) => sum + c.spend, 0) / months.length : null
	const card = (
		<Card footer={[
			<span className="sp-subtitle sp-grow" key="label">Monthly average</span>,
			average === null
				? <span className="sp-amount hm-line" key="value"><Skeleton shape="line" data-w="76" data-h="13" /></span>
				: <span className="sp-amount" key="value">{currency(average, 0)}</span>
		]}>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">Last {MONTHS} months</span>
				<span className="sp-grow" />
				<Button variant="text" size="small" to="/statistics">Statistics</Button>
			</div>
			<Bars columns={months ?? []} loading={!months} current={today().slice(0, 7)}
				onSelect={key => navigate(`/statistics?period=${key.slice(0, 4)}&crumbs=month:${key}`)} />
		</Card>
	)
	if (year.error) return (
		<Hold shape={card}>
			<Failed variant="card" label={`Last ${MONTHS} months`} what="The last months" error={year.error} onRetry={year.refresh} />
		</Hold>
	)
	return card
}

/* ---- below 640: the phone's own composition (7a) ---- */

function PhoneHome({ month, categories, view, recent, attention, name, notice }) {
	const w = month.data?.window
	return (
		<>
			<div className="sp-stacked">
				<span className="sp-stat__figure">{greeting(name)}</span>
				{w
					? <span className="sp-data">{capital(monthOf(w))}, day {w.pace.daysIn} of {w.pace.unitDays}</span>
					: <span className="sp-data hm-line"><Skeleton shape="line" data-w="130" data-h="13" /></span>}
			</div>
			{notice}
			{month.error
				? (
					<Hold shape={<PhoneMonth />}>
						<Failed variant="card" label="This month" what="This month" error={month.error} onRetry={retrying(month, categories)} />
					</Hold>
				)
				: <PhoneMonth w={w} view={view} limitsLost={categories.error ? categories.refresh : null} />}
			{month.error || categories.error ? null : <PhoneAlerts view={view} attention={attention} />}
			<PhoneRecent recent={recent} />
		</>
	)
}

/** `limitsLost` asks for the limits again when only they failed: the month's own figure still shows. */
function PhoneMonth({ w, view, limitsLost }) {
	if (w && limitsLost) return (
		<Card>
			<span className="sp-section-label">This month</span>
			<span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>
			<div className="sp-stack sp-gap-8">
				<Gauge value={0} untargeted aria-label="Share of this month's limits used" />
				<div className="sp-row-flex sp-gap-8">
					<span className="sp-meta sp-grow">Your limits did not load.</span>
					<Button variant="text" size="small" onClick={limitsLost}>Try again</Button>
				</div>
			</div>
		</Card>
	)
	if (!view) return (
		<Card>
			<span className="sp-section-label">This month</span>
			<span className="sp-stat__figure sp-stat__figure--large hm-line"><Skeleton shape="line" data-w="130" data-h="22" /></span>
			<Gauge value={0} aria-label="Share of this month's limits used" />
		</Card>
	)
	const { limits, pace } = view
	return (
		<Card>
			<span className="sp-section-label">This month</span>
			{limits
				? (
					<div className="sp-row-flex sp-gap-8 sp-baseline">
						<span className="sp-stat__figure sp-stat__figure--large">{amount(w.spent, 0)}</span>
						<span className="sp-data sp-ink-5">of {currency(limits, 0)}</span>
					</div>
				)
				: <span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>}
			{limits
				? <Gauge {...against(w.spent, limits, pace)} aria-label="Share of this month's limits used" />
				: (
					<div className="sp-stack sp-gap-8">
						<Gauge value={0} untargeted aria-label="No limit set" />
						<span className="sp-meta">No monthly limits yet. Set one on a category to follow the month here.</span>
					</div>
				)}
		</Card>
	)
}

function PhoneAlerts({ view, attention }) {
	const alerts = view ? alertsOf(view, attention) : null
	if (alerts && !alerts.over.length && !alerts.near.length && !alerts.others.length) return null
	const chevron = <Icon name="chevron-right" size={13} />
	return (
		<Card>
			<span className="sp-section-label">Needs a look</span>
			{alerts
				? (
					<>
						{alerts.over.length
							? (
								<ListItem to="/categories" color="warning" chevron={chevron} count={amount(alerts.over.length, 0)}>
									<span className="sp-data sp-ink-warning sp-grow">over {alerts.over.length === 1 ? 'its' : 'their'} limit</span>
								</ListItem>
							)
							: null}
						{alerts.near.length
							? (
								<ListItem to="/categories" color="warning" chevron={chevron} count={amount(alerts.near.length, 0)}>
									<span className="sp-data sp-ink-warning sp-grow">near {alerts.near.length === 1 ? 'its' : 'their'} limit</span>
								</ListItem>
							)
							: null}
						{alerts.others.map(a => (
							<ListItem key={a.key} to={a.actions ? undefined : a.to} chevron={a.actions ? undefined : chevron} count={a.count} actions={a.actions}>
								<span className={a.actions ? 'sp-data sp-grow sp-truncate' : 'sp-data sp-grow'}>{a.phone}</span>
							</ListItem>
						))}
					</>
				)
				: <AlertSkeleton width="44pc" />}
		</Card>
	)
}

function PhoneRecent({ recent }) {
	const orders = recent.data?.orders
	const loading = (
		<Card>
			<span className="sp-section-label">Recent orders</span>
			{[0, 1, 2].map(i => (
				<div className="sp-row-flex sp-gap-12 hm-order" key={i}>
					<Skeleton shape="mark" />
					<span className="sp-stacked sp-grow"><Skeleton shape="line" data-w="62pc" data-h="13" /><Skeleton shape="line" data-w="44pc" data-h="10" /></span>
					<Skeleton shape="line" data-w="64" />
				</div>
			))}
		</Card>
	)
	if (recent.error) return (
		<Hold shape={loading}>
			<Failed variant="card" label="Recent orders" what="Your recent orders" error={recent.error} onRetry={recent.refresh} />
		</Hold>
	)
	if (!orders) return loading
	if (!orders.length) return (
		<Hold shape={loading}>
			<Card>
				<span className="sp-section-label">Recent orders</span>
				<div className="sp-stack sp-grow hm-fill">
					<span className="sp-meta">No orders yet. Press the plus button to add your first.</span>
				</div>
			</Card>
		</Hold>
	)
	return (
		<Card>
			<span className="sp-section-label">Recent orders</span>
			{orders.slice(0, 3).map(o => <PhoneOrder key={o.id} order={o} />)}
		</Card>
	)
}

function PhoneOrder({ order }) {
	return (
		<Link className="sp-row-flex sp-gap-12 hm-order" to={`/orders/${order.id}`}>
			<OrderPhoto order={order} />
			<div className="sp-stacked sp-grow">
				<span className="sp-title sp-truncate">{order.vendor?.name}</span>
				<span className="sp-meta">{rowDate(order.date)}{dot}{plural(order.itemCount, 'item')}</span>
			</div>
			<span className="sp-title sp-nowrap">{amount(order.total)}</span>
		</Link>
	)
}

/* ---- an account with no orders yet: the first-run Home (20d) ---- */

function DayOne({ categories, name, touch }) {
	const navigate = useNavigate()
	const take = files => { if (files?.[0]) navigate('/orders/new?source=scan', { state: { file: files[0] } }) }
	const reads = useApi(getCurrentUser).data?.scanAiEnabled
	const first = categories?.slice(0, 4) ?? []
	return (
		<div className={touch ? 'sp-stack sp-gap-12' : 'hm-day-one'}>
			<Card>
				<div className="sp-stack">
					<span className="sp-stat__figure sp-stat__figure--large">{greeting(name)}</span>
					<span className="sp-data">{capital(monthNames('long')[Number(today().slice(5, 7)) - 1])}{dot}nothing recorded yet</span>
				</div>
				<FileDrop accept={FILE_TYPES} onFiles={take} icon="camera">
					<span className="sp-heading">Start with a receipt</span>
					<span className="sp-data hm-w300">
						{reads === false
							? 'Drop a photo or a PDF. It is attached to a new order, and you type in the details.'
							: 'Drop a photo or a PDF and the lines are read for you to check.'}
					</span>
					<span className="sp-btn">Capture a receipt</span>
					<Button variant="text" size="small" to="/orders/new">Or enter one by hand</Button>
				</FileDrop>
				<div className={touch ? 'sp-stack sp-gap-12' : 'hm-wells'}>
					<Well>
						<span className="sp-section-label">This month</span>
						<span className="sp-stat__figure sp-ink-5">{currency(0)}</span>
						<Gauge thin value={0} untargeted aria-label="No limit set" />
						<span className="sp-meta">Set a monthly limit once you have recorded a few orders.</span>
					</Well>
					<Well>
						<span className="sp-section-label">Your categories</span>
						{first.map(c => (
							<span className="sp-row-flex sp-gap-10" key={c.id}>
								<CategoryMark category={c} size="small" />
								<span className="sp-title">{c.name}</span>
							</span>
						))}
						{categories && !categories.length ? <span className="sp-meta">No categories yet.</span> : null}
						<Button variant="text" size="small" to="/categories/new">{categories?.length ? 'Add another' : 'Add one'}</Button>
					</Well>
				</div>
			</Card>
		</div>
	)
}
