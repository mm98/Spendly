import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardBody, Toolbar } from '../components/Card.jsx'
import { Bars, Gauge, GaugeKey, Stat } from '../components/Data.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Caption, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { Icon } from '../components/Icon.jsx'
import { Alert } from '../components/Overlays.jsx'
import { Empty, Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { CategoryMark } from '../app/categoryMark.jsx'
import { OrderPhoto } from '../app/orderRow.jsx'
import {
	failureMessage, getCategories, getCurrentUser, getOrders, getStats, overBudget,
	withMonthSpend
} from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { activeLocaleCode, amount, currency, monthNames, plural, shortDate, today } from '../api/format.js'

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/gif'
const RECENT = 4
const MONTHS = 8
const CHEVRON = <Icon name="chevron-right" size={15} />

/* ---- reading the data ---- */

/** The month window and the account's categories, joined: what three cards are drawn from. */
function monthView(window, list) {
	if (!window || !list) return null
	const categories = withMonthSpend(list, window.split)
	const limits = categories.reduce((sum, c) => sum + (c.budget > 0 ? c.budget : 0), 0)
	const byOverage = c => c.monthSpend - c.budget
	return {
		window,
		count: categories.length,
		limits,
		over: categories.filter(overBudget).sort((a, b) => byOverage(b) - byOverage(a)),
		top: categories.filter(c => c.monthSpend > 0).sort((a, b) => b.monthSpend - a.monthSpend).slice(0, 4),
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

const ordersFor = (category, window) => `/orders?category=${category.id}&from=${window.from}&to=${window.to}`

const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const dayNumbers = () => new Intl.DateTimeFormat(activeLocaleCode(), { day: '2-digit', month: '2-digit' })
/** "08/08" in the reader's own order, with the year once it is not this one. */
const rowDate = iso => (iso.slice(0, 4) === today().slice(0, 4) ? dayNumbers().format(dateOf(iso)) : shortDate(iso))

function daysAgo(iso) {
	const days = Math.round((dateOf(today()) - dateOf(iso)) / 86400000)
	if (days < 0) return null
	return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

const PILL = { Delivered: { color: 'success' }, Ordered: { state: 'progress' }, Returned: { color: 'danger' } }


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
		return {
			key: `${y}-${mm}`, from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`,
			tick: short[m].charAt(0).toLocaleUpperCase(), label: `${long[m]} ${y}`, spend: spendIn(y, m)
		}
	})
	const most = Math.max(...months.map(c => c.spend), 0)
	return months.map((c, i) => ({ ...c, height: most ? (c.spend / most) * 100 : 0, muted: i < MONTHS - 1 }))
}

function greeting() {
	const hour = new Date().getHours()
	return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'
}

/* The page's own width, never the window's. Not 18a's 900: the rail is as wide as its content,
   and below this the main column leaves the order table no room for the vendor's name. */
const TWO_COLUMNS = 1060
function useWide(ref) {
	const [wide, setWide] = useState(true)
	useLayoutEffect(() => {
		const watch = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= TWO_COLUMNS))
		watch.observe(ref.current)
		return () => watch.disconnect()
	}, [ref])
	return wide
}

/* ---- the page ---- */

export default function Home() {
	const touch = useShellShape() === 'touch'
	const month = useApi(getStats, ['month', undefined, undefined])
	const categories = useApi(getCategories)
	const recent = useApi(getOrders, [{ pageSize: RECENT }])
	const view = monthView(month.data?.window, categories.data)
	const failed = month.error || categories.error
	const retry = () => { if (month.error) month.refresh(); if (categories.error) categories.refresh() }
	const props = { view, failed, retry, recent }
	return touch ? <PhoneHome {...props} /> : <DesktopHome {...props} />
}

function DesktopHome({ view, failed, retry, recent }) {
	const ref = useRef(null)
	const wide = useWide(ref)
	const newest = recent.data?.orders[0]
	return (
		<div ref={ref} className={wide ? 'sp-shell__body--split' : 'sp-stack sp-gap-12'}>
			<div className="sp-stack sp-gap-12">
				{failed ? <Failed label="This month" what="This month did not load." error={failed} retry={retry} /> : <MonthCard view={view} newest={newest} />}
				{view?.over.length ? <AlertsCard view={view} /> : null}
				<RecentCard recent={recent} />
			</div>
			<div className="sp-stack sp-gap-12">
				<CaptureCard newest={newest} loading={recent.loading && !recent.data} />
				{failed ? null : <CategoriesCard view={view} />}
				<MonthsCard />
			</div>
		</div>
	)
}

function Failed({ label, what, error, retry }) {
	return (
		<Card footer={<Button variant="outline" size="small" onClick={retry} key="retry">Try again</Button>}>
			<span className="sp-section-label">{label}</span>
			<Alert color="danger" mark="!" title={what}>{failureMessage(error, 'Check the connection, then try again.')}</Alert>
		</Card>
	)
}

function MonthCard({ view, newest }) {
	const w = view?.window
	const ago = newest ? daysAgo(newest.date) : null
	return (
		<Card variant="shell">
			<div className="sp-row-flex sp-gap-12">
				{w
					? <span className="sp-section-label">{w.label} · day {w.pace.daysIn} of {w.pace.unitDays}</span>
					: <Skeleton shape="line" data-w="130" data-h="18" />}
				<span className="sp-grow" />
				{ago ? <span className="sp-meta">last order {ago}</span> : null}
			</div>
			<div className="sp-row-flex sp-gap-16 sp-wrap">
				<Stat label="Spent this month" large figure={w ? currency(w.spent, 0) : <Skeleton shape="line" data-w="130" data-h="22" />} />
				<Stat label="Saved" color={w?.saved > 0 ? 'success' : 'default'}
					figure={w ? currency(w.saved, 0) : <Skeleton shape="line" data-w="96" data-h="22" />} />
				<Stat label="Orders" figure={w ? w.orders : <Skeleton shape="line" data-w="44" data-h="22" />} />
			</div>
			{view ? <Limits view={view} /> : (
				<div className="sp-stack sp-gap-8">
					<Gauge value={0} aria-label="Share of this month's limits used" />
					<Skeleton shape="line" data-w="130" data-h="18" />
				</div>
			)}
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
				<span className="sp-meta">{Math.round(used)}% of {currency(limits, 0)} in limits</span>
				<span className="sp-grow" />
				<span className={ahead ? 'sp-meta sp-meta--over sp-row-flex sp-gap-6' : 'sp-meta sp-row-flex sp-gap-6'}>
					<GaugeKey aria-hidden="true" />{ahead ? 'ahead of pace' : 'below pace'}
				</span>
			</div>
		</div>
	)
}

function AlertsCard({ view }) {
	const { window: w, over } = view
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">Needs a look</span>
				<span className="sp-grow" />
				<span className="sp-meta">{plural(over.length, 'thing')}</span>
			</Toolbar>
			<CardBody>
				<div className="sp-stack sp-gap-8">
					{over.slice(0, 3).map(c => (
						<ListItem key={c.id} to={ordersFor(c, w)} color="warning" chevron={CHEVRON}
							mark={<span className="sp-list-item__count">!</span>}>
							<span className="sp-grow"><b>{c.name} is {currency(c.monthSpend - c.budget, 0)} over</b> its limit for {w.shortLabelFull}</span>
						</ListItem>
					))}
				</div>
			</CardBody>
		</Card>
	)
}

function RecentCard({ recent }) {
	const navigate = useNavigate()
	if (recent.error) return <Failed label="Recent orders" what="Your recent orders did not load." error={recent.error} retry={recent.refresh} />
	const orders = recent.data?.orders
	const total = recent.data?.total
	const caption = (
		<>
			<span className="sp-section-label">Recent orders</span>
			{total ? <span className="sp-meta">newest {RECENT}</span> : null}
			<span className="sp-grow" />
			{total ? <Button variant="text" size="small" to="/orders">All {total}</Button> : null}
		</>
	)
	if (orders && !orders.length) return (
		<Card variant="flush">
			<Toolbar>{caption}</Toolbar>
			<Empty>
				<span className="sp-heading">No orders yet</span>
				<span className="sp-meta">Drop a receipt and it becomes your first order. Or start an empty order and type it yourself.</span>
				<Button size="small" to="/orders/new">Empty order</Button>
			</Empty>
		</Card>
	)
	return (
		<List data={orders ?? [1, 2, 3, 4]} recordKey={o => o.id ?? o} noun="orders" headless
			onRowClick={orders ? o => navigate(`/orders/${o.id}`) : undefined}>
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
					<ListCell><Pill {...PILL[o.status]}>{o.status}</Pill></ListCell>
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
				<span className="sp-meta sp-truncate">{order.reference ? `${order.reference} · ` : ''}{plural(order.itemCount, 'item')}</span>
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
		: loading ? [<Skeleton shape="line" data-h="18" key="ask" />, <Skeleton shape="pill" key="copy" />] : undefined
	return (
		<Card footer={footer}>
			<span className="sp-section-label">Add an order</span>
			<FileDrop id={input} accept={ACCEPT} onFiles={take}
				onDragOver={ev => ev.preventDefault()} onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer.files) }}>
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
	return (
		<Card>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">Categories this month</span>
				{top?.length ? <span className="sp-meta">top {top.length} by spend</span> : null}
				<span className="sp-grow" />
				{view?.count ? <Button variant="text" size="small" to="/categories">All {view.count}</Button> : view ? null : <Skeleton shape="pill" />}
			</div>
			{!view
				? [0, 1, 2, 3].map(i => (
					<div className="sp-stack sp-gap-6" key={i}>
						<div className="sp-row-flex sp-gap-8">
							<Skeleton shape="line" data-w="18" data-h="22" />
							<Skeleton shape="line" data-w="96" />
							<span className="sp-grow" />
							<Skeleton shape="line" data-w="76" data-h="11" />
						</div>
						<Gauge value={0} untargeted aria-label="Loading" />
					</div>
				))
				: top.length
					? top.map(c => <CategoryLine key={c.id} category={c} />)
					: view.count
						? (
							<Empty>
								<span className="sp-heading">Nothing spent in {view.window.shortLabelFull} yet</span>
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
		</Card>
	)
}

function CategoryLine({ category: c }) {
	const limited = c.budget > 0
	const over = overBudget(c)
	return (
		<div className="sp-stack sp-gap-6">
			<div className="sp-row-flex sp-gap-8">
				<CategoryMark category={c} size="small" />
				<span className="sp-data">{c.name}</span>
				<span className="sp-grow" />
				<span className={over ? 'sp-meta sp-meta--over' : 'sp-meta'}>
					{limited ? `${amount(c.monthSpend, 0)} / ${amount(c.budget, 0)}` : `${amount(c.monthSpend, 0)} · no limit`}
				</span>
			</div>
			{limited
				? <Gauge {...against(c.monthSpend, c.budget)} aria-label={`${c.name} against its limit`} />
				: <Gauge value={0} untargeted aria-label="No limit set" />}
		</div>
	)
}

function MonthsCard() {
	const navigate = useNavigate()
	const year = useApi(getStats, ['year', undefined, undefined])
	if (year.error) return <Failed label={`Last ${MONTHS} months`} what="The last months did not load." error={year.error} retry={year.refresh} />
	const months = year.data ? lastMonths(year.data.window) : null
	const average = months ? months.reduce((sum, c) => sum + c.spend, 0) / months.length : null
	return (
		<Card footer={[
			<span className="sp-subtitle sp-grow" key="label">Monthly average</span>,
			average === null ? <Skeleton shape="line" data-w="76" data-h="20" key="value" /> : <span className="sp-amount" key="value">{currency(average, 0)}</span>
		]}>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">Last {MONTHS} months</span>
				<span className="sp-grow" />
				<Button variant="text" size="small" to="/statistics">Statistics</Button>
			</div>
			<Bars columns={months ?? []} loading={!months} selected={months?.at(-1).key}
				onSelect={(key, from, to) => navigate(`/orders?from=${from}&to=${to}`)} />
		</Card>
	)
}

/* ---- below 640: the phone's own composition (7a) ---- */

function PhoneHome({ view, failed, retry, recent }) {
	const w = view?.window
	return (
		<>
			<div className="sp-stacked">
				<span className="sp-stat__figure">{greeting()}</span>
				{w ? <span className="sp-data">{w.shortLabelFull}, day {w.pace.daysIn} of {w.pace.unitDays}</span> : <Skeleton shape="line" data-w="130" data-h="20" />}
			</div>
			{failed ? <Failed label="This month" what="This month did not load." error={failed} retry={retry} /> : <PhoneMonth view={view} />}
			{view?.over.length ? (
				<Card>
					<span className="sp-section-label">Needs a look</span>
					<ListItem to="/categories" color="warning" chevron={<Icon name="chevron-right" size={13} />}
						mark={<span className="sp-list-item__count">{view.over.length}</span>}>
						<span className="sp-data sp-ink-warning sp-grow">over {view.over.length === 1 ? 'its' : 'their'} limit</span>
					</ListItem>
				</Card>
			) : null}
			<PhoneRecent recent={recent} />
		</>
	)
}

function PhoneMonth({ view }) {
	if (!view) return (
		<Card>
			<span className="sp-section-label">This month</span>
			<Skeleton shape="line" data-w="130" data-h="22" />
			<Gauge value={0} aria-label="Share of this month's limits used" />
		</Card>
	)
	const { window: w, limits, pace } = view
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
				: <Gauge value={0} untargeted aria-label="No limit set" />}
		</Card>
	)
}

function PhoneRecent({ recent }) {
	if (recent.error) return <Failed label="Recent orders" what="Your recent orders did not load." error={recent.error} retry={recent.refresh} />
	const orders = recent.data?.orders
	return (
		<Card>
			<span className="sp-section-label">Recent orders</span>
			{!orders
				? [0, 1, 2].map(i => (
					<div className="sp-row-flex sp-gap-12" key={i}>
						<Skeleton shape="mark" />
						<span className="sp-stacked sp-grow"><Skeleton shape="line" data-w="62pc" data-h="13" /><Skeleton shape="line" data-w="44pc" data-h="10" /></span>
						<Skeleton shape="line" data-w="64" />
					</div>
				))
				: orders.length
					? orders.slice(0, 3).map(o => <PhoneOrder key={o.id} order={o} />)
					: <span className="sp-meta">No orders yet. Press the plus button to add your first.</span>}
		</Card>
	)
}

function PhoneOrder({ order }) {
	const navigate = useNavigate()
	const open = () => navigate(`/orders/${order.id}`)
	return (
		<div className="sp-row-flex sp-gap-12" role="link" tabIndex={0} onClick={open}
			onKeyDown={ev => { if (ev.key === 'Enter') open() }}>
			<OrderPhoto order={order} />
			<div className="sp-stacked sp-grow">
				<span className="sp-title sp-truncate">{order.vendor?.name}</span>
				<span className="sp-meta">{rowDate(order.date)} · {plural(order.itemCount, 'item')}</span>
			</div>
			<span className="sp-title sp-nowrap">{amount(order.total)}</span>
		</div>
	)
}
