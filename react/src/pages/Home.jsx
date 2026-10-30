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
	failureMessage, getCategoryPage, getCounts, getCurrentUser, getDrafts, getHomeAttention, getMonthlySummary, getComparedMonth, getOrders, getSettings, getStatsMonths, getStatsSlice, thisMonthSlice,
	getLimitedCategorySpend, overBudget, periodSpend, putSummaryAway, scanThumbnailUrl, withMonthSpend
} from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, activeLocaleCode, amount, currency, dot, isSaving, monthNames, plural, today } from '../api/format.js'
import { CopyPicker } from './CopyPicker.jsx'
import { names } from './orderSave.js'
import { alertsOf, looksIn, monthOf } from './needsLook.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

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
const nearLimit = (c, early) => c.budget > 0 && early < 100 && !overBudget(c) && periodSpend(c) >= (c.budget * early) / 100

/** The month window, every limited category with its own period's spend, the category `count` and
    the four that spent most this month (`top`), a yearly one shown on its year: three cards' data. */
function monthView(window, limited, count, early, top) {
	if (!window || !limited || count === undefined || !top) return null
	const categories = limited
	const byOverage = c => periodSpend(c) - c.budget
	const yearOf = new Map(limited.map(c => [c.id, c.yearSpend]))
	const spent = withMonthSpend(top, window.split).map(c => ({ ...c, yearSpend: yearOf.get(c.id) ?? 0 }))
	return {
		window,
		count,
		withSpend: window.split.filter(s => s.id && s.amount > 0).length,
		early,
		over: categories.filter(overBudget).sort((a, b) => byOverage(b) - byOverage(a)),
		near: categories.filter(c => nearLimit(c, early)).sort((a, b) => periodSpend(b) / b.budget - periodSpend(a) / a.budget),
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
	return phrase('home.ago', { days })
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
			tip: <ChartTip title={`${long[m]} ${y}`} value={currency(spend, 0)} note={phrase('home.months.note', { orders: plural(orders, 'order'), dot })} />
		}
	})
	const most = Math.max(...months.map(c => c.spend), 0)
	return months.map((c, i) => ({ ...c, height: most ? (c.spend / most) * 100 : 0, muted: i < MONTHS - 1 }))
}

