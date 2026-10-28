import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardBody, CardHeader, Toolbar } from '../components/Card.jsx'
import { Bars, ChartTip, Gauge, GaugeKey, Stat } from '../components/Data.jsx'
import { FILE_TYPES, FileDrop } from '../components/FileDrop.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Caption, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast, Leaving } from '../components/Overlays.jsx'
import { Well } from '../components/Well.jsx'
import { Icon } from '../components/Icon.jsx'

import { Empty, Hold, Skeleton } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { CategoryIcon, CategoryMark, swatchOf } from '../app/categoryMark.jsx'
import { OrderAmount, OrderPhoto, StatusPill, vendorName } from '../app/orderRow.jsx'
import { useStatusTypes } from '../app/statuses.js'
import {
	failureMessage, getCategoryPage, getCounts, getCurrentUser, getDrafts, getHomeAttention, getLimitedCategories, getMonthlySummary, getComparedMonth, getOrders, getSettings, getStatsMonths, getStatsSlice, thisMonthSlice,
	overBudget, putSummaryAway, scanThumbnailUrl, withMonthSpend
} from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, activeLocaleCode, amount, currency, dot, isSaving, monthNames, plural, today } from '../api/format.js'
import { CopyPicker } from './CopyPicker.jsx'
import { alertsOf, looksIn, monthOf } from './needsLook.jsx'

// how many orders Recent orders shows when the settings did not load
const RECENT = 5
const DRAFTS = 3
// how often a draft still being read asks again, so its row moves on once the reading ends
const READING_MS = 5000
const MONTHS = 8
const ALERTS = 3
// Home's figures are what was paid, as Statistics opens on
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

/** The month window joined with every category with a limit, how many categories there are (`count`)
    and the four that spent most (`top`, in the window's order): what three cards are drawn from. */
function monthView(window, limited, count, early, top) {
	if (!window || !limited || count === undefined || !top) return null
	const categories = withMonthSpend(limited, window.split)
	const byOverage = c => c.monthSpend - c.budget
	const spent = withMonthSpend(top, window.split)
	return {
		window,
		count,
		withSpend: window.split.filter(s => s.id && s.amount > 0).length,
		early,
		over: categories.filter(overBudget).sort((a, b) => byOverage(b) - byOverage(a)),
		near: categories.filter(c => nearLimit(c, early)).sort((a, b) => b.monthSpend / b.budget - a.monthSpend / a.budget),
		top: spent.slice(0, 4),
		pace: window.pace.unitDays ? (window.pace.daysIn / window.pace.unitDays) * 100 : 100
	}
}

/** Where a category gauge's fill, overage and marker sit: the bar is the larger of spend and limit. */
function against(spent, limit, pace) {
	const scale = Math.max(spent, limit) || 1
	return {
		value: (Math.min(spent, limit) / scale) * 100,
		over: spent > limit ? ((spent - limit) / scale) * 100 : undefined,
		marker: pace === undefined ? undefined : (pace * limit) / scale
	}
}

/** This month's bar against one whole earlier month: full and no further once passed, never an over
    segment; the share itself keeps counting. `pace` is the share of the month gone. */
function againstMonth(spent, compared, pace) {
	return { value: Math.min(100, (spent / compared) * 100), marker: pace }
}

/** The compared month by name, with its year when that is not the window's own: "July", "August 2025". */
function comparedName(compared, window) {
	const name = monthNames('long')[Number(compared.month.slice(5)) - 1]
	return compared.month.slice(0, 4) === window.from.slice(0, 4) ? name : `${name} ${compared.month.slice(0, 4)}`
}

/** The window's month in the account's own language, as Statistics and the month bars write it. */
const capital = text => text.charAt(0).toLocaleUpperCase() + text.slice(1)


const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const dayNumbers = () => new Intl.DateTimeFormat(activeLocaleCode(), { day: '2-digit', month: '2-digit' })
const dayNumbersShortYear = () => new Intl.DateTimeFormat(activeLocaleCode(), { day: '2-digit', month: '2-digit', year: '2-digit' })
/** "08/08" in the reader's own order, with a two-digit year ("08/08/24") once it is not this one. */
const rowDate = iso => (iso.slice(0, 4) === today().slice(0, 4) ? dayNumbers() : dayNumbersShortYear()).format(dateOf(iso))

