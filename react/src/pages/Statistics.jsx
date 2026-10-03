import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Button } from '../components/Button.jsx'
import { Card, CardFooter, Panel } from '../components/Card.jsx'
import { Choice, Switch } from '../components/Choice.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { Bars, ChartTip, Donut, Gauge, GaugeKey, Legend, LegendItem, Plot, ShareRow, Shares, Stat, Sum } from '../components/Data.jsx'
import { PeriodPicker, PeriodWindow, RangePicker, Selected } from '../components/DatePickers.jsx'
import { Icon } from '../components/Icon.jsx'
import { TopBarEnd } from '../app/topBarEnd.jsx'
import { Caption, Controls, Crumb, Crumbs, Foot, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Alert, useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Empty, EmptyBody, EmptyTitle, Hold, Skeleton, Stacked, useFocusTrap } from '../components/Utilities.jsx'
import { Halves } from '../components/Well.jsx'
import { carryPeriod, useListMemory } from '../app/listMemory.js'
import { useMedia, useShellShape, useWidth } from '../app/useMedia.js'
import { CategoryChips, StatusPill, columnsFor, orderLine } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import { useScanPicker } from '../app/scanPicker.jsx'
import { failureMessage, getCategoryPage, getCurrentUser, getLimitedCategories, getSliceLines, getSliceOrders, getStatsSlice, getVendorPage } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import {
	NUMBER_LOCALE, activeLocaleCode, amount, compactAmount, currency, dot, isSaving, monthNames, percent, quantity, shortDate, today
} from '../api/format.js'
import {
	DAY_MS, MOST_CRUMBS, RANGES, boundsOf, chartOf, crumbsIn, dayAndMonth, filterOf, isTime, isoOf, nameOf, readCrumbs,
	reanchor, scaleFor, stepLabel, todayUtc, unitOf, utcOf, validId, windowIdAt, writeCrumbs, yearEarlier
} from './statisticsWindows.js'

const PRESETS = [
	{ value: 'days30', label: '30 days' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: 'quarter', label: 'Quarter' },
	{ value: 'year', label: 'Year' },
	{ value: 'custom', label: 'Custom' }
]

/* The lens (4e): which orders the page adds up. In the address as flow=, and never a crumb. */
const FLOWS = [
	{ value: 'expenses', label: 'Expenses only', help: 'What you paid.' },
	{ value: 'refunds', label: 'Refunds only', help: 'Returned orders.' },
	{ value: 'net', label: 'Net of refunds', help: 'What you paid, less what came back.' }
]

const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0)
const signed = (n, text) => (n > 0 ? `+${text}` : n < 0 ? `-${text}` : text)
const counted = (n, noun, nouns = `${noun}s`) => `${amount(n, 0)} ${n === 1 ? noun : nouns}`
const TOP = 8
// inside a crumb the Spend and Average help name the level above by its kind (4b, 4c)
const OF_WINDOW = { year: 'the year', quarter: 'the quarter', month: 'the month', week: 'the week' }
const OF_CRUMB = { month: 'this month', week: 'this week', vendor: 'this vendor', category: 'this category', status: 'these orders' }
const VERSUS = { month: 'all months', week: 'all weeks', vendor: 'all vendors', category: 'all categories', status: 'all statuses' }
const SLICE = 25

/** The id a range opens on when the address names none: the window holding today. */
const defaultId = range => windowIdAt(range, todayUtc())

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

/** The vendors or the categories the crumbs name, by id, archived ones too. */
function useCrumbRecords(read, crumbs, kind) {
	const ids = crumbs.filter(c => c.kind === kind && c.value !== 'none').map(c => c.value)
	return useApi(read, [{ ids: ids.join(','), archived: 'all', pageSize: Math.max(1, ids.length) }], { enabled: ids.length > 0 }).data
}

/** The name a crumb shows: a month, a week, or the record it filters by. A month is capitalised
    unless the name sits inside running text (`inText`). */
function crumbLabel(crumb, { vendors, categories, windowYear }, inText = false) {
	if (crumb.kind === 'month') {
		const month = monthNames('long', !inText)[Number(crumb.value.slice(5)) - 1]
		return crumb.value.slice(0, 4) === windowYear ? month : `${month} ${crumb.value.slice(0, 4)}`
	}
	if (crumb.kind === 'week') return `Week ${Number(crumb.value.slice(6))}`
	if (crumb.kind === 'vendor') return vendors?.find(v => v.id === crumb.value)?.name ?? 'This vendor'
	if (crumb.kind === 'category') {
		if (crumb.value === 'none') return 'Without category'
		return categories?.find(c => c.id === crumb.value)?.name ?? 'This category'
	}
	return crumb.value
}

/** The order list with the drill path as its filters, the reverse of "See in Statistics". */
function ordersLink(slice, crumbs) {
	const q = new URLSearchParams()
	for (const c of crumbs) if (!isTime(c)) q.set(c.kind, c.value)
	q.set('from', slice.from)
	q.set('to', slice.to)
	return `/orders?${q}`
}

/* ---- the page ---- */