function greeting(name) {
	const hour = new Date().getHours()
	const words = phrase('home.greeting', { part: hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening' })
	return name ? <>{words}, <span className="sp-break">{name}</span></> : words
}

/** The account's own first name, when it has one. */
const firstName = user => String(user?.name ?? '').trim().split(/\s+/)[0] || null

/* ---- the page ---- */

export default function Home() {
	const phrase = usePhrase()
	const touch = useShellShape() === 'touch'
	const month = useApi(getStatsSlice, [thisMonthSlice()])
	const categories = useApi(getLimitedCategorySpend)
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
	// asked beside the settings rather than after them, so it lands with the other cards; drawn only once the settings say it is on
	const summary = useApi(getMonthlySummary)
	const toast = useToast()
	const [putAway, setPutAway] = useState(null)
	const hide = async month => {
		setPutAway(month)
		try {
			await putSummaryAway(month)
		} catch (error) {
			setPutAway(null)
			toast({ message: failureMessage(error, phrase('home.summaryNotHidden')), color: 'danger' })
		}
	}
	const due = summary.data
	const owed = Boolean(due?.orders && !due.seen && putAway !== due.month)
	const notice = known && loud.summary && owed && categories.data
		? <MonthlySummary summary={due} categories={categories.data} early={loud.early} onHide={() => hide(due.month)} />
		: null
	// the summary sits above every desktop card, so the cards wait until it is known to be drawn or not: landing later, it pushes them all down
	const noticeKnown = known && (!loud.summary || (summary.data === undefined ? !!summary.error : !owed || categories.data !== undefined || !!categories.error))
	if (recent.data && !recent.data.total) return <DayOne name={name} touch={touch} />
	// the card waits for the settings, so a row switched off never flashes up
	const looks = known ? looksIn(settings.data) : null
	// the desktop cards above Recent orders are absent or held until known: its rows wait for them, so nothing pushes them down once they land
	const aboveDrawn = known && (!loud.summary || summary.data !== undefined || !!summary.error)
		&& (drafts.data !== undefined || !!drafts.error) && (attention.data !== undefined || !!attention.error)
		&& Boolean(month.error || categories.error || counts.error || (view && looks))
	const props = { month, compared, categories, counts, view, recent, rows, drafts, attention: attention.data, looks, name }
	// the summary is a desktop card; a phone's Needs a look covers this month (Mobile screens 7a)
	if (touch) return <PhoneHome {...props} />
	return noticeKnown ? <DesktopHome {...props} aboveDrawn={aboveDrawn} notice={notice} /> : <div className="hm-page" />
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
							<Failed variant="card" label={phrase('categories.thisMonth')} what={phrase('categories.thisMonth')} error={month.error} onRetry={month.refresh} />
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
								<Failed variant="card" label={phrase('home.categoriesMonth')} what={phrase('home.monthCategories')} error={lost} onRetry={retrying(month, categories, counts)} />
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
			<CardHeader name={w ? `${capital(monthOf(w))} ${w.from.slice(0, 4)}${dot}${phrase('home.dayOf', { day: w.pace.daysIn, days: w.pace.unitDays })}` : <Skeleton shape="line" data-w="130" data-h="11" />}
				aside={ago ? phrase('home.lastAdded', { ago }) : undefined} />
			<div className="sp-stats sp-stats--line">
				<Stat label={phrase('home.spentThisMonth')} large figure={w ? currency(w.spent, 0) : figure('130')} />
				<Stat label={phrase('vendor.saved')} color={!w ? 'default' : isSaving(w.saved, 0) ? 'success' : 'zero'} figure={w ? currency(w.saved, 0) : figure('96')} />
				<Stat label={phrase('page.orders')} figure={w ? amount(w.orders, 0) : figure('44')} />
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
			<Gauge value={0} untargeted={lost} aria-label={phrase('home.againstEarlier')} />
			{lost
				? <span className="sp-meta">{phrase('home.comparisonFailed')}</span>
				: <span className="sp-meta hm-line"><Skeleton shape="line" data-w="130" data-h="11" /></span>}
		</div>
	)
	const earlier = compared.data
	const name = comparedName(earlier, w)
	if (!earlier.orders) return (
		<div className="sp-stack sp-gap-8">
			<Gauge value={0} untargeted aria-label={phrase('home.againstEarlier')} />
			<span className="sp-meta">{phrase('home.nothingFrom', { name })}</span>
		</div>
	)
	const pace = w.pace.unitDays ? (w.pace.daysIn / w.pace.unitDays) * 100 : 100
	const used = (w.spent / earlier.spent) * 100
	const ahead = used > pace + 10
	return (
		<div className="sp-stack sp-gap-8">
			<Gauge {...againstMonth(w.spent, earlier.spent, pace)} aria-label={phrase('home.againstMonth', { name })} />
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-meta">{phrase('home.share', { share: amount(Math.round(used), 0), amount: currency(earlier.spent, 0), name })}</span>
				<span className="sp-grow" />
				<span className={ahead ? 'sp-meta sp-meta--over sp-row-flex sp-gap-6' : 'sp-meta sp-row-flex sp-gap-6'}>
					<GaugeKey aria-hidden="true" />{phrase(ahead ? 'categories.aheadOfPace' : 'home.belowPace')}
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
	const counted = alerts ? <span className="sp-meta">{all.length > ALERTS ? phrase('home.thingsOf', { shown: shown.length, total: amount(all.length, 0) }) : plural(all.length, 'thing')}</span> : null
	// past the cap the true total of a rule's rows rides on a link, as Recent orders' does
	const more = alerts?.all && alerts.all.count > ALERTS
	return (
		<Card variant="flush">
			<Toolbar>
				<span className="sp-section-label">{phrase('settings.section.looks')}</span>
				{more ? counted : null}
				<span className="sp-grow" />
				{more ? <Button variant="outline" size="small" to={alerts.all.to}>{phrase('home.all', { count: amount(alerts.all.count, 0) })}</Button> : counted}
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

const countWord = n => phrase('home.countWord', { n: String(n), amount: amount(n, 0) })
// the summary says three things at most; the sentence above them counts every category
const SUMMARY_ROWS = 3

/** "One category went over, one finished close, and Textiles has room to spare." */
function summarySentence(over, close, room) {
	const parts = [
		over.length ? phrase('home.summary.over', { count: over.length, word: countWord(over.length) }) : phrase('home.summary.under'),
		close.length ? phrase('home.summary.close', { word: countWord(close.length) }) : null,
		room ? phrase('home.summary.room', { name: room.name }) : null
	].filter(Boolean)
	return `${capital(names(parts))}.`
}

/** Last month against its limits, said once (8b, 6f): from the first of the month until the reader
    hides it. Each row opens that month's orders in the category. A yearly limit is named once, in the
    month that passed it, and said to have finished close or to have room only in December's. */
function MonthlySummary({ summary, categories, early, onHide }) {
	const month = monthNames('long')[Number(summary.month.slice(5)) - 1]
	const byId = new Map(categories.map(c => [c.id, c]))
	const rows = summary.limits
		.map(l => ({ ...byId.get(l.id), spend: l.spend, overs: l.overs, yearly: l.period === 'year', passed: l.passed, yearEnd: l.yearEnd }))
		.filter(c => c.name && c.budget > 0)
		.filter(c => !c.yearly || c.passed || (c.yearEnd && c.spend <= c.budget))
		.map(c => ({ ...c, used: (c.spend / c.budget) * 100 }))
	const over = rows.filter(c => c.spend > c.budget).sort((a, b) => b.spend - b.budget - (a.spend - a.budget))
	const close = early < 100 ? rows.filter(c => c.spend <= c.budget && c.used >= early).sort((a, b) => b.used - a.used) : []
	const room = rows.filter(c => !over.includes(c) && !close.includes(c)).sort((a, b) => a.used - b.used || a.name.localeCompare(b.name))[0]
	const earlier = summary.compared
	const gap = earlier?.orders ? summary.spent - earlier.spent : 0
	const than = earlier ? comparedName(earlier, { from: summary.from }) : ''
	const spent = currency(summary.spent, 0)
	const heading = !earlier?.orders ? phrase('home.summary.spent', { amount: spent, month })
		: !gap ? phrase('home.summary.same', { amount: spent, than })
		: phrase('home.summary.diff', { amount: spent, gap: currency(Math.abs(gap), 0), less: String(gap < 0), than })
	const of = c => phrase('home.of', { spent: amount(c.spend, 0), budget: currency(c.budget, 0) })
	const link = c => `/orders?category=${c.id}&from=${summary.from}&to=${summary.to}`
	const lines = [
		...over.map(c => ({
			c, color: 'danger', mark: <Mark size="medium" fill="solid" swatch={swatchOf(c.colour)} aria-hidden="true" aria-label={c.name}><CategoryIcon name={c.icon} size={18} /></Mark>,
			said: c.yearly
				? phrase('home.line.overYear', { amount: currency(c.spend - c.budget, 0), year: summary.month.slice(0, 4) })
				: phrase('home.line.over', { amount: currency(c.spend - c.budget, 0) }),
			meta: c.yearly ? of(c) : c.overs >= 12 ? phrase('home.line.allYear')
				: c.overs >= 2 ? phrase('home.line.nth', { n: String(c.overs), low: c.overs >= 3 ? 'yes' : 'no' }) : of(c),
			adjust: true
		})),
		...close.map(c => ({
			c, mark: <Mark size="medium" fill="solid" swatch="primary-3" aria-hidden="true" aria-label={phrase('home.closeToLimit')}><Icon name="alert-triangle" size={18} /></Mark>,
			said: phrase('home.line.finished', { share: Math.floor(c.used) }), meta: of(c)
		})),
		...(room ? [{ c: room, mark: <Mark size="medium" aria-hidden="true" aria-label={room.name}><CategoryIcon name={room.icon} size={18} /></Mark>, said: phrase('home.line.used', { share: Math.round(room.used) }), meta: of(room) }] : [])
	].slice(0, SUMMARY_ROWS)
	return (
		<Card footer={[
			<div className="sp-stack sp-grow" key="saved">
				<span className="sp-section-label">{phrase('home.savedIn', { month })}</span>
				<span className={isSaving(summary.saved, 0) ? 'sp-stat__figure sp-ink-accent' : 'sp-stat__figure sp-ink-5'}>{currency(summary.saved, 0)}</span>
			</div>,
			<Button key="open" size="small" to={`/statistics?range=month&period=${summary.month}`}>{phrase('home.openStatistics')}</Button>
		]}>
			<CardHeader name={`${month} ${summary.month.slice(0, 4)}`} onDismiss={onHide} dismissLabel={phrase('home.hideSummary', { month })} />
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
								actions={line.adjust ? <Button variant="outline" size="small" to={`/categories/${line.c.id}/edit`}>{phrase('home.adjust')}</Button> : undefined}>
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
			<span className="sp-section-label">{phrase('library.recentOrders')}</span>
			{total ? <span className="sp-meta">{phrase('home.newest', { count: orders.length })}</span> : null}
			<span className="sp-grow" />
			{total ? <Button variant="outline" size="small" to="/orders">{phrase('home.all', { count: amount(total, 0) })}</Button> : null}
		</>
	)
	const loading = <RecentList caption={caption} rows={rows} />
	if (recent.error) return (
		<Hold shape={loading}>
			<Failed variant="card" label={phrase('library.recentOrders')} what={phrase('home.yourRecent')} error={recent.error} onRetry={recent.refresh} />
		</Hold>
	)
	if (orders && !orders.length) return (
		<Hold shape={loading}>
			<Card variant="flush">
				<Toolbar>{caption}</Toolbar>
				<div className="sp-stack sp-grow hm-fill">
					<Empty>
						<span className="sp-heading">{phrase('home.noOrders')}</span>
						<span className="sp-meta">{phrase('home.noOrdersBody')}</span>
						<Button size="small" to="/orders/new?source=empty">{phrase('orders.empty')}</Button>
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
				<ListCell width="title">{phrase('field.vendor')}</ListCell>
				<ListCell width="date">{phrase('field.date')}</ListCell>
				<ListCell width="status">{phrase('field.status')}</ListCell>
				<ListCell width="amount">{phrase('field.amount')}</ListCell>
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
const draftLine = d => [d.draft.left, d.draft.copiedFrom ? phrase('home.copiedFrom', { date: rowDate(d.draft.copiedFrom) }) : null, d.draft.file?.name].filter(Boolean).join(dot)

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
	if (drafts.error) return <Failed variant="card" label={phrase('palette.drafts')} what={phrase('home.yourDrafts')} error={drafts.error} onRetry={drafts.refresh} />
	if (!rows?.length) return null
	return (
		<List data={rows} recordKey={o => o.id} noun="drafts" headless locale={NUMBER_LOCALE} rowTo={o => `/orders/${o.id}`}>
			<Caption>
				<span className="sp-section-label">{phrase('palette.drafts')}</span>
				<span className="sp-meta">{phrase('home.newest', { count: rows.length })}</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" to={all}>{phrase('home.all', { count: amount(total, 0) })}</Button>
			</Caption>
			<ListHead>
				<ListCell width="title">{phrase('field.vendor')}</ListCell>
				<ListCell width="date">{phrase('field.date')}</ListCell>
				<ListCell width="amount">{phrase('field.amount')}</ListCell>
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
		? <Button variant="outline" size="small" onClick={() => setPicking(true)}>{phrase('copy.title')}</Button>
		: loading ? <ButtonSkeleton label={phrase('copy.title')} /> : null
	return (
		<Card>
			<CardHeader name={phrase('home.addOrder')} />
			{held
				? (
					<FileDrop disabled row>
						<Mark size="medium" fill="solid" aria-hidden="true" aria-label={phrase('home.receipt')}><Icon name="camera" size={19} /></Mark>
						<span className="sp-title sp-ink-2">{phrase('home.capture')}</span>
						<span className="sp-meta">{phrase('home.afterConfirm')}</span>
					</FileDrop>
				)
				: (
					<FileDrop accept={FILE_TYPES} onFiles={take} row>
						<Mark size="medium" fill="solid" aria-hidden="true" aria-label={phrase('home.receipt')}><Icon name="camera" size={19} /></Mark>
						<span className="sp-title">{phrase('home.dropHere')}</span>
						<span className="sp-subtitle">
							{reads === false
								? phrase('home.dropManual')
								: phrase('home.dropRead')}
						</span>
					</FileDrop>
				)}
			<div className="sp-fields">
				<Button variant="outline" size="small" to="/orders/new?source=empty">{phrase('orders.empty')}</Button>
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
			<CardHeader name={phrase('home.categoriesMonth')} />
			{['96', '76', '88', '64'].map(width => (
				<div className="sp-stack sp-gap-6" key={width}>
					<div className="sp-row-flex sp-gap-8">
						<span className="hm-mark"><Skeleton shape="line" data-w="18" data-h="22" /></span>
						<span className="sp-data hm-line"><Skeleton shape="line" data-w={width} data-h="13" /></span>
						<span className="sp-grow" />
						<span className="sp-meta hm-line"><Skeleton shape="line" data-w="76" data-h="11" /></span>
					</div>
					<Gauge value={0} untargeted aria-label={phrase('home.loading')} />
				</div>
			))}
		</Card>
	)
	if (!view) return loading
	const header = (
		<CardHeader name={phrase('home.categoriesMonth')} meta={top.length ? phrase('home.topBySpend', { count: top.length }) : undefined}
			actions={view.withSpend ? [{ label: phrase('home.all', { count: amount(view.withSpend, 0) }), to: `/categories?month=${view.window.from.slice(0, 7)}` }] : undefined} />
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
								<span className="sp-heading">{phrase('home.nothingSpent', { month: monthOf(view.window) })}</span>
								<span className="sp-meta">{phrase('home.nothingSpentBody')}</span>
							</Empty>
						)
						: (
							<Empty>
								<span className="sp-heading">{phrase('categories.empty.none')}</span>
								<span className="sp-meta">{phrase('home.categoriesBody')}</span>
								<Button size="small" to="/categories/new">{phrase('categories.new')}</Button>
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
	const spend = limited ? periodSpend(c) : c.monthSpend
	const warn = overBudget(c) || nearLimit(c, early)
	return (
		<Link className="sp-stack sp-gap-6 sp-row-opens" to={`/statistics?range=month&crumbs=category:${c.id}`}>
			<div className="sp-row-flex sp-gap-8">
				<CategoryMark category={c} size="small" />
				<span className="sp-data sp-grow sp-truncate">{c.name}</span>
				<span className={warn ? 'sp-meta sp-meta--over' : 'sp-meta'}>
					{!limited ? amount(spend, 0)
						: c.budgetPeriod === 'year' ? phrase('home.lineThisYear', { spent: amount(spend, 0), budget: amount(c.budget, 0) })
						: `${amount(spend, 0)} / ${amount(c.budget, 0)}`}
				</span>
			</div>
			{limited
				? <Gauge {...against(spend, c.budget)} aria-label={phrase('home.againstLimit', { name: c.name })} />
				: <Gauge value={0} untargeted aria-label={phrase('categories.noLimitSet')} />}
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
			<span className="sp-subtitle sp-grow" key="label">{phrase('home.monthlyAverage')}</span>,
			average === null
				? <span className="sp-amount hm-line" key="value"><Skeleton shape="line" data-w="76" data-h="13" /></span>
				: <span className="sp-amount" key="value">{currency(average, 0)}</span>
		]}>
			<CardHeader name={phrase('home.lastMonths', { count: MONTHS })} actions={[{ label: phrase('page.statistics'), to: '/statistics' }]} />
			<Bars variant="card" columns={months ?? []} loading={!months} selected={today().slice(0, 7)}
				onSelect={key => navigate(`/statistics?period=${key.slice(0, 4)}&crumbs=month:${key}`)} />
		</Card>
	)
	if (totals.error) return (
		<Hold shape={card}>
			<Failed variant="card" label={phrase('home.lastMonths', { count: MONTHS })} what={phrase('home.theLastMonths')} error={totals.error} onRetry={totals.refresh} />
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
					? <span className="sp-data">{capital(monthOf(w))}, {phrase('home.dayOf', { day: w.pace.daysIn, days: w.pace.unitDays })}</span>
					: <span className="sp-data hm-line"><Skeleton shape="line" data-w="130" data-h="13" /></span>}
			</div>
			{month.error
				? (
					<Hold shape={<PhoneMonth />}>
						<Failed variant="card" label={phrase('categories.thisMonth')} what={phrase('categories.thisMonth')} error={month.error} onRetry={retrying(month, categories, counts)} />
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
			<CardHeader name={phrase('categories.thisMonth')} />
			<span className="sp-stat__figure sp-stat__figure--large hm-line"><Skeleton shape="line" data-w="130" data-h="22" /></span>
			<Gauge value={0} aria-label={phrase('home.againstEarlier')} />
		</Card>
	)
	if (!earlier) return (
		<Card>
			<CardHeader name={phrase('categories.thisMonth')} />
			<span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>
			<Gauge value={0} untargeted={!!compared?.error} aria-label={phrase('home.againstEarlier')} />
			{compared?.error
				? (
					<div className="sp-row-flex sp-gap-8">
						<span className="sp-meta sp-grow">{phrase('home.comparisonFailed')}</span>
						<Button variant="text" size="small" onClick={compared.refresh}>{phrase('action.tryAgain')}</Button>
					</div>
				)
				: null}
		</Card>
	)
	const name = comparedName(earlier, w)
	const pace = w.pace.unitDays ? (w.pace.daysIn / w.pace.unitDays) * 100 : 100
	return (
		<Card>
			<CardHeader name={phrase('categories.thisMonth')} />
			{earlier.orders
				? (
					<div className="sp-row-flex sp-gap-8 sp-baseline">
						<span className="sp-stat__figure sp-stat__figure--large">{amount(w.spent, 0)}</span>
						<span className="sp-data sp-ink-5">{phrase('home.ofIn', { amount: currency(earlier.spent, 0), name })}</span>
					</div>
				)
				: <span className="sp-stat__figure sp-stat__figure--large">{currency(w.spent, 0)}</span>}
			{earlier.orders
				? <Gauge {...againstMonth(w.spent, earlier.spent, pace)} aria-label={phrase('home.againstMonth', { name })} />
				: (
					<div className="sp-stack sp-gap-8">
						<Gauge value={0} untargeted aria-label={phrase('home.againstEarlier')} />
						<span className="sp-meta">{phrase('home.nothingFrom', { name })}</span>
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
			<CardHeader name={phrase('settings.section.looks')} />
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
			<CardHeader name={phrase('library.recentOrders')} />
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
			<Failed variant="card" label={phrase('library.recentOrders')} what={phrase('home.yourRecent')} error={recent.error} onRetry={recent.refresh} />
		</Hold>
	)
	if (!orders) return loading
	if (!orders.length) return (
		<Hold shape={loading}>
			<Card>
				<CardHeader name={phrase('library.recentOrders')} />
				<div className="sp-stack sp-grow hm-fill">
					<span className="sp-meta">{phrase('home.noOrdersPhone')}</span>
				</div>
			</Card>
		</Hold>
	)
	return (
		<Card>
			<CardHeader name={phrase('library.recentOrders')} meta={phrase('home.newest', { count: orders.length })} actions={[{ label: phrase('home.all', { count: amount(recent.data.total, 0) }), to: '/orders' }]} />
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
	if (drafts.error) return <Failed variant="card" label={phrase('palette.drafts')} what={phrase('home.yourDrafts')} error={drafts.error} onRetry={drafts.refresh} />
	if (!rows?.length) return null
	return (
		<Card>
			<CardHeader name={phrase('palette.drafts')} meta={phrase('home.newest', { count: rows.length })} actions={[{ label: phrase('home.all', { count: amount(drafts.data.total, 0) }), to: all }]} />
			{rows.map(o => (o.draft
				? (
					<Link key={o.id} className="sp-row-flex sp-gap-12 sp-row-opens" to={`/orders/${o.id}`}>
						{o.draft.file ? <DraftFile file={o.draft.file} /> : <OrderPhoto order={o} />}
						<div className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{vendorName(o)}</span>
							<span className="sp-meta">{rowDate(draftDay(o))}{dot}{o.draft.left}{o.draft.copiedFrom ? <>{dot}{phrase('home.copiedFrom', { date: rowDate(o.draft.copiedFrom) })}</> : ''}</span>
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
					<span className="sp-data">{capital(monthNames('long')[Number(today().slice(5, 7)) - 1])}{dot}{phrase('home.nothingYet')}</span>
				</div>
				{user?.emailConfirmed === false
					? (
						<>
							<FileDrop disabled icon="camera">
								<span className="sp-title sp-ink-2">{phrase('home.capture')}</span>
								<span className="sp-meta">{phrase('home.afterConfirm')}</span>
							</FileDrop>
							<Button variant="outline" to="/orders/new?source=empty">{phrase('home.byHand')}</Button>
						</>
					)
					: (
						<FileDrop accept={FILE_TYPES} onFiles={take} icon="camera">
							<span className="sp-heading">{phrase('home.startReceipt')}</span>
							<span className="sp-data hm-w300">
								{reads === false
									? phrase('home.dayOne.manual')
									: phrase('home.dayOne.read')}
							</span>
							<span className="sp-btn">{phrase('home.capture')}</span>
							<Button variant="outline" to="/orders/new?source=empty">{phrase('home.byHand')}</Button>
						</FileDrop>
					)}
				<div className={touch ? 'sp-stack sp-gap-12' : 'hm-wells'}>
					<Well>
						<span className="sp-section-label">{phrase('categories.thisMonth')}</span>
						<span className="sp-stat__figure sp-ink-5">{currency(0)}</span>
						<Gauge thin value={0} untargeted aria-label={phrase('categories.noLimitSet')} />
						<span className="sp-meta">{phrase('home.dayOne.limit')}</span>
					</Well>
					<Well>
						<span className="sp-section-label">{phrase('home.yourCategories')}</span>
						{first.map(c => (
							<span className="sp-row-flex sp-gap-10" key={c.id}>
								<CategoryMark category={c} size="small" />
								<span className="sp-title">{c.name}</span>
							</span>
						))}
						{page && !page.matched ? <span className="sp-meta">{phrase('home.noCategories')}</span> : null}
						<Button variant="outline" size="small" to="/categories/new">{phrase(page?.matched ? 'home.addAnother' : 'home.addOne')}</Button>
					</Well>
				</div>
			</Card>
		</div>
	)
}