/** The reader's own calendar day of a moment in epoch seconds. */
const localDay = seconds => { const at = new Date(seconds * 1000); return new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }

function daysAgo(iso) {
	const days = Math.round((dateOf(today()) - dateOf(iso)) / 86400000)
	if (days < 0) return null
	return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

/** The last eight calendar months, ending with this one: each month's spend and orders, as the chart draws them. */
function lastMonths(rows) {
	const short = monthNames('short')
	const long = monthNames('long', true)
	const months = rows.map(({ month, spend, orders }) => {
		const [y, mo] = month.split('-').map(Number)
		const m = mo - 1
		const mm = String(mo).padStart(2, '0')
		return {
			key: `${y}-${mm}`, from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`,
			tick: short[m].charAt(0).toLocaleUpperCase(), label: `${long[m]} ${y}, ${currency(spend, 0)}`, spend,
			tip: <ChartTip title={`${long[m]} ${y}`} value={currency(spend, 0)} note={`${plural(orders, 'order')}${dot}click to open`} />
		}
	})
	const most = Math.max(...months.map(c => c.spend), 0)
	return months.map((c, i) => ({ ...c, height: most ? (c.spend / most) * 100 : 0, muted: i < MONTHS - 1 }))
}

function greeting(name) {
	const hour = new Date().getHours()
	const words = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'
	return name ? <>{words}, <span className="sp-break">{name}</span></> : words
}

/** The account's own first name, when it has one. */
const firstName = user => String(user?.name ?? '').trim().split(/\s+/)[0] || null

/* ---- the page ---- */

export default function Home() {
	const touch = useShellShape() === 'touch'
	const month = useApi(getStatsSlice, [thisMonthSlice()])
	const categories = useApi(getLimitedCategories)
	const counts = useApi(getCounts)
	const settings = useApi(getSettings)
	const known = settings.data !== undefined || !!settings.error
	const rows = settings.data?.recentRows ?? RECENT
	// Recent orders leaves drafts out; they have their own card (10a)
	// it asks once the settings are in, so the card never draws one count and then another
	const recent = useApi(getOrders, [{ pageSize: rows, drafts: 'none' }], { enabled: known })
	const drafts = useApi(getDrafts, [DRAFTS])
	const reading = Boolean(drafts.data?.drafts.some(d => d.draft?.reading))
	useEffect(() => {
		if (!reading) return undefined
		const timer = setTimeout(drafts.refresh, READING_MS)
		return () => clearTimeout(timer)
	}, [drafts.data])
	const attention = useApi(getHomeAttention)
	const name = firstName(useApi(getCurrentUser).data)
	const compared = useApi(getComparedMonth)
	const loud = loudness(settings.data)
	// the four categories that spent most this month, by the window's own figures, ties by name
	const topIds = (month.data?.window.split ?? []).filter(s => s.id && s.amount > 0)
		.sort((a, b) => b.amount - a.amount || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, 4).map(s => s.id)
	const topRead = useApi(getCategoryPage, [{ ids: topIds.join(','), pageSize: 4, shape: 'brief' }], { enabled: topIds.length > 0 })
	const top = !topIds.length ? [] : topRead.data ? topIds.map(id => topRead.data.categories.find(c => c.id === id)).filter(Boolean) : topRead.error ? [] : null
	const view = monthView(month.data?.window, categories.data, counts.data?.categories, loud.early, top)
	// the summary waits for the settings, so one switched off never flashes up
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
	if (recent.data && !recent.data.total) return <DayOne name={name} touch={touch} />
	// the card waits for the settings, so a row switched off never flashes up
	const looks = known ? looksIn(settings.data) : null
	// the desktop cards above Recent orders are absent or held until known: its rows wait for them, so nothing pushes them down once they land
	const aboveDrawn = known && (!loud.summary || summary.data !== undefined || !!summary.error)
		&& (drafts.data !== undefined || !!drafts.error) && (attention.data !== undefined || !!attention.error)
		&& Boolean(month.error || categories.error || counts.error || (view && looks))
	const props = { month, compared, categories, counts, view, recent, rows, drafts, attention: attention.data, looks, name }
	// the summary is a desktop card; a phone's Needs a look covers this month (Mobile screens 7a)
	return touch ? <PhoneHome {...props} /> : <DesktopHome {...props} aboveDrawn={aboveDrawn} notice={notice} />
}

/** Asks again only for what failed. */
const retrying = (...reads) => () => reads.forEach(read => { if (read.error) read.refresh() })

function DesktopHome({ month, compared, categories, counts, view, recent, rows, drafts, attention, looks, aboveDrawn, notice }) {
	const newest = recent.data?.orders[0]
	const lost = month.error || categories.error || counts.error
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
					: <MonthCard w={month.data?.window} compared={compared} lastAdded={attention?.lastAdded} />}
				<CaptureCard newest={newest} loading={!recent.data && !recent.error} />
			</div>
			<div className="hm-split hm-split--start sp-gap-12">
				<div className="sp-stack sp-gap-12">
					{lost ? null : <AlertsCard view={view} attention={attention} looks={looks} />}
					<DraftsCard drafts={drafts} />
					<RecentCard recent={recent} rows={rows} held={!aboveDrawn} />
				</div>
				<div className="sp-stack sp-gap-12">
					{lost
						? (
							<Hold shape={<CategoriesCard />}>
								<Failed variant="card" label="Categories this month" what="This month's categories" error={lost} onRetry={retrying(month, categories, counts)} />
							</Hold>
						)
						: <CategoriesCard view={view} />}
					<MonthsCard />
				</div>
			</div>
		</div>
	)
}

/** A skeleton the size of the small outline button it stands in for. */
function ButtonSkeleton({ label }) {
	return (
		<Hold shape={<Button variant="outline" size="small">{label}</Button>}>
			<span className="hm-fill"><Skeleton shape="line" data-w="44" data-h="13" /></span>
		</Hold>
	)
}

function MonthCard({ w, compared, lastAdded }) {
	const ago = lastAdded ? daysAgo(localDay(lastAdded)) : null
	const figure = width => <span className="hm-line"><Skeleton shape="line" data-w={width} data-h="22" /></span>
	return (
		<Card variant="shell" spread>
			<CardHeader name={w ? `${capital(monthOf(w))} ${w.from.slice(0, 4)}${dot}day ${w.pace.daysIn} of ${w.pace.unitDays}` : <Skeleton shape="line" data-w="130" data-h="11" />}
				aside={ago ? `last added ${ago}` : undefined} />
			<div className="sp-stats sp-stats--line">
				<Stat label="Spent this month" large figure={w ? currency(w.spent, 0) : figure('130')} />
				<Stat label="Saved" color={!w ? 'default' : isSaving(w.saved, 0) ? 'success' : 'zero'} figure={w ? currency(w.saved, 0) : figure('96')} />
				<Stat label="Orders" figure={w ? amount(w.orders, 0) : figure('44')} />
			</div>
			<Limits w={w} compared={compared} />
		</Card>
	)
}

/** This month against the earlier month Settings names. It needs the month and that month's total, not the categories. */
function Limits({ w, compared }) {
	const lost = !!compared?.error && !compared.data
	if (!w || !compared?.data) return (
		<div className="sp-stack sp-gap-8">
			<Gauge value={0} untargeted={lost} aria-label="This month against an earlier month" />
			{lost
				? <span className="sp-meta">The comparison did not load.</span>
				: <span className="sp-meta hm-line"><Skeleton shape="line" data-w="130" data-h="11" /></span>}
		</div>
	)
	const earlier = compared.data
	const name = comparedName(earlier, w)
	if (!earlier.orders) return (
		<div className="sp-stack sp-gap-8">
			<Gauge value={0} untargeted aria-label="This month against an earlier month" />
			<span className="sp-meta">Nothing from {name} to compare with yet.</span>
		</div>
	)
	const pace = w.pace.unitDays ? (w.pace.daysIn / w.pace.unitDays) * 100 : 100
	const used = (w.spent / earlier.spent) * 100
	const ahead = used > pace + 10
	return (
		<div className="sp-stack sp-gap-8">
			<Gauge {...againstMonth(w.spent, earlier.spent, pace)} aria-label={`This month against ${name}`} />
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-meta">{amount(Math.round(used), 0)}% of {currency(earlier.spent, 0)} in {name}</span>
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

function AlertsCard({ view, attention, looks }) {
	const alerts = view && looks ? alertsOf(looks, { view, things: attention?.things }) : null
	const all = alerts ? alerts.rows : []
	if (alerts && !all.length) return null
	const shown = all.slice(0, ALERTS)
	const counted = alerts ? <span className="sp-meta">{all.length > ALERTS ? `${shown.length} of ${amount(all.length, 0)} things` : plural(all.length, 'thing')}</span> : null
	// past the cap the true total of a rule's rows rides on a link, as Recent orders' does
	const more = alerts?.all && alerts.all.count > ALERTS
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">Needs a look</span>
				{more ? counted : null}
				<span className="sp-grow" />
				{more ? <Button variant="outline" size="small" to={alerts.all.to}>All {amount(alerts.all.count, 0)}</Button> : counted}
			</Toolbar>
			<CardBody>
				<div className="sp-stack sp-gap-8">
					{alerts
						? shown.map(a => (
							<ListItem key={a.key} to={a.to} color={a.color} chevron={CHEVRON} count={a.count}>
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
	const earlier = summary.compared
	const gap = earlier?.orders ? summary.spent - earlier.spent : 0
	const than = earlier ? comparedName(earlier, { from: summary.from }) : ''
	const heading = !earlier?.orders ? `You spent ${currency(summary.spent, 0)} in ${month}`
		: !gap ? `You spent ${currency(summary.spent, 0)}, the same as in ${than}`
		: `You spent ${currency(summary.spent, 0)}, ${currency(Math.abs(gap), 0)} ${gap < 0 ? 'less' : 'more'} than in ${than}`
	const of = c => `${amount(c.spend, 0)} of ${currency(c.budget, 0)}`
	const link = c => `/orders?category=${c.id}&from=${summary.from}&to=${summary.to}`
	const lines = [
		...over.map(c => ({
			c, color: 'danger', mark: <Mark size="medium" fill="solid" swatch={swatchOf(c.colour)} aria-hidden="true" aria-label={c.name}><CategoryIcon name={c.icon} size={18} /></Mark>,
			said: `went ${currency(c.spend - c.budget, 0)} over`,
			meta: c.overs >= 12 ? 'Over in all twelve months. The limit may be too low.'
				: c.overs >= 2 ? `${ORDINALS[c.overs]} time in twelve months.${c.overs >= 3 ? ' The limit may be too low.' : ''}` : of(c),
			adjust: true
		})),
		...close.map(c => ({
			c, mark: <Mark size="medium" fill="solid" swatch="green-3" aria-hidden="true" aria-label="Close to its limit"><Icon name="alert-triangle" size={18} /></Mark>,
			said: `finished at ${Math.floor(c.used)}%`, meta: of(c)
		})),
		...(room ? [{ c: room, mark: <Mark size="medium" aria-hidden="true" aria-label={room.name}><CategoryIcon name={room.icon} size={18} /></Mark>, said: `used ${Math.round(room.used)}%`, meta: of(room) }] : [])
	].slice(0, SUMMARY_ROWS)
	return (
		<Card footer={[
			<div className="sp-stack sp-grow" key="saved">
				<span className="sp-section-label">Saved in {month}</span>
				<span className={isSaving(summary.saved, 0) ? 'sp-stat__figure sp-ink-accent' : 'sp-stat__figure sp-ink-5'}>{currency(summary.saved, 0)}</span>
			</div>,
			<Button key="open" size="small" to={`/statistics?range=month&period=${summary.month}`}>Open statistics</Button>
		]}>
			<CardHeader name={`${month} ${summary.month.slice(0, 4)}`} onDismiss={onHide} dismissLabel={`Hide the ${month} summary`} />
			<div className="sp-stack sp-gap-6">
				<span className="sp-heading">
					{heading}
				</span>
				{rows.length ? <span className="sp-data">{summarySentence(over, close, room)}</span> : null}
			</div>
			{lines.length
				? (
					<div className="sp-stack sp-gap-12">
						{lines.map(line => (
							<ListItem key={line.c.id} color={line.color} mark={line.mark}
								actions={line.adjust ? <Button variant="outline" size="small" to={`/categories/${line.c.id}/edit`}>Adjust</Button> : undefined}>
								<Link className="sp-stacked sp-grow hm-link" to={link(line.c)}>
									<span className="sp-title hm-said"><span className="sp-truncate">{line.c.name}</span><span>{line.said}</span></span>
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

function RecentCard({ recent, rows, held }) {
	const orders = held ? undefined : recent.data?.orders
	const total = held ? undefined : recent.data?.total
	const caption = (
		<>
			<span className="sp-section-label">Recent orders</span>
			{total ? <span className="sp-meta">newest {orders.length}</span> : null}
			<span className="sp-grow" />
			{total ? <Button variant="outline" size="small" to="/orders">All {amount(total, 0)}</Button> : null}
		</>
	)
	const loading = <RecentList caption={caption} rows={rows} />
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
						<Button size="small" to="/orders/new?source=empty">Empty order</Button>
					</Empty>
				</div>
			</Card>
		</Hold>
	)
	return <RecentList caption={caption} orders={orders} rows={rows} />
}

function RecentList({ caption, orders, rows }) {
	// a list of its own once the orders land, so its rows replace the placeholders in place rather than arriving one by one
	return (
		<List key={orders ? 'orders' : 'loading'} data={orders ?? Array.from({ length: rows }, (_, i) => i + 1)} recordKey={o => o.id ?? o} noun="orders" headless locale={NUMBER_LOCALE}
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
					<ListCell cell="amount"><OrderAmount order={o} /></ListCell>
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

/* ---- drafts: orders not created yet, newest scan first (10a, 7a) ---- */

/** The address of all drafts: the order list filtered to the status Draft. */
function useDraftsAddress() {
	const key = useStatusTypes().keyOf('draft') ?? 'Draft'
	return `/orders?status=${encodeURIComponent(key)}`
}

/** A draft's own day: the day it was scanned, or an order's date for one that did not come from a scan. */
const draftDay = o => o.draft?.scanned ?? o.date

/** A scan's picture: its first page, or the kind of file while it has none. */
function DraftFile({ file }) {
	return file.hasThumbnail
		? <Mark size="medium" fill="photo" aria-hidden="true" aria-label={file.name}><img src={scanThumbnailUrl(file.key)} alt="" /></Mark>
		: <Mark size="medium" fill="none" aria-hidden="true" aria-label={file.name}><span>{file.kind === 'pdf' ? 'PDF' : 'IMG'}</span></Mark>
}

/** What is left on a draft, then a copy's source day, then a scan's file name: a long name is the part cut. */
const draftLine = d => [d.draft.left, d.draft.copiedFrom ? `Copied from ${rowDate(d.draft.copiedFrom)}` : null, d.draft.file?.name].filter(Boolean).join(dot)

/** A draft's picture and words: a scan's file, else the order row's picture; an order with status Draft as an order row shows it. */
function DraftHead({ order }) {
	if (!order.draft) return <OrderHead order={order} />
	return (
		<>
			{order.draft.file ? <DraftFile file={order.draft.file} /> : <OrderPhoto order={order} />}
			<span className="sp-stacked">
				<span className="sp-title sp-truncate">{vendorName(order)}</span>
				<span className="sp-meta sp-truncate">{draftLine(order)}</span>
			</span>
		</>
	)
}

function DraftsCard({ drafts }) {
	const all = useDraftsAddress()
	const rows = drafts.data?.drafts
	const total = drafts.data?.total
	// absent while there are none, and until it is known that there are some
	if (drafts.error) return <Failed variant="card" label="Drafts" what="Your drafts" error={drafts.error} onRetry={drafts.refresh} />
	if (!rows?.length) return null
	return (
		<List data={rows} recordKey={o => o.id} noun="drafts" headless locale={NUMBER_LOCALE} rowTo={o => `/orders/${o.id}`}>
			<Caption>
				<span className="sp-section-label">Drafts</span>
				<span className="sp-meta">newest {rows.length}</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" to={all}>All {amount(total, 0)}</Button>
			</Caption>
			<ListHead>
				<ListCell width="title" />
				<ListCell width="date" />
				<ListCell width="amount" />
			</ListHead>
			<ListRow>{o => (
				<>
					<ListCell cell="flex"><DraftHead order={o} /></ListCell>
					<ListCell><span className="sp-data">{rowDate(draftDay(o))}</span></ListCell>
					<ListCell cell="amount">{o.total == null ? null : <span className="sp-amount">{currency(o.total)}</span>}</ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

function OrderHead({ order }) {
	return (
		<>
			<OrderPhoto order={order} />
			<span className="sp-stacked">
				<span className="sp-title sp-truncate">{order.vendor?.name}</span>
				<span className="sp-meta sp-truncate">{plural(order.itemCount, 'item')}</span>
			</span>
		</>
	)
}

function CaptureCard({ newest, loading }) {
	const navigate = useNavigate()
	const user = useApi(getCurrentUser).data
	const reads = user?.scanAiEnabled
	// the server takes no receipt before the email is confirmed, so the zone says so first (20b)
	const held = user?.emailConfirmed === false
	const take = files => { if (files?.[0]) navigate('/orders/new?source=scan', { state: { file: files[0], from: '/' } }) }
	const [picking, setPicking] = useState(false)
	const copy = newest
		? <Button variant="outline" size="small" onClick={() => setPicking(true)}>Copy an order</Button>
		: loading ? <ButtonSkeleton label="Copy an order" /> : null
	return (
		<Card>
			<CardHeader name="Add an order" />
			{held
				? (
					<FileDrop disabled row>
						<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Receipt"><Icon name="camera" size={19} /></Mark>
						<span className="sp-title sp-ink-2">Capture a receipt</span>
						<span className="sp-meta">Available once your email is confirmed</span>
					</FileDrop>
				)
				: (
					<FileDrop accept={FILE_TYPES} onFiles={take} row>
						<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Receipt"><Icon name="camera" size={19} /></Mark>
						<span className="sp-title">Drop a receipt here</span>
						<span className="sp-subtitle">
							{reads === false
								? 'Image or PDF. It is attached to a new order, and you type in the details.'
								: 'Image or PDF. The vendor, date and lines are read for you.'}
						</span>
					</FileDrop>
				)}
			<div className="sp-fields">
				<Button variant="outline" size="small" to="/orders/new?source=empty">Empty order</Button>
				{copy}
			</div>
			<Leaving>{picking ? <CopyPicker onClose={() => setPicking(false)} /> : null}</Leaving>
		</Card>
	)
}

function CategoriesCard({ view }) {
	const top = view?.top
	const loading = (
		<Card>
			<CardHeader name="Categories this month" />
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
		<CardHeader name="Categories this month" meta={top.length ? `top ${top.length} by spend` : undefined}
			actions={view.withSpend ? [{ label: `All ${amount(view.withSpend, 0)}`, to: `/categories?month=${view.window.from.slice(0, 7)}` }] : undefined} />
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
		<Link className="sp-stack sp-gap-6 sp-row-opens" to={`/statistics?range=month&crumbs=category:${c.id}`}>
			<div className="sp-row-flex sp-gap-8">
				<CategoryMark category={c} size="medium" />
				<span className="sp-data sp-grow sp-truncate">{c.name}</span>
				<span className={warn ? 'sp-meta sp-meta--over' : 'sp-meta'}>
					{limited ? `${amount(c.monthSpend, 0)} / ${amount(c.budget, 0)}` : amount(c.monthSpend, 0)}
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
	const totals = useApi(getStatsMonths, [MONTHS])
	const months = totals.data ? lastMonths(totals.data.months) : null
	const average = months ? months.reduce((sum, c) => sum + c.spend, 0) / months.length : null
	const card = (
		<Card footer={[
			<span className="sp-subtitle sp-grow" key="label">Monthly average</span>,
			average === null
				? <span className="sp-amount hm-line" key="value"><Skeleton shape="line" data-w="76" data-h="13" /></span>
				: <span className="sp-amount" key="value">{currency(average, 0)}</span>
		]}>
			<CardHeader name={`Last ${MONTHS} months`} actions={[{ label: 'Statistics', to: '/statistics' }]} />
			<Bars variant="card" columns={months ?? []} loading={!months} selected={today().slice(0, 7)}
				onSelect={key => navigate(`/statistics?period=${key.slice(0, 4)}&crumbs=month:${key}`)} />
		</Card>
	)
	if (totals.error) return (
		<Hold shape={card}>
			<Failed variant="card" label={`Last ${MONTHS} months`} what="The last months" error={totals.error} onRetry={totals.refresh} />
		</Hold>
	)
	return card
}

/* ---- below 640: the phone's own composition (7a) ---- */

function PhoneHome({ month, compared, categories, counts, view, recent, rows, drafts, attention, looks, name }) {
	const w = month.data?.window
	return (
		<>
			<div className="sp-stacked">
				<span className="sp-stat__figure">{greeting(name)}</span>
				{w
					? <span className="sp-data">{capital(monthOf(w))}, day {w.pace.daysIn} of {w.pace.unitDays}</span>
					: <span className="sp-data hm-line"><Skeleton shape="line" data-w="130" data-h="13" /></span>}
			</div>
			{month.error
				? (
					<Hold shape={<PhoneMonth />}>
						<Failed variant="card" label="This month" what="This month" error={month.error} onRetry={retrying(month, categories, counts)} />
					</Hold>
				)
				: <PhoneMonth w={w} compared={compared} />}
			{month.error || categories.error || counts.error ? null : <PhoneAlerts view={view} attention={attention} looks={looks} />}
			<PhoneDrafts drafts={drafts} />
			<PhoneRecent recent={recent} rows={rows} />
		</>
	)
}

/** The month's own figure shows at once; the bar waits for the earlier month's total, and asks again if only that failed. */
function PhoneMonth({ w, compared }) {
	const earlier = compared?.data
	if (!w) return (
		<Card>
			<CardHeader name="This month" />
			<span className="sp-stat__figure sp-stat__figure--large hm-line"><Skeleton shape="line" data-w="130" data-h="22" /></span>
			<Gauge value={0} aria-label="This month against an earlier month" />
		</Card>
	)
	if (!earlier) return (
		<Card>
			<CardHeader name="This month" />
			<span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>
			<Gauge value={0} untargeted={!!compared?.error} aria-label="This month against an earlier month" />
			{compared?.error
				? (
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-meta sp-grow">The comparison did not load.</span>
						<Button variant="text" size="small" onClick={compared.refresh}>Try again</Button>
					</div>
				)
				: null}
		</Card>
	)
	const name = comparedName(earlier, w)
	const pace = w.pace.unitDays ? (w.pace.daysIn / w.pace.unitDays) * 100 : 100
	return (
		<Card>
			<CardHeader name="This month" />
			{earlier.orders
				? (
					<div className="sp-row-flex sp-gap-8 sp-baseline">
						<span className="sp-stat__figure sp-stat__figure--large">{amount(w.spent, 0)}</span>
						<span className="sp-data sp-ink-5">of {currency(earlier.spent, 0)} in {name}</span>
					</div>
				)
				: <span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>}
			{earlier.orders
				? <Gauge {...againstMonth(w.spent, earlier.spent, pace)} aria-label={`This month against ${name}`} />
				: (
					<div className="sp-stack sp-gap-8">
						<Gauge value={0} untargeted aria-label="This month against an earlier month" />
						<span className="sp-meta">Nothing from {name} to compare with yet.</span>
					</div>
				)}
		</Card>
	)
}

function PhoneAlerts({ view, attention, looks }) {
	const alerts = view && looks ? alertsOf(looks, { view, things: attention?.things }) : null
	if (alerts && !alerts.phone.length) return null
	const chevron = <Icon name="chevron-right" size={13} />
	return (
		<Card>
			<CardHeader name="Needs a look" />
			{alerts
				? alerts.phone.map(a => (
					<ListItem key={a.key} to={a.to} color={a.color} chevron={chevron} count={a.count}>
						<span className={a.color === 'warning' ? 'sp-data sp-ink-warning sp-grow' : 'sp-data sp-grow sp-truncate'}>{a.phone}</span>
					</ListItem>
				))
				: <AlertSkeleton width="44pc" />}
		</Card>
	)
}

function PhoneRecent({ recent, rows }) {
	const orders = recent.data?.orders
	const loading = (
		<Card>
			<CardHeader name="Recent orders" />
			{Array.from({ length: rows }, (_, i) => (
				<div className="sp-row-flex sp-gap-12" key={i}>
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
				<CardHeader name="Recent orders" />
				<div className="sp-stack sp-grow hm-fill">
					<span className="sp-meta">No orders yet. Press the plus button to add your first.</span>
				</div>
			</Card>
		</Hold>
	)
	return (
		<Card>
			<CardHeader name="Recent orders" meta={`newest ${orders.length}`} actions={[{ label: `All ${amount(recent.data.total, 0)}`, to: '/orders' }]} />
			{orders.map(o => <PhoneOrder key={o.id} order={o} />)}
		</Card>
	)
}

function PhoneOrder({ order }) {
	return (
		<Link className="sp-row-flex sp-gap-12 sp-row-opens" to={`/orders/${order.id}`}>
			<OrderPhoto order={order} />
			<div className="sp-stacked sp-grow">
				<span className="sp-title sp-truncate">{order.vendor?.name}</span>
				<span className="sp-meta">{rowDate(order.date)}{dot}{plural(order.itemCount, 'item')}</span>
			</div>
			<span className="sp-stacked sp-cell-amount"><OrderAmount order={order} /></span>
		</Link>
	)
}

function PhoneDrafts({ drafts }) {
	const all = useDraftsAddress()
	const rows = drafts.data?.drafts
	if (drafts.error) return <Failed variant="card" label="Drafts" what="Your drafts" error={drafts.error} onRetry={drafts.refresh} />
	if (!rows?.length) return null
	return (
		<Card>
			<CardHeader name="Drafts" meta={`newest ${rows.length}`} actions={[{ label: `All ${amount(drafts.data.total, 0)}`, to: all }]} />
			{rows.map(o => (o.draft
				? (
					<Link key={o.id} className="sp-row-flex sp-gap-12 sp-row-opens" to={`/orders/${o.id}`}>
						{o.draft.file ? <DraftFile file={o.draft.file} /> : <OrderPhoto order={o} />}
						<div className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{vendorName(o)}</span>
							<span className="sp-meta">{rowDate(draftDay(o))}{dot}{o.draft.left}{o.draft.copiedFrom ? `${dot}Copied from ${rowDate(o.draft.copiedFrom)}` : ''}</span>
						</div>
						{o.total == null ? null : <span className="sp-title sp-nowrap">{amount(o.total)}</span>}
					</Link>
				)
				: <PhoneOrder key={o.id} order={o} />))}
		</Card>
	)
}

/* ---- an account with no orders yet: the first-run Home (20d) ---- */

function DayOne({ name, touch }) {
	const navigate = useNavigate()
	const take = files => { if (files?.[0]) navigate('/orders/new?source=scan', { state: { file: files[0], from: '/' } }) }
	const user = useApi(getCurrentUser).data
	const reads = user?.scanAiEnabled
	const page = useApi(getCategoryPage, [{ pageSize: 4 }]).data
	const first = page?.categories ?? []
	return (
		<div className={touch ? 'sp-stack sp-gap-12' : 'hm-day-one'}>
			<Card>
				<div className="sp-stack">
					<span className="sp-stat__figure sp-stat__figure--large">{greeting(name)}</span>
					<span className="sp-data">{capital(monthNames('long')[Number(today().slice(5, 7)) - 1])}{dot}nothing recorded yet</span>
				</div>
				{user?.emailConfirmed === false
					? (
						<>
							<FileDrop disabled icon="camera">
								<span className="sp-title sp-ink-2">Capture a receipt</span>
								<span className="sp-meta">Available once your email is confirmed</span>
							</FileDrop>
							<Button variant="outline" to="/orders/new?source=empty">Enter one by hand</Button>
						</>
					)
					: (
						<FileDrop accept={FILE_TYPES} onFiles={take} icon="camera">
							<span className="sp-heading">Start with a receipt</span>
							<span className="sp-data hm-w300">
								{reads === false
									? 'Drop a photo or a PDF. It is attached to a new order, and you type in the details.'
									: 'Drop a photo or a PDF and the lines are read for you to check.'}
							</span>
							<span className="sp-btn">Capture a receipt</span>
							<Button variant="outline" to="/orders/new?source=empty">Enter one by hand</Button>
						</FileDrop>
					)}
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
								<CategoryMark category={c} size="medium" />
								<span className="sp-title">{c.name}</span>
							</span>
						))}
						{page && !page.matched ? <span className="sp-meta">No categories yet.</span> : null}
						<Button variant="outline" size="small" to="/categories/new">{page?.matched ? 'Add another' : 'Add one'}</Button>
					</Well>
				</div>
			</Card>
		</div>
	)
}