export default function Statistics() {
	const shape = useShellShape()
	const touch = shape === 'touch'
	// Layout rules: below 900 the paired cards stack
	const stacked = useMedia('(max-width: 899.98px)')
	const toast = useToast()
	const [params, setParams] = useSearchParams()
	const range = RANGES.includes(params.get('range')) ? params.get('range') : 'year'
	const asked = params.get('period')
	const id = validId(range, asked) && !(range === 'days30' && asked > today()) ? asked : defaultId(range)
	const compareOn = params.get('compare') !== 'off'
	const flow = FLOWS.some(f => f.value === params.get('flow')) ? params.get('flow') : 'expenses'
	const [fromMs, toMs] = boundsOf(range, id)
	const from = isoOf(fromMs)
	const to = isoOf(toMs)
	const crumbs = crumbsIn(readCrumbs(params.get('crumbs')), from, to)
	const drilled = crumbs.length > 0
	const comparing = compareOn && !touch && !drilled
	const before = yearEarlier(range, id)

	const base = { range, windowId: id, flow }
	const filter = filterOf(crumbs)
	const stats = useCurrent(getStatsSlice, [{ ...base, ...filter }])
	const past = useCurrent(getStatsSlice, [{ range, windowId: before, flow, ...filter }], { enabled: comparing })
	// inside a crumb every figure is held against the level above it (4b)
	const parent = useCurrent(getStatsSlice, [{ ...base, ...filterOf(crumbs.slice(0, -1)) }], { enabled: drilled })
	// the table's slice is stated as a share of its period's spend (4a): the time crumb, or the whole window
	const periodCrumbs = crumbs.some(c => !isTime(c)) ? crumbs.filter(isTime) : []
	const whole = useCurrent(getStatsSlice, [{ ...base, ...filterOf(periodCrumbs) }], { enabled: drilled && !touch })
	// the side cards read the period's current month, as limits are monthly (4a)
	const monthId = range === 'month' ? id : reanchor(range, id, 'month')
	const ownMonth = useCurrent(getStatsSlice, [{ range: 'month', windowId: monthId, flow }], { enabled: !drilled && range !== 'month' })
	const month = range === 'month' ? stats : ownMonth
	const monthName = stepLabel('month', monthId)
	const monthRunning = monthId === defaultId('month')
	// every category with a limit, the records the crumbs name, and how many categories there are
	const categories = useApi(getLimitedCategories)
	const vendors = useCrumbRecords(getVendorPage, crumbs, 'vendor')?.vendors
	const crumbCategories = useCrumbRecords(getCategoryPage, crumbs, 'category')?.categories
	const known = useApi(getCategoryPage, [{ pageSize: 1 }]).data?.matched

	// the table pages on the server; what Load more added is card-local, so a reload starts at one page (4d)
	const { restored } = useListMemory('orders')
	const slice = JSON.stringify({ base, filter })
	const [more, setMore] = useState({ slice, pages: [], count: 0 })
	const kept = more.slice === slice ? more : { pages: [], count: 0 }
	const earlier = kept.pages
	const ask = { page: kept.count + 1, pageSize: SLICE }
	const next = useCurrent(getSliceOrders, [{ ...base, ...filter, ...ask }], { enabled: !touch })
	const loadMore = () => {
		if (next.error) return next.refresh()
		if (!next.data) return
		setMore({ slice, pages: [...earlier, next.data], count: kept.count + 1 })
	}
	// the window goes back to where the reader left it once the rows are drawn, or there are none to draw
	const drawn = !!stats.error || (!!stats.data && (touch || !stats.data.window.orders || !!next.data || !!next.error))
	useLayoutEffect(() => { if (drawn) restored() }, [drawn, restored])

	const retry = () => {
		for (const call of [stats, past, parent, ownMonth, categories, next]) if (call.error) call.refresh()
	}

	// the URL holds only what differs from the page's own default
	const write = ({ range: r = range, id: i = id, compare: c = compareOn, flow: f = flow, crumbs: cr = crumbs }) => setParams({
		...(r === 'year' ? {} : { range: r }),
		...(r !== 'custom' && i === defaultId(r) ? {} : { period: i }),
		...(c ? {} : { compare: 'off' }),
		...(f === 'expenses' ? {} : { flow: f }),
		...(cr.length ? { crumbs: writeCrumbs(cr) } : {})
	})
	// a period the reader chooses here is the one the order list opens on next (c14)
	const show = (nextRange, nextId) => {
		carryPeriod(...boundsOf(nextRange, nextId).map(isoOf))
		write({ range: nextRange, id: nextId })
	}

	/* A crumb of a kind already in the path takes its place; a new kind is pushed, up to three. */
	const sameKind = (a, b) => a.kind === b.kind || (isTime(a) && isTime(b))
	const canDrill = crumb => crumbs.some(c => sameKind(c, crumb)) || crumbs.length < MOST_CRUMBS
	const drill = crumb => {
		if (!canDrill(crumb)) return
		const at = crumbs.findIndex(c => sameKind(c, crumb))
		write({ crumbs: at < 0 ? [...crumbs, crumb] : crumbs.map((c, i) => (i === at ? crumb : c)) })
	}
	const drillTo = kind => (canDrill({ kind }) ? value => drill({ kind, value }) : undefined)

	// Custom is a draft until Apply (4f): the page behind it stays as it is
	const [draft, setDraft] = useState(null)
	const openCustom = () => {
		const [a, b] = (range === 'custom' ? id : reanchor(range, id, 'custom')).split('~')
		setDraft({ from: a, to: b })
	}
	const applyCustom = () => { if (draft?.from && draft?.to) show('custom', `${draft.from}~${draft.to}`); setDraft(null) }

	// until the API answers for this window, the stepper stays live on the calendar alone, so it keeps its focus
	const older = stats.data ? stats.data.older : range === 'custom' ? null : windowIdAt(range, fromMs - DAY_MS)
	const newer = stats.data ? stats.data.newer : range !== 'custom' && toMs < todayUtc() ? windowIdAt(range, toMs + DAY_MS) : null

	const view = stats.data?.window
	const exportSlice = async () => {
		try {
			const { lines } = await getSliceLines({ ...base, ...filter })
			download(csvOf(lines), `spendly-${view?.slice.from ?? from}-${view?.slice.to ?? to}.csv`)
		} catch (error) {
			toast({ message: failureMessage(error, 'The export did not download. Try again.'), color: 'danger' })
		}
	}

	const quick = quickRanges(stats.data?.firstOrder)
	const rangePicker = draft
		? (
			<RangePicker from={draft.from} to={draft.to} max={today()} locale={activeLocaleCode()} quick={quick} single={touch}
				onChange={(a, b) => setDraft({ from: a, to: b })} onApply={applyCustom} onCancel={() => setDraft(null)} />
		)
		: null
	const which = (
		<Combobox variant="end" value={FLOWS.find(f => f.value === flow).label} aria-label="Which orders">
			{FLOWS.map(f => (
				<ComboboxOption key={f.value} selected={f.value === flow} onSelect={() => write({ flow: f.value })}>
					<span className="sp-stack"><span className="sp-data">{f.label}</span><span className="sp-meta">{f.help}</span></span>
				</ComboboxOption>
			))}
		</Combobox>
	)
	// off touch the lens and Export sit at the top bar's right end, and the period row holds the period alone (4a)
	const barEnd = touch ? null : (
		<TopBarEnd>
			{which}
			<Button variant="outline" onClick={exportSlice} disabled={!view?.orders}>
				Export
			</Button>
		</TopBarEnd>
	)
	const stepper = range === 'custom'
		? null
		: (
			<PeriodWindow
				unit={range}
				label={stepLabel(range, id)}
				previousLabel={range === 'days30' ? 'The 30 days before' : `Previous ${range}`}
				nextLabel={range === 'days30' ? 'The 30 days after' : `Next ${range}`}
				onPrevious={older ? () => show(range, older) : undefined}
				onNext={newer ? () => show(range, newer) : undefined}
			/>
		)
	const choose = nextRange => {
		if (nextRange === 'custom') return openCustom()
		setDraft(null)
		show(nextRange, reanchor(range, id, nextRange))
	}
	const shown = draft ? 'custom' : range
	// on a phone the period is one select with its window beside the name, between the arrows (Mobile screens 7b)
	const unitName = range === 'days30' ? '30 days' : range === 'custom' ? 'period' : range
	const period = touch
		? (
			<>
				<Controls>
					<div className="sp-window sp-window--select">
						<button type="button" className="sp-window__btn" aria-label={`Earlier ${unitName}`}
							disabled={!older} onClick={older ? () => show(range, older) : undefined}>
							<Icon name="chevron-left" size={15} />
						</button>
						<Combobox value={`${PRESETS.find(p => p.value === shown).label}${dot}${range === 'custom' ? nameOf(range, id) : stepLabel(range, id)}`} aria-label="Period">
							{PRESETS.map(p => (
								<ComboboxOption key={p.value} selected={p.value === shown} onSelect={() => choose(p.value)}>{p.label}</ComboboxOption>
							))}
						</Combobox>
						<button type="button" className="sp-window__btn" aria-label={`Later ${unitName}`}
							disabled={!newer} onClick={newer ? () => show(range, newer) : undefined}>
							<Icon name="chevron-right" size={15} />
						</button>
					</div>
				</Controls>
				<Controls>{which}</Controls>
				{draft ? <RangeSheet onClose={() => setDraft(null)}>{rangePicker}</RangeSheet> : null}
			</>
		)
		: (
			<>
				{barEnd}
				<PeriodPicker
					name="statistics-period"
					presets={PRESETS}
					value={shown}
					at={range === 'days30' ? to : from}
					from={draft ? draft.from : from}
					to={draft ? draft.to : to}
					locale={activeLocaleCode()}
					custom={draft ? rangePicker : null}
					onChange={({ period: nextRange }) => choose(nextRange)}
					onPresent={() => show(range, defaultId(range))}
					// a custom range has no stepper (4f): choosing the selected Custom again opens its dates
					onClick={ev => { if (range === 'custom' && !draft && ev.target.matches('input[value="custom"]')) openCustom() }}
					stepper={stepper}
				>
					<Selected>
						{span => (
							<Choice control={<Switch checked={compareOn} onChange={ev => write({ compare: ev.target.checked })} />}>
								Compare with {nameOf(range, yearEarlier(range, idOfSpan(range, span.selected)), true)}
							</Choice>
						)}
					</Selected>
				</PeriodPicker>
			</>
		)

	// the last crumb removed by keyboard takes the bar with it, so the focus goes to the period control
	const refocus = useRef(false)
	useLayoutEffect(() => {
		if (!refocus.current || drilled) return
		refocus.current = false
		;(document.querySelector('input[name="statistics-period"]:checked') ?? document.querySelector('button[aria-label="Period"]'))?.focus()
	}, [drilled])
	const scan = useScanPicker()
	const held = useApi(getCurrentUser).data?.emailConfirmed === false

	const name = nameOf(range, id)
	const nameInText = nameOf(range, id, true)
	const labels = { vendors, categories: crumbCategories, windowYear: id.slice(0, 4) }
	const crumbsBar = drilled
		? <CrumbsBar root={name} crumbs={crumbs} labels={labels} link={ordersLink(view?.slice ?? { from, to }, crumbs)}
			onTruncate={i => write({ crumbs: crumbs.slice(0, i + 1) })}
			onDrop={(i, focused) => { if (focused && crumbs.length === 1) refocus.current = true; write({ crumbs: crumbs.filter((c, j) => j !== i) }) }}
			onReset={() => write({ crumbs: [] })} />
		: null

	if (stats.error) {
		return (
			<>
				{period}
				{crumbsBar}
				<Failed what="Your statistics" error={stats.error} onRetry={retry} />
			</>
		)
	}

	if (!view) {
		const running = fromMs <= todayUtc() && todayUtc() <= toMs
		return arrange({ shape, stacked, period, crumbsBar, drilled, ...busyParts({ unit: unitOf(range, Math.round((toMs - fromMs) / DAY_MS) + 1, fromMs), name, monthName, monthRunning, running, touch, comparing, categories, known, drilled, flow }) })
	}

	if (!view.orders && !drilled) {
		// with no window on either side there are no orders at all yet (6a)
		if (!older && !newer && range !== 'custom') {
			return (
				<>
					{period}
					<Card variant="flush">
						<Empty>
							<Mark size="large" aria-hidden="true" aria-label="Receipt"><Icon name="receipt" size={26} /></Mark>
							<EmptyTitle>No orders yet</EmptyTitle>
							<EmptyBody>Drop a receipt and the vendor, date and lines are filled in for you. Or start an empty order and type it yourself.</EmptyBody>
							<div className="sp-row-flex sp-gap-8">
								{held
									? <Button size="small" disabled data-tip="Available once your email is confirmed">Scan a receipt</Button>
									: <Button size="small" onClick={scan.open}>Scan a receipt</Button>}
								<Button variant="outline" size="small" to="/orders/new?source=empty">Empty order</Button>
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
					<EmptyTitle>{flow === 'refunds' ? `No returned orders in ${nameInText}` : `No orders in ${nameInText}`}</EmptyTitle>
					<EmptyBody>Choose another period above, or add an order.</EmptyBody>
					<Button variant="outline" to="/orders/new">New order</Button>
				</Empty>
			</>
		)
	}

	const chart = chartOf(view)
	const monthView = month.data?.window
	const time = crumbs.find(isTime)
	const selectedKey = time ? chart.columns.find(c => c.crumb?.value === time.value)?.key ?? null : null
	const sliceName = time ? crumbLabel(time, labels) : name
	const sliceInText = time ? crumbLabel(time, labels, true) : nameInText
	// the window still running is compared with the same number of days of the earlier one
	const pace = view.pace
	const [pastFrom, pastTo] = boundsOf(range, before)
	const sameDays = pace.running ? Math.min(pace.daysIn, Math.round((pastTo - pastFrom) / DAY_MS) + 1) : null
	const pastLast = isoOf(pastFrom + ((sameDays ?? 1) - 1) * DAY_MS)
	const wasName = nameOf(range, before)
	const was = !comparing || !past.data ? null : sameDays == null ? past.data.window : sameDaysOf(past.data.window, sameDays)
	const failedNotice = comparing && past.error
		? (
			<Alert color="danger" mark="!" title={`${wasName} did not load`} action={<Button variant="outline" size="small" onClick={retry}>Try again</Button>}>
				The figures are shown without the comparison.
			</Alert>
		)
		: null

	const vendorCrumb = crumbs.find(c => c.kind === 'vendor')
	const categoryCrumb = crumbs.find(c => c.kind === 'category')
	const statusCrumb = crumbs.find(c => c.kind === 'status')
	const category = categoryCrumb && crumbCategories?.find(c => c.id === categoryCrumb.value)
	const limit = flow === 'refunds' || vendorCrumb || statusCrumb ? 0
		: categoryCrumb ? category?.budget ?? 0
			: (categories.data ?? []).reduce((sum, c) => sum + (c.budget > 0 ? c.budget : 0), 0)
	const records = crumbs.filter(c => !isTime(c)).map(c => crumbLabel(c, labels))
	const narrowed = records.length ? `${records.join(dot)}${records.length === 1 ? ' only' : ''}` : null

	// an order added while paging shifts the pages by one, so a row can arrive twice
	const rows = [...new Map([...earlier.flatMap(page => page.orders), ...(next.data?.orders ?? [])].map(order => [order.id, order])).values()]
	// "39% of August spend": a week window and a time crumb go by their short names, a range of days by none
	const periodTime = periodCrumbs[0]
	const periodName = periodTime ? crumbLabel(periodTime, labels, true)
		: range === 'week' ? `Week ${Number(id.slice(6))}`
			: range === 'days30' || range === 'custom' ? null : nameInText
	const wholeSpent = whole.data?.window.spent
	const ofPeriod = drilled && wholeSpent > 0 && view.spent >= 0
		? `${percent(share(view.spent, wholeSpent), 0)} of ${periodName ? `${periodName} spend` : 'the spend in this period'}`
		: null
	const table = touch
		? <SliceCard view={view} link={ordersLink(view.slice, crumbs)} drilled={drilled} />
		: (
			<OrdersTable view={view} name={sliceInText} drilled={drilled} rows={rows} ofPeriod={ofPeriod}
				matched={next.data?.matched ?? earlier.at(-1)?.matched} failed={next.error} onLoadMore={loadMore} onRetry={retry} />
		)
	const spendChart = (
		<SpendChart chart={chart} touch={touch} selected={selectedKey} narrowed={narrowed}
			stackable={!categoryCrumb} categories={view.series.categories} limit={chart.unit === 'month' ? limit : 0}
			onOpen={canDrill({ kind: 'month' }) ? column => drill(column.crumb) : undefined} />
	)

	if (drilled) {
		const parentView = parent.data?.window
		const above = crumbs.length > 1 ? OF_CRUMB[crumbs.at(-2).kind] : OF_WINDOW[range] ?? 'the period'
		/* The card beside the chart is the first breakdown the path has not already narrowed. */
		const side = !categoryCrumb
			? <CategoryRows key={`category ${slice}`} view={view} onOpen={drillTo('category')} hint />
			: category?.budget > 0 && chart.unit === 'month' && flow !== 'refunds'
				? <LimitByMonth chart={chart} selected={selectedKey} category={category} pace={pace} touch={touch} />
				: !vendorCrumb
					? <VendorsCard key={`vendors ${slice}`} view={view} name={sliceName} touch={touch} onOpen={drillTo('vendor')} />
					: !statusCrumb
						? <StatusCard view={view} flow={flow} onOpen={drillTo('status')} />
						: <SavingChart chart={chart} name={sliceName} touch={touch} selected={selectedKey} />
		return arrange({
			shape, stacked, period, crumbsBar, drilled,
			kpis: <DrilledKpis view={view} parent={parentView} above={above} versusAll={VERSUS[crumbs.at(-1).kind]} chart={chart} time={time ? sliceName : null}
				category={category} flow={flow} touch={touch} />,
			chart: spendChart,
			side,
			slice: table
		})
	}

	return arrange({
		shape,
		stacked,
		period,
		notice: failedNotice,
		kpis: (
			<Kpis view={view} chart={chart} was={was} by={sameDays == null ? null : dayAndMonth(pastLast)}
				waiting={comparing && !was && !past.error} touch={touch} />
		),
		chart: spendChart,
		byCategory: month.error
			? <Failed variant="card" label="By category" what={`${monthName} by category`} error={month.error} onRetry={retry} />
			: touch
				? <CategoryRows key={`category ${monthId}`} view={monthView} known={known} name={monthName} onOpen={drillTo('category')} />
				: <CategoryShares view={monthView} known={known} name={monthName} ring={flow !== 'net'} onOpen={drillTo('category')} />,
		byStatus: <StatusCard view={view} flow={flow} onOpen={drillTo('status')} />,
		vendors: month.error
			? <Failed variant="card" label="Top vendors" what={`${monthName} by vendor`} error={month.error} onRetry={retry} />
			: <VendorsCard key={`vendors ${monthId}`} view={monthView} name={monthName} touch={touch} onOpen={drillTo('vendor')} />,
		saving: <SavingChart chart={chart} name={name} touch={touch} selected={selectedKey}
			onOpen={canDrill({ kind: 'month' }) ? column => drill(column.crumb) : undefined} />,
		limits: flow === 'refunds' ? null
			: month.error ? <Failed variant="card" label="Monthly limit" what={`${monthName} against the limits`} error={month.error} onRetry={retry} />
				: <LimitCard key={`limits ${monthId}`} view={monthView} name={monthName} running={monthRunning} categories={categories} touch={touch} onRetry={retry} />,
		vendorChart: <VendorChart view={view} onOpen={drillTo('vendor')} />,
		slice: table
	})
}

/** The id a span of days stands for at a width, for naming the window a year before it. */
function idOfSpan(range, span) {
	if (range === 'days30') return span.to
	if (range === 'custom') return `${span.from}~${span.to}`
	return windowIdAt(range, utcOf(span.from))
}

// the API answers a chosen range of at most this many days (MAX_CUSTOM_DAYS)
const MOST_RANGE_DAYS = 3660

/** Shortcuts to a range, not windows of their own (4f): each fills both dates and leaves the panel
    open. All time starts at the account's first order, once the page knows it. */
function quickRanges(firstOrder) {
	const now = today()
	const y = Number(now.slice(0, 4))
	const m = Number(now.slice(5, 7))
	const firstOf = (year, month) => isoOf(Date.UTC(year, month - 1, 1))
	const earliest = isoOf(todayUtc() - (MOST_RANGE_DAYS - 1) * DAY_MS)
	return [
		{ label: 'This month', value: [firstOf(y, m), now] },
		{ label: 'Last month', value: [firstOf(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1), isoOf(Date.UTC(y, m - 1, 0))] },
		{ label: 'Year to date', value: [`${y}-01-01`, now] },
		...(firstOrder ? [{ label: 'All time', value: [firstOrder > earliest ? (firstOrder < now ? firstOrder : now) : earliest, now] }] : [])
	]
}

/** On touch the range picker is a sheet over the page, not a panel under the row (4f). */
function RangeSheet({ onClose, children }) {
	const box = useRef(null)
	useFocusTrap(box)
	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-label="Choose dates" ref={box}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				{children}
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** One row per item line, the order's own fields repeated on each: the column set an import reads. */
function csvOf(lines) {
	const head = ['Date', 'Vendor', 'Status', 'Kind', 'Reference', 'Categories', 'Note', 'Shipping', 'Discount', 'Order total',
		'Item', 'Quantity', 'Price', 'Retail price', 'Item note']
	const money = n => (n == null ? '' : Number(n).toFixed(2).replace('.', ','))
	const cell = v => { const s = String(v ?? ''); return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
	const rows = lines.map(l => [
		l.date, l.vendor, l.status, l.kind, l.reference, l.categories, l.note, money(l.shipping), money(l.discount), money(l.total),
		l.title, l.quantity == null ? '' : quantity(l.quantity), money(l.price), money(l.retail), l.itemNote
	])
	// a byte order mark, so a spreadsheet opens Danish letters as written; a semicolon, as the decimal is a comma
	return '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

function download(text, fileName) {
	const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
	const a = document.createElement('a')
	a.href = url
	a.download = fileName
	document.body.append(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The earlier window cut to its first `days` days, from its running totals. */
function sameDaysOf(window, days) {
	const spent = window.series.current[days - 1] ?? 0
	const orders = window.series.ordersCumulative[days - 1] ?? 0
	return { spent, saved: window.series.savedCumulative[days - 1] ?? 0, orders, average: orders ? spent / orders : 0 }
}

/** The drill path (4b, 4c): only the last level carries a remove; an earlier one goes back to itself.
    Backspace removes the focused level and keeps the rest (c8, 4c); the focus takes its place. */
function CrumbsBar({ root, crumbs, labels, link, onTruncate, onDrop, onReset }) {
	const bar = useRef(null)
	const path = writeCrumbs(crumbs)
	// the path the focus left, and where it goes once the shorter path is drawn (the address lags the press)
	const [focusAt, setFocusAt] = useState(null)
	const dropping = i => () => {
		const focused = !!bar.current?.contains(document.activeElement)
		if (focused) setFocusAt({ at: i, left: path })
		onDrop(i, focused)
	}
	useLayoutEffect(() => {
		if (!focusAt || focusAt.left === path) return
		setFocusAt(null)
		const levels = [...(bar.current?.querySelectorAll('.sp-crumbs > li') ?? [])].slice(root ? 1 : 0)
		levels[Math.min(focusAt.at, levels.length - 1)]?.querySelector('button')?.focus()
	}, [focusAt, path, root])
	return (
		<Card variant="crumbs">
			<div className="os-crumbs" ref={bar}>
				<span className="sp-section-label">Showing</span>
				<Crumbs root={root} aria-label="Showing">
					{crumbs.map((c, i) => {
						const label = crumbLabel(c, labels)
						const vendor = c.kind === 'vendor' ? labels.vendors?.find(v => v.id === c.value) : null
						const mark = c.kind === 'vendor' ? <VendorMark name={label} colour={vendor?.colour} size="small" /> : null
						return i === crumbs.length - 1
							? <Crumb key={`${c.kind}:${c.value}`} name={label} onRemove={dropping(i)}>{mark}{label}</Crumb>
							: <Crumb key={`${c.kind}:${c.value}`} onOpen={() => onTruncate(i)} onRemove={dropping(i)}>{mark}{label}</Crumb>
					})}
				</Crumbs>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={onReset}>Reset</Button>
				<Button variant="outline" size="small" to={link}>Open in orders</Button>
			</div>
		</Card>
	)
}

/** Where each card sits: beside the chart on a wide screen, in pairs on a narrower one, and one
    column below 900 and on a phone. Inside a crumb, the chart and one breakdown, then the orders (4b). */
function arrange({ shape, stacked, period, crumbsBar = null, drilled, notice = null, kpis, chart, side, byCategory, byStatus, vendors, saving, limits, vendorChart, slice }) {
	const figures = <div className="os-stats">{kpis}</div>
	if (drilled) {
		if (shape === 'touch' || stacked) return <>{period}{crumbsBar}{figures}{chart}{side}{slice}</>
		return <>{period}{crumbsBar}{figures}<Halves>{chart}{side}</Halves>{slice}</>
	}
	// the period control stays first in every state, so it keeps its focus while a window loads
	if (shape === 'touch') return <>{period}{notice}{figures}{chart}{byCategory}{byStatus}{vendors}{saving}{limits}{slice}</>
	if (stacked) return <>{period}{notice}{figures}{chart}{byCategory}{byStatus}{vendors}{saving}{limits}{vendorChart}{slice}</>
	return (
		<>
			{period}
			{notice}
			{figures}
			{shape === 'wide'
				? <div className="sp-shell__body--split">{chart}<Panel>{byCategory}{byStatus}</Panel></div>
				: <>{chart}<Halves>{byCategory}{byStatus}</Halves></>}
			<Halves>
				<div className="sp-stack sp-gap-12">{vendors}{saving}</div>
				{limits}
			</Halves>
			{vendorChart}
			{slice}
		</>
	)
}

/* ---- the frames before the figures land (6b): the loaded layout's own cards, empty ---- */

// two figure spaces and an en space are as wide as a label like "60k", so the axis keeps its width
const AXIS_HOLD = Array.from({ length: 5 }, () => '   ')
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

function busyParts({ unit, name, monthName, monthRunning, running, touch, comparing, categories, known, drilled, flow }) {
	// the account's categories bound a breakdown's length before its window answers
	return {
		kpis: (drilled ? ['Spend', 'Orders', 'Average order', 'Saved'] : ['Total spend', 'Orders', 'Average order', 'Saved']).map(label => (
			<Card key={label} aria-busy="true">
				<Stat label={label} figure={hold('104', '22')} />
				{comparing ? <Skeleton shape="pill" /> : null}
				{!touch && !drilled ? <Bars variant="spark" loading /> : null}
			</Card>
		)),
		chart: <SpendChart unit={unit} running={running} touch={touch} />,
		side: <CategoryRows known={known} hint />,
		byCategory: touch ? <CategoryRows known={known} name={monthName} /> : <CategoryShares known={known} name={monthName} ring={flow !== 'net'} />,
		byStatus: <StatusCard flow={flow} />,
		vendors: <VendorsCard name={monthName} touch={touch} />,
		saving: <SavingChart name={name} touch={touch} />,
		limits: <LimitCard name={monthName} running={monthRunning} categories={categories} touch={touch} />,
		vendorChart: <VendorChart />,
		slice: touch ? <SliceCard /> : <OrdersTable rows={[]} drilled={drilled} />
	}
}

/* ---- cards ---- */

/** A small chart of the window's steps under a figure card (4a): the step holding today is the dark
    one, and a bar shows its step, value and order count on hover. It opens nothing; the chart below does. */
function Spark({ columns, value, format, label }) {
	const values = columns.map(value)
	const most = Math.max(...values, 0)
	return (
		<Bars variant="spark" role="img" aria-label={label}
			columns={columns.map((column, i) => ({
				key: column.key,
				height: share(Math.max(0, values[i]), most),
				muted: !column.running,
				tip: <ChartTip title={column.name} value={format(values[i])} note={counted(column.orders, 'order')} />
			}))} />
	)
}

// on touch a figure card is its label and figure only (Mobile screens 7a)
function Kpis({ view, chart, was, by, waiting, touch }) {
	const shown = chart.columns
	const spark = (value, format, label) => (touch ? null : <Spark columns={shown} value={value} format={format} label={label} />)
	// the header names the step its bars are drawn in (4a); a phone tile has no bars
	const per = label => (touch ? label : `${label}${dot}by ${chart.unit}`)
	const money = n => currency(n, 0)
	const compared = line => (was ? line(was) : waiting ? <Skeleton shape="pill" /> : null)
	// a phone tile draws the figure without its currency (Mobile screens 7a), so a million still fits on one line
	const figure = n => (touch ? amount(n, 0) : currency(n, 0))
	// a change against nothing has no percentage, so it reads as a dash (Actions inventory)
	const rise = (now, then) => (then ? signed(now - then, percent(Math.abs(share(now - then, then)), 1)) : '-')
	const cost = (now, then) => (!then || now === then ? 'default' : now > then ? 'danger' : 'success')
	return [
		<Card key="spend">
			<Stat label={per('Total spend')} figure={figure(view.spent)} />
			{compared(then => <Change tone={cost(view.spent, then.spent)} against={currency(then.spent, 0)} by={by}>{rise(view.spent, then.spent)}</Change>)}
			{spark(c => c.spend, money, `Total spend in each ${chart.unit}`)}
		</Card>,
		<Card key="orders">
			<Stat label={per('Orders')} figure={amount(view.orders, 0)} />
			{compared(then => (
				<Change tone={view.orders > then.orders ? 'success' : 'default'} against={amount(then.orders, 0)} by={by}>
					{signed(view.orders - then.orders, amount(Math.abs(view.orders - then.orders), 0))}
				</Change>
			))}
			{spark(c => c.orders, n => amount(n, 0), `Orders in each ${chart.unit}`)}
		</Card>,
		<Card key="average">
			<Stat label={per('Average order')} figure={figure(view.average)} />
			{compared(then => (
				<Change state={then.average && Math.round(view.average) !== Math.round(then.average) ? 'progress' : undefined} against={currency(then.average, 0)} by={by}>
					{rise(view.average, then.average)}
				</Change>
			))}
			{spark(c => (c.orders ? c.spend / c.orders : 0), money, `Average order in each ${chart.unit}`)}
		</Card>,
		<Card key="saved">
			<Stat label={per('Saved')} color={isSaving(view.saved, 0) ? 'success' : 'zero'} figure={figure(view.saved)} />
			{compared(then => (
				<Change tone={view.saved > then.saved ? 'success' : 'default'} against={currency(then.saved, 0)} by={by}>
					{signed(view.saved - then.saved, currency(Math.abs(view.saved - then.saved), 0))}
				</Change>
			))}
			{spark(c => c.saved, money, `Saved in each ${chart.unit}`)}
		</Card>
	]
}

/** Inside a crumb the figures are held against the level above, not an earlier window (4b, 4c). */
function DrilledKpis({ view, parent, above, versusAll, chart, time, category, flow, touch }) {
	const figure = n => (touch ? amount(n, 0) : currency(n, 0))
	const of = parent && parent.spent > 0 && view.spent >= 0 ? `${percent(share(view.spent, parent.spent), 0)} of ${above}` : null
	const higher = parent && parent.average > 0 ? view.average - parent.average : null
	const versus = higher == null || Math.round(view.average) === Math.round(parent.average)
		? null : `${signed(higher, percent(Math.abs(share(higher, parent.average)), 0))} vs ${versusAll}`
	/* A category's limit, against the month the chart ends on, or against the stretch a time crumb chose. */
	let limit = null
	if (category?.budget > 0 && flow !== 'refunds') {
		const last = chart.unit === 'month' && !time ? chart.columns.at(-1) : null
		const spent = last ? last.spend : view.spent
		const allowed = last ? category.budget : category.budget * view.budgets.months
		const label = last ? monthNames('long', true)[Number(last.from.slice(5, 7)) - 1] : time ?? 'this period'
		limit = { spent, allowed, help: `${label}, ${spent > allowed ? 'over' : 'under'}`, over: spent > allowed }
	}
	return [
		<Card key="spend"><Stat label="Spend" figure={figure(view.spent)} help={of} /></Card>,
		<Card key="orders"><Stat label="Orders" figure={amount(view.orders, 0)} /></Card>,
		<Card key="average"><Stat label="Average order" figure={figure(view.average)} help={versus} helpColor={higher > 0 ? 'warning' : 'default'} /></Card>,
		limit
			? <Card key="limit"><Stat label="Against the limit" figure={`${amount(limit.spent, 0)} / ${amount(limit.allowed, 0)}`} help={limit.help} helpColor={limit.over ? 'warning' : 'default'} /></Card>
			: <Card key="saved"><Stat label="Saved" color={isSaving(view.saved, 0) ? 'success' : 'zero'} figure={figure(view.saved)} /></Card>
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

const SHAPES = [{ value: 'Stacked', label: 'Stacked' }, { value: 'Total', label: 'Total' }]

/** A column's spend split by the window's top three categories and the rest, each a share of the bar. */
function segmentsOf(column) {
	const parts = column.byCategory.map(n => Math.max(0, n))
	const rest = Math.max(0, column.spend - parts.reduce((sum, n) => sum + n, 0))
	const whole = parts.reduce((sum, n) => sum + n, rest)
	return [...parts, rest].map((n, i) => ({ key: String(i + 1), share: share(n, whole) })).filter(s => s.share > 0)
}

/** A step of the spend chart, read out (4a): its name and total, each category the bars are split
    by and the rest, and how many orders it holds. */
function SpendTip({ column, categories, opens }) {
	const parts = categories ? column.byCategory.slice(0, categories.length) : []
	const rest = column.spend - parts.reduce((sum, n) => sum + n, 0)
	const rows = categories
		? [
			...categories.map((c, i) => ({ key: c.id, series: i + 1, name: c.name, value: amount(parts[i] ?? 0, 0) })),
			{ key: 'other', series: 4, name: 'Other', value: amount(rest, 0) }
		]
		: []
	const title = column.crumb?.kind === 'week' ? `Week ${Number(column.crumb.value.slice(6))}` : column.name
	return <ChartTip title={title} value={currency(column.spend, 0)} rows={rows} note={`${counted(column.orders, 'order')}${opens ? `${dot}click to narrow down` : ''}`} />
}

function SpendChart({ chart, unit: soonUnit, running: soon, touch, selected, narrowed, stackable = false, categories = [], limit = 0, onOpen }) {
	const [shapeOf, setShape] = useState('Stacked')
	const columns = chart?.columns ?? []
	const unit = chart?.unit ?? soonUnit
	const splits = stackable && categories.length > 0
	const stackedNow = splits && shapeOf === 'Stacked'
	const most = Math.max(...columns.map(column => column.spend), 0)
	const top = scaleFor(Math.max(most, limit))
	const bars = useRef(null)
	const fit = useFit(bars, `${touch} ${columns.length}`)
	// before the window answers, the calendar says whether it is still running
	const running = chart ? columns.some(column => column.running) : soon
	const select = unit === 'day' || !onOpen ? undefined : key => onOpen(columns.find(column => column.key === key))
	const drawn = columns.map(column => {
		const height = share(Math.max(0, column.spend), top) * fit
		return {
			key: column.key,
			from: column.from,
			to: column.to,
			label: `${column.name}, ${currency(column.spend, 0)}`,
			height,
			muted: !stackedNow && column.running,
			tick: tickOf(chart, column, touch),
			// a pointer reads a step in a panel beside it (4a); a phone has no pointer to hover with
			tip: touch ? undefined : <SpendTip column={column} categories={stackedNow ? categories : null} opens={!!select} />,
			...(stackedNow && column.spend > 0 ? { segments: segmentsOf(column) } : {})
		}
	})
	const below = columns.filter(column => column.spend < 0)
	const limitLine = limit > 0 && !touch
		? { at: `${100 - share(limit, top) * fit}%`, label: `${unit === 'month' ? 'Monthly limit' : 'Limit'} ${currency(limit, 0)}` }
		: undefined
	return (
		<Card aria-busy={chart ? undefined : 'true'}>
			<div className="sp-row-flex sp-gap-12 sp-wrap">
				<span className="sp-section-label">Spend by {unit}</span>
				<span className="sp-grow" />
				{narrowed ? <span className="sp-meta">{narrowed}</span> : null}
				{stackedNow || (running && !narrowed) || limitLine
					? (
						<Legend>
							{stackedNow
								? <>{categories.map((c, i) => <LegendItem series={i + 1} key={c.id}>{c.name}</LegendItem>)}<LegendItem series={4}>Other</LegendItem></>
								: running && !narrowed
									? <><LegendItem series={1}>Spend</LegendItem><LegendItem series={4}>Not yet complete</LegendItem></>
									: null}
							{limitLine ? <LegendItem series="limit">{limitLine.label}</LegendItem> : null}
						</Legend>
					)
					: null}
				{splits && !touch
					? <Segmented name="statistics-bar-shape" options={SHAPES} value={shapeOf} onChange={setShape} aria-label="Bar shape" />
					: null}
			</div>
			{touch
				? <Bars ref={bars} columns={drawn} selected={select ? selected : undefined} onSelect={select} loading={!chart} />
				: (
					<Plot axis={chart ? [4, 3, 2, 1, 0].map(step => compactAmount((top / 4) * step)) : AXIS_HOLD} gridlines={5} limit={limitLine}>
						<Bars ref={bars} variant="plot" columns={drawn} selected={select ? selected : undefined} onSelect={select} loading={!chart} />
					</Plot>
				)}
			{below.length
				? (
					<>
						<div className="os-below" aria-hidden="true">
							{columns.map(column => (
								<span key={column.key} className={column.spend < 0 ? 'os-below__bar' : undefined} />
							))}
						</div>
						<span className="sp-meta">
							{below.map(column => column.name).join(', ')} returned more than {below.length === 1 ? 'it' : 'they'} bought.
						</span>
					</>
				)
				: null}
		</Card>
	)
}

// the ring's hole is 78 wide: from a hundred thousand the figure is in whole thousands, "486k", "1.359k"
const ringFigure = n => (Math.abs(n) >= 100000 ? `${amount(Math.round(n / 1000), 0)}k` : compactAmount(n))

/** The top three categories and one line for the rest, which opens nothing (4d), read from the ring
    beside them (4a). Under net a share can be negative, which a ring cannot draw, so it is left out (4e). */
function CategoryShares({ view, known, name, ring, onOpen }) {
	// the ring names the month in its hole; without the ring the head names it
	const head = (
		<div className="sp-row-flex sp-gap-8">
			<span className="sp-section-label">By category</span>
			<span className="sp-grow" />
			{ring ? null : <span className="sp-meta">{name}</span>}
		</div>
	)
	if (!view) {
		return (
			<Card aria-busy="true">
				{head}
				<div className="sp-row-flex sp-gap-16">
					{ring ? <Donut loading /> : null}
					<div className="sp-grow">
						<Shares aria-hidden="true">
							{WIDTHS.slice(0, Math.min(4, Math.max(1, known ?? 4))).map((w, i) => (
								<ShareRow key={w} series={i + 1} value={hold('18')} disabled>{hold(w)}</ShareRow>
							))}
						</Shares>
					</div>
				</div>
			</Card>
		)
	}
	const split = view.split
	const rest = split.slice(3)
	const folded = rest.length > 1
	const shown = (folded ? split.slice(0, 3) : split).map((entry, i) => ({ ...entry, series: i + 1 }))
	const lines = folded ? [...shown, { id: 'other', other: true, series: 4, share: rest.reduce((sum, entry) => sum + entry.share, 0) }] : shown
	return (
		<Card>
			{head}
			<div className="sp-row-flex sp-gap-16">
				{ring
					? (
						<Donut shares={lines.map(entry => ({ value: entry.share, series: entry.series }))} figure={ringFigure(view.spent)}
							label={name} aria-label={`Share of ${nameOf(view.range, view.id, true)} spend by category`} />
					)
					: null}
				<div className="sp-grow">
					<Shares>
						{lines.map(entry => (entry.other
							? (
								<ShareRow key="other" series={4} value={`${Math.round(entry.share)}%`} aria-disabled="true">
									Other {counted(rest.length, 'category', 'categories')}
								</ShareRow>
							)
							: (
								<ShareRow key={entry.id ?? 'none'} series={entry.series} value={`${Math.round(entry.share)}%`}
									onClick={onOpen ? () => onOpen(entry.id ?? 'none') : undefined}>
									{entry.name}
								</ShareRow>
							)))}
					</Shares>
				</div>
			</div>
		</Card>
	)
}

/** A row a reader presses to drill into what it names: the whole row is the button. */
function Pick({ onPick, label, children }) {
	if (!onPick) return children
	return <button type="button" className="os-pick" onClick={onPick} aria-label={label}>{children}</button>
}

/** A ranked list with a bar under each line: the top eight and one line for the rest, or all of
    them in a region that scrolls inside the card (4d). With no entries yet, `rows` skeleton lines. */
function Ranked({ entries, rows = TOP + 1, noun, touch, open, onOpen, counts = false }) {
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
		? [...entries.slice(0, TOP), {
			id: 'other', other: true, name: `Other ${amount(rest.length, 0)} ${noun}`,
			amount: rest.reduce((sum, entry) => sum + entry.amount, 0), orders: rest.reduce((sum, entry) => sum + (entry.orders ?? 0), 0)
		}]
		: entries
	// the remainder can outweigh the top entry, so each bar is a share of the largest line shown
	const most = Math.max(...lines.map(entry => Math.abs(entry.amount)), 0)
	const ink = entry => (entry.amount < 0 ? 'sp-amount sp-ink-danger' : 'sp-amount')
	const drawn = lines.map(entry => {
		const pick = !entry.other && onOpen ? () => onOpen(entry.id ?? 'none') : undefined
		const gauge = <Gauge thin={touch} value={share(Math.abs(entry.amount), most)} remainder={entry.other} negative={entry.amount < 0} aria-label={entry.name} />
		return (
			<Pick key={entry.id ?? 'none'} onPick={pick} label={`${entry.name}, ${currency(entry.amount, 0)}`}>
				{touch
					? (
						<div className="sp-stack">
							<Sum named value={amount(entry.amount, 0)}>{entry.other ? <span className="sp-subtitle">{entry.name}</span> : entry.name}</Sum>
							{gauge}
						</div>
					)
					: (
						<div className="sp-stack sp-gap-6">
							<div className="sp-row-flex sp-gap-8">
								<span className={entry.other ? 'sp-data sp-subtitle sp-grow sp-truncate' : 'sp-data sp-grow sp-truncate'}>{entry.name}</span>
								<span className={ink(entry)}>{currency(entry.amount, 0)}</span>
								{counts ? <span className="sp-meta">{counted(entry.orders, 'order')}</span> : null}
							</div>
							{gauge}
						</div>
					)}
			</Pick>
		)
	})
	return open ? <div className="os-scroll sp-scrolls">{drawn}</div> : drawn
}

/** The card's footer: the way to every line once there are more than the resting nine. */
function moreFooter(entries, count, noun, open, setOpen) {
	if (count <= TOP + 1) return null
	if (!entries) return [buttonHold('all')]
	return [<ShowAll key="all" open={open} onClick={() => setOpen(!open)} count={count} noun={noun} />]
}

function CategoryRows({ view, known, name, onOpen, hint = false }) {
	const [open, setOpen] = useState(false)
	const entries = view?.split
	const count = entries ? entries.length : known ?? TOP + 2
	return (
		<Card aria-busy={entries ? undefined : 'true'} footer={moreFooter(entries, count, 'categories', open, setOpen)}>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">By category</span>
				<span className="sp-grow" />
				{hint && onOpen ? <span className="sp-meta">click to narrow further</span> : name ? <span className="sp-meta">{name}</span> : null}
			</div>
			<Ranked entries={entries} rows={Math.min(count, TOP + 1)} noun="categories" touch open={open} onOpen={onOpen} />
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

// a chart past ten bars collides its labels, so it stops at ten and the remainder is one bar (4d)
const CHART_TOP = 10

/** The window's spend by vendor as bars: the top ten and the rest as one bar that opens nothing (4d). */
function VendorChart({ view, onOpen }) {
	const bars = useRef(null)
	const vendors = view?.vendorSplit
	const rest = vendors ? vendors.slice(CHART_TOP) : []
	const folded = rest.length > 1
	const fit = useFit(bars, `${vendors?.length} ${folded}`)
	const head = (
		<div className="sp-row-flex sp-gap-8">
			<span className="sp-section-label">Spend by vendor</span>
			<span className="sp-grow" />
			{folded ? <span className="sp-meta">top {CHART_TOP}, remainder as one bar</span> : null}
		</div>
	)
	if (!vendors) return <Card aria-busy="true">{head}<Bars loading /></Card>
	const lines = folded
		? [...vendors.slice(0, CHART_TOP), {
			id: 'other', other: true, name: `Other ${amount(rest.length, 0)}`,
			amount: rest.reduce((sum, entry) => sum + entry.amount, 0), orders: rest.reduce((sum, entry) => sum + entry.orders, 0)
		}]
		: vendors
	// the remainder can outweigh the top vendor, so each bar is a share of the tallest one drawn
	const most = Math.max(...lines.map(entry => entry.amount), 0)
	const columns = lines.map(entry => ({
		key: entry.id,
		label: `${entry.other ? `Other ${counted(rest.length, 'vendor')}` : entry.name}, ${currency(entry.amount, 0)}`,
		height: share(Math.max(0, entry.amount), most) * fit,
		muted: entry.other,
		inert: entry.other,
		tick: entry.name
	}))
	return (
		<Card>
			{head}
			<Bars ref={bars} columns={columns} named onSelect={onOpen} />
		</Card>
	)
}

function VendorsCard({ view, name, touch, onOpen }) {
	const [open, setOpen] = useState(false)
	const vendors = view?.vendorSplit
	// before the window answers, the card holds its resting cap: eight, the rest, and the way to all
	const count = vendors ? vendors.length : TOP + 2
	const folds = count > TOP + 1
	const all = folds ? moreFooter(vendors, count, 'vendors', open, setOpen) : null
	return (
		<Card aria-busy={vendors ? undefined : 'true'}>
			<div className="sp-row-flex sp-gap-12">
				<span className="sp-section-label">Top vendors</span>
				<span className="sp-grow" />
				<span className="sp-meta">{vendors ? `${name}${dot}${folds && !open ? `top ${TOP} of ${amount(count, 0)}` : `all ${amount(count, 0)}`}` : name}</span>
			</div>
			<Ranked entries={vendors} noun="vendors" touch={touch} open={open} onOpen={onOpen} counts={!touch} />
			<CardFooter>
				{all}
				<span className="sp-grow" />
				<span className="sp-meta">{vendors ? `${currency(view.spent, 0)} total` : hold('96', '11')}</span>
			</CardFooter>
		</Card>
	)
}

const STATUSES = ['Delivered', 'Ordered', 'Returned']
// the statuses each lens can hold: an expense is never a returned order, a refund always is
const LENS_STATUSES = { expenses: ['Delivered', 'Ordered'], refunds: ['Returned'], net: STATUSES }

function StatusCard({ view, flow = 'expenses', onOpen }) {
	const total = view?.orders ?? 0
	const counts = new Map((view?.statusSplit ?? []).map(s => [s.status, s.orders]))
	const shown = [...LENS_STATUSES[flow], ...[...counts.keys()].filter(s => !LENS_STATUSES[flow].includes(s))]
	return (
		<Card aria-busy={view ? undefined : 'true'}>
			<span className="sp-section-label">By status</span>
			{shown.map(status => {
				const count = view ? counts.get(status) ?? 0 : null
				return (
					<Pick key={status} onPick={onOpen && count ? () => onOpen(status) : undefined} label={`${status}, ${counted(count ?? 0, 'order')}`}>
						<div className="sp-stack sp-gap-6">
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
					</Pick>
				)
			})}
		</Card>
	)
}

function SavingChart({ chart, name, touch, selected, onOpen }) {
	const columns = chart?.columns
	const most = Math.max(...(columns ?? []).map(column => column.spend), 0)
	const select = !chart || chart.unit === 'day' || !onOpen ? undefined : key => onOpen(columns.find(column => column.key === key))
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
							pair: [share(Math.max(0, column.spend), most), share(Math.max(0, column.saved), most)],
							tick: tickOf(chart, column, touch)
						}))}
						selected={select ? selected : undefined}
						onSelect={select}
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

/** One category inside a crumb, month by month against its one limit (4c). */
function LimitByMonth({ chart, selected, category, pace, touch }) {
	const budget = category.budget
	const edit = <EditLimit key="edit" category={category} />
	const upTo = selected ? chart.columns.findIndex(c => c.key === selected) + 1 : chart.columns.length
	const months = chart.columns.slice(Math.max(0, upTo - 3), upTo)
	return (
		<Card footer={touch ? [edit] : null}>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">By month, against the limit</span>
				<span className="sp-grow" />
				<span className="sp-meta">limit {currency(budget, 0)}</span>
				{touch ? null : edit}
			</div>
			{months.map(column => {
				const scale = Math.max(column.spend, budget)
				const over = column.spend > budget
				const marker = column.running && pace.running ? share(budget * (pace.daysIn / pace.unitDays), scale) : undefined
				const month = monthNames('long', true)[Number(column.from.slice(5, 7)) - 1]
				return (
					<div className="sp-stack sp-gap-6" key={column.key}>
						<div className="sp-row-flex sp-gap-8">
							<span className={column.running ? 'sp-data sp-subtitle' : 'sp-data'}>{month}</span>
							<span className="sp-grow" />
							<span className="sp-amount">{amount(column.spend, 0)}</span>
						</div>
						<Gauge value={share(Math.min(column.spend, budget), scale)} over={over ? share(column.spend - budget, scale) : undefined}
							marker={marker} aria-label={month} />
					</div>
				)
			})}
		</Card>
	)
}

/* How many categories had a limit when this tab last knew, so a fresh load holds that many rows. */
const LIMITED = 'spendly:limited'
const rememberedLimits = () => { try { return Number(sessionStorage.getItem(LIMITED)) || 0 } catch { return 0 } }
const rememberLimits = n => { try { sessionStorage.setItem(LIMITED, String(n)) } catch { /* storage denied */ } }

/** Every category's limit is set on the overview (5d); one category's on its own page, at the limit (5f). */
const EditLimit = ({ category }) => (
	<Button variant="outline" size="small" to={category ? `/categories/${category.id}/edit?focus=limit` : '/categories'}>Edit on category</Button>
)

function LimitCard({ view, name, running, categories, touch, onRetry }) {
	const edit = <EditLimit key="edit" />
	// a phone button takes the full width, so there it sits in the card's footer rather than squeezing the label
	const head = (
		<div className="sp-row-flex sp-gap-12">
			<span className="sp-section-label">Monthly limit</span>
			<span className="sp-grow" />
			<span className="sp-meta">{name}</span>
			{touch ? null : edit}
		</div>
	)
	const limited = categories.data?.filter(category => category.budget > 0)
	useEffect(() => { if (limited) rememberLimits(limited.length) }, [limited?.length])
	const [open, setOpen] = useState(false)
	if (categories.error) return (
		<Hold shape={<LimitCard view={view} name={name} running={running} categories={{}} touch={touch} />}>
			<Failed variant="card" label="Monthly limit" what="The limits" error={categories.error} onRetry={onRetry} />
		</Hold>
	)
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
	const note = 'Each category has one limit that applies to every month.'
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
				<CardFooter aria-hidden="true">
					<span className="sp-data">All categories</span>
					<span className="sp-grow" />
					<span className="sp-amount">{hold('104')}</span>
				</CardFooter>
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
		.sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name))
	const pace = view.pace.running ? share(view.pace.daysIn, view.pace.unitDays) : null
	const allowed = rows.reduce((sum, row) => sum + row.allowed, 0)
	// the most spent rest at the top eight, as drawn (4a); past the resting nine the rest are a press away (4d)
	const folds = rows.length > TOP + 1
	const all = folds ? <ShowAll key="all" open={open} onClick={() => setOpen(!open)} count={rows.length} noun="categories" /> : null
	const drawn = rows.slice(0, folds && !open ? TOP : rows.length).map(row => {
		const over = row.spend > row.allowed
		const scale = Math.max(row.spend, row.allowed)
		// ahead of pace only past ten points over the marker (4a, 5d)
		const ahead = !over && pace != null && row.used > pace + 10
		const text = over
			? `${currency(row.spend - row.allowed, 0)} over budget`
			: `${currency(row.allowed - row.spend, 0)} left${ahead ? `${dot}ahead of pace` : ''}`
		return (
			<div className="sp-stack sp-gap-6" key={row.id}>
				<div className="sp-row-flex sp-gap-8">
					<span className="sp-data sp-grow sp-truncate">{row.name}</span>
					<span className="sp-amount">{amount(row.spend, 0)}</span>
					<span className="sp-meta sp-nowrap">/ {currency(row.allowed, 0)}</span>
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
	})
	return (
		<Card footer={all ? [...(footer ?? []), all] : footer} footerLayout={touch && all ? 'stack' : 'fill'}>
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
			{open ? <div className="os-scroll sp-scrolls">{drawn}</div> : drawn}
			{/* the whole window's spend against every limit, the same share Home states */}
			<CardFooter>
				<span className="sp-data">All categories</span>
				<span className="sp-grow" />
				<span className="sp-amount">{amount(view.spent, 0)}</span>
				<span className="sp-meta">/ {currency(allowed, 0)}</span>
			</CardFooter>
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

function OrdersTable({ view, name, drilled, rows, ofPeriod, matched, failed, onLoadMore, onRetry }) {
	const column = useRef(null)
	const show = columnsFor(useWidth(column))
	let body
	if (!rows.length && failed) {
		body = <Failed what={`The orders in ${name}`} error={failed} onRetry={onRetry} />
	}
	// a page of rows holds the table's place, or the window's own count once it is known
	else if (!rows.length) body = <RowsLoading show={show} size={view ? Math.min(view.orders, SLICE) : SLICE} total={view?.orders} />
	else {
		body = (
			<List data={rows} recordKey={order => order.id} noun="orders" pageSize={SLICE} total={matched} onLoadMore={onLoadMore} selectionKey={`${view.id} ${view.slice.from}`}
				rowTo={order => `/orders/${order.id}`} locale={NUMBER_LOCALE}>
				<Caption>
					{drilled
						? <span className="sp-section-label">The {counted(view.orders, 'order')} behind this</span>
						: <strong className="sp-data">{counted(view.orders, 'order')} in this slice</strong>}
					<span className="sp-meta">{dot}{currency(view.spent)}</span>
					<Saving value={view.saved} variant="help" />
					<span className="sp-grow" />
					<span className="sp-meta">{drilled ? ofPeriod : 'newest first'}</span>
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
										<CategoryChips categories={order.categories} />
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

function SliceCard({ view, link, drilled }) {
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
		<ListItem variant="card" to={link} chevron={chevron}>
			<Stacked>
				<span className="sp-title">{drilled ? `The ${counted(view.orders, 'order')} behind this` : `${counted(view.orders, 'order')} in this slice`}</span>
			</Stacked>
			<span className="sp-stacked sp-cell-amount">
				<span className="sp-amount">{currency(view.spent)}</span>
				<Saving value={view.saved} />
			</span>
		</ListItem>
	)
}
