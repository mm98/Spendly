import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Check, Choice, FieldGroup, FieldGroupMore, FieldGroupPanel, FieldGroupValues, Switch } from '../components/Choice.jsx'
import { Chip } from '../components/Chip.jsx'
import { Combobox, ComboboxOption } from '../components/Combobox.jsx'
import { DateField, RangePicker, RangeSheet } from '../components/DatePickers.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { AskTrail, RangeSlider, SearchInput } from '../components/Inputs.jsx'
import { BulkBar, Caption, Controls, Crumb, Facets, Filters, List, ListCell, ListHead, ListMore, ListRow, ListToolbar, Selected } from '../components/List.jsx'
import { Announce, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast, Leaving } from '../components/Overlays.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { Empty, EmptyBody, EmptyTitle, Line, Skeleton, Stacked, useFocusTrap } from '../components/Utilities.jsx'
import { failureMessage, getCategoryPage, getCurrentUser, getImport, getOrders, getSearchNames, getSettings, getVendorPage, kindName, spendKinds } from '../api/client.js'
import { peek, readAs, useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, activeLocaleCode, amount, currency, dot, plural, shortDate, today, withShortMonth } from '../api/format.js'
import { useAskSearch } from '../app/askSearch.js'
import { useListMemory } from '../app/listMemory.js'
import { nameSpans, readSearch, withoutPart } from '../app/searchReading.js'
import { useScanPicker } from '../app/scanPicker.jsx'
import { useShellShape, useWidth } from '../app/useMedia.js'
import { CategoryChips, OrderAmount, OrderFiles, OrderNote, OrderPhoto, OverLimitDot, OverLimitProvider, StatusPill, columnsFor, orderLine, useOverLimitIds, vendorName } from '../app/orderRow.jsx'
import { Saving } from '../app/saving.jsx'
import { useStatuses, useStatusTypes } from '../app/statuses.js'
import { linesCsv, linesOf, saveCsv } from '../app/ordersCsv.js'
import { DeleteOrder } from './DeleteOrder.jsx'
import { BulkActions, useStatusName } from './OrderBulk.jsx'
import { OrderCard, PressedRow, RowMenu, orderName } from './OrderMenu.jsx'
import { SheetViews, ViewsCard } from './OrderViews.jsx'
import { useViews, viewLink } from '../app/views.jsx'
import { usePageSearch } from '../app/afterDraw.js'
import { usePhrase } from '../language/phrases.js'

const SORTS = [
	{ id: 'date-desc', label: 'orders.sort.newest' },
	{ id: 'date-asc', label: 'orders.sort.oldest' },
	{ id: 'amount-desc', label: 'orders.sort.highest' },
	{ id: 'amount-asc', label: 'orders.sort.lowest' },
	{ id: 'vendor-asc', label: 'orders.sort.vendor' }
]

/* The column a sort orders by, and which way: its head says so (2b). */
const SORTED = { 'date-desc': ['date', '↓'], 'date-asc': ['date', '↑'], 'amount-desc': ['amount', '↓'], 'amount-asc': ['amount', '↑'], 'vendor-asc': ['title', '↑'] }
const headOf = (sort, column, label) => (SORTED[sort]?.[0] === column ? `${label} ${SORTED[sort][1]}` : label)

const FACETS = ['vendor', 'category', 'status', 'receipt', 'files', 'discounted', 'period', 'from', 'to', 'kind', 'min', 'max', 'import']
const FILTERS = ['q', ...FACETS]

/* A facet that takes several values holds them comma-separated in the address. */
const listOf = s => (s ? s.split(',').filter(Boolean) : [])
const toggled = (s, value, on) => [...listOf(s).filter(v => v !== value), ...(on ? [value] : [])].join(',')

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const day = (y, m, d) => iso(new Date(y, m, d))

const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(new Date(s + 'T00:00')) === s
const isAmount = s => s !== '' && Number.isFinite(Number(s)) && Number(s) >= 0

/* What the address asks for. A date or an amount the page cannot read, or a range that ends
   before it starts, counts as not set, so a bad link shows the whole list instead of none. */
const readFilters = params => {
	const f = Object.fromEntries([...FILTERS, 'sort'].map(k => [k, params.get(k) ?? '']))
	for (const k of ['from', 'to']) if (!isDay(f[k])) f[k] = ''
	for (const k of ['min', 'max']) if (!isAmount(f[k])) f[k] = ''
	if (f.from && f.to && f.to < f.from) f.from = f.to = ''
	// a named period is kept as its name, so a link or a saved view rolls with the calendar (2d)
	const preset = PRESETS.find(p => p.key === f.period)
	if (preset) [f.from, f.to] = preset.range(new Date())
	else f.period = ''
	if (f.min && f.max && Number(f.max) < Number(f.min)) f.min = f.max = ''
	return f
}

const withChanges = (params, changes) => {
	const next = new URLSearchParams(params)
	for (const [k, v] of Object.entries(changes)) {
		if (v === '' || v == null) next.delete(k)
		else next.set(k, String(v))
	}
	return next
}

const requestOf = (f, sort) => ({
	query: f.q, vendorId: f.vendor, categoryId: f.category, status: f.status, kind: f.kind,
	receipt: f.receipt, files: f.files, discounted: f.discounted, importId: f.import,
	from: f.from, to: f.to || (f.from ? today() : ''), minAmount: f.min, maxAmount: f.max, sort
})

/* The address's names for the filters Ask gives, which it names as the assistant's list_orders does. */
const ASKED_KEYS = { query: 'q', vendorId: 'vendor', categoryId: 'category', status: 'status', kind: 'kind', from: 'from', to: 'to', minAmount: 'min', maxAmount: 'max' }

/* A part of the typed search sets its filters beside the address's own (Order list 2b). A shop or a
   category joins those picked; a date replaces the date asked, a named period or two days alike. */
const SEVERAL = new Set(['vendor', 'category'])
const DATES = ['period', 'from', 'to']
const withParts = (params, reading) => {
	const next = new URLSearchParams(params)
	if (reading.rest) next.set('q', reading.rest)
	else next.delete('q')
	for (const part of reading.parts)
		for (const [key, value] of Object.entries(part.set)) {
			if (DATES.includes(key)) for (const k of DATES) if (!(k in part.set)) next.delete(k)
			next.set(key, SEVERAL.has(key) ? [...new Set([...listOf(next.get(key)), value])].join(',') : value)
		}
	return next
}

/* A change keeps a typed part whose value it still asks for, without writing the value to the address
   too; any other part it touches goes, words and all. A change to the search itself is left as it is. */
const throughParts = (changes, typed, reading) => {
	if ('q' in changes) return changes
	const out = { ...changes }
	let q = typed
	for (const part of [...reading.parts].reverse()) {
		const touched = Object.keys(part.set).filter(k => k in out || (DATES.includes(k) && DATES.some(d => d in out)))
		if (!touched.length) continue
		const kept = Object.entries(part.set).every(([k, v]) => (SEVERAL.has(k) ? listOf(out[k] ?? '').includes(v) : (out[k] ?? '') === v))
		if (!kept) { q = withoutPart(q, part); continue }
		for (const [k, v] of Object.entries(part.set)) out[k] = SEVERAL.has(k) ? listOf(out[k]).filter(x => x !== v).join(',') : ''
	}
	return q === typed ? out : { ...out, q }
}

/* A preset is a calendar period around today, held in the address by its name; a link that carries
   the same two dates still lands on the same chip. */
const PRESETS = [
	{ key: 'week', label: 'period.thisWeek', range: n => { const at = n.getDate() - (n.getDay() + 6) % 7; return [day(n.getFullYear(), n.getMonth(), at), day(n.getFullYear(), n.getMonth(), at + 6)] } },
	{ key: 'month', label: 'period.thisMonth', range: n => [day(n.getFullYear(), n.getMonth(), 1), day(n.getFullYear(), n.getMonth() + 1, 0)] },
	{ key: 'quarter', label: 'period.thisQuarter', range: n => { const q = n.getMonth() - n.getMonth() % 3; return [day(n.getFullYear(), q, 1), day(n.getFullYear(), q + 3, 0)] } },
	{ key: 'year', label: 'period.thisYear', range: n => [day(n.getFullYear(), 0, 1), day(n.getFullYear(), 11, 31)] }
]
const presetOf = (from, to) => PRESETS.find(p => { const [a, b] = p.range(new Date()); return a === from && b === to })

/* The server answers at most this many rows at once. */
const MOST = 1000

/* Load more adds one page to those held; a fresh start asks in blocks of whole pages up to MOST. */
const loaded = readAs(getOrders, async (request, size, pages, signal) => {
	const before = pages > 1 ? peek(loaded, [request, size, pages - 1]) : null
	if (before && before.orders.length === size * (pages - 1)) {
		const next = await getOrders({ ...request, page: pages, pageSize: size }, signal)
		return { ...next, orders: [...before.orders, ...next.orders] }
	}
	const block = size * Math.max(1, Math.floor(MOST / size))
	const want = size * pages
	const parts = []
	for (let page = 1; (page - 1) * block < want; page++) {
		parts.push(await getOrders({ ...request, page, pageSize: Math.min(block, want) }, signal))
		if (parts.at(-1).orders.length < Math.min(block, want)) break
	}
	return { ...parts.at(-1), orders: parts.flatMap(p => p.orders).slice(0, want) }
})

const importDate = () => new Intl.DateTimeFormat(activeLocaleCode(), { day: 'numeric', month: 'short', year: 'numeric' })

const RECEIPT = { attached: 'orders.receiptAttached', missing: 'orders.receiptMissing' }

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 864e5) + 1

/* What was picked, per step in the history, so opening an order and coming back finds it (c1);
   reaching the list any other way starts with nothing picked. Kept while the app is open. */
const pickedAt = new Map()
const PICKS_KEPT = 50

/* A right-click on a row or a card opens its own menu, as its ⋮ does (c1). */
const menuHere = ev => {
	if (ev.target.closest('.sp-menu, input, textarea')) return
	const button = ev.target.closest('tr, .sp-record')?.querySelector('[aria-haspopup="menu"]')
	if (!button) return
	ev.preventDefault()
	if (button.getAttribute('aria-expanded') === 'true') button.focus()
	else button.click()
}

/** The order list (Order list 2b): the facet rail, then search, sort, what is filtering, and the orders. */
export default function OrderList() {
	const phrase = usePhrase()
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	// what the typed search reads (2b): its parts filter beside the address's own, its other words search
	const typed = params.get('q') ?? ''
	const reading = useSearchReading(typed)
	const asked = useMemo(() => withParts(params, reading), [params, reading])
	const f = useMemo(() => readFilters(asked), [asked])
	// Orders opened with nothing asked opens on the default view, if one is set (2g); only on arrival
	const arrived = useRef([...params.keys()].length === 0)
	const viewsAnswer = useViews().data
	useEffect(() => {
		if (!arrived.current || !viewsAnswer) return
		arrived.current = false
		const first = viewsAnswer.views.find(v => v.isDefault)
		if (first && [...new URLSearchParams(window.location.hash.split('?')[1] ?? '').keys()].length === 0)
			navigate(viewLink(first), { replace: true })
	}, [viewsAnswer, navigate])
	const shape = useShellShape()
	const touch = shape === 'touch'
	// the facet rail stands beside the list only on a wide window; below that it is a sheet (18b)
	const railed = shape === 'wide'

	const settings = useApi(getSettings)
	// the vendors and categories the filters name, for their crumbs
	const vendors = usePicked('vendor', listOf(f.vendor))
	const categories = usePicked('category', listOf(f.category))
	const amountScale = useApi(getOrders, [{ pageSize: 0, with: 'amountScale' }])
	const fromImport = useApi(getImport, [f.import], { enabled: !!f.import })
	const user = useApi(getCurrentUser).data
	const reads = user?.scanAiEnabled
	const held = user?.emailConfirmed === false

	const sort = SORTS.some(s => s.id === f.sort) ? f.sort
		: SORTS.some(s => s.id === settings.data?.sort) ? settings.data.sort : 'date-desc'
	const size = settings.data?.pageSize ?? 10

	// starts from the address itself: the page can still be drawing the one before it, and
	// building on that would undo the change made just before this one
	const read = useRef(reading)
	read.current = reading
	const update = useCallback(changes => {
		const now = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
		// a changed filter or sort starts the list again from its first page
		setParams(withChanges(now, { pages: '', ...throughParts(changes, now.get('q') ?? '', read.current) }), { replace: true })
	}, [setParams])

	// a new key starts the search field over from the address, dropping text not yet written
	const [searchKey, setSearchKey] = useState(0)
	const search = useCallback(q => update({ q }), [update])
	// a date range typed by hand is held open here, so the crumb and Clear all can close it
	const [custom, setCustom] = useState(false)
	// Ask's filters replace every filter and the search; its sentence is never written to the address (2b)
	const askedFor = useCallback(filters => {
		setCustom(false)
		const changes = Object.fromEntries([...FACETS, 'q'].map(k => [k, '']))
		for (const [key, value] of Object.entries(filters)) if (ASKED_KEYS[key]) changes[ASKED_KEYS[key]] = String(value)
		update(changes)
	}, [update])
	const ask = useAskSearch('orders', askedFor)

	useEffect(() => { if (!f.from && !f.to) setCustom(false) }, [f.from, f.to])
	// every facet goes and the search and sort stay, at every width (c12)
	const clearAll = () => { setCustom(false); update(Object.fromEntries(FACETS.map(k => [k, '']))) }
	const clearSearch = () => { setSearchKey(n => n + 1); update({ q: '' }) }

	const request = requestOf(f, sort)
	// the pages loaded, held in the address
	const { pages, setPages, restored } = useListMemory()
	const orders = useApi(loaded, [{ ...request, with: 'rows' }, size, pages])
	const loadMore = () => setPages(pages + 1)
	useEffect(() => { if ((orders.data || orders.error) && !orders.loading) restored() }, [orders.data, orders.error, orders.loading, restored])
	// the rail's live counts and the summary's sum, for the same filters
	const facets = useApi(getOrders, [{ ...request, page: 1, pageSize: 0, with: 'facets' }])

	const column = useRef(null)
	const width = useWidth(column)
	const narrow = touch || (width > 0 && width <= 640)
	// rows or cards (2b, 2c): in the address, as the filters are; a narrow column always draws cards
	const view = params.get('view') === 'cards' ? 'cards' : 'rows'

	// picked orders are this filter's own: any filter, search or sort change starts with none (2h);
	// they are kept for this step in the history, so an order opened and left finds them again (c1)
	const { key: step } = useLocation()
	const selectionKey = JSON.stringify(request)
	const [selection, setSelectionNow] = useState(() => pickedAt.get(step) ?? { key: selectionKey, ids: [], all: false })
	const setSelection = next => {
		pickedAt.delete(step)
		pickedAt.set(step, next)
		while (pickedAt.size > PICKS_KEPT) pickedAt.delete(pickedAt.keys().next().value)
		setSelectionNow(next)
	}
	const current = selection.key === selectionKey ? selection : { ids: [], all: false }
	const setPicked = ids => setSelection({ key: selectionKey, ids, all: false })
	const clearPicked = () => setPicked([])

	const toast = useToast()
	const scan = useScanPicker()
	const statusName = useStatusName()
	const [exporting, setExporting] = useState(false)
	// everything the filter matches, one row per item line (16b)
	const exportCsv = () => {
		setExporting(true)
		linesOf(request)
			.then(lines => saveCsv(linesCsv(lines, statusName)))
			.catch(e => toast({ message: failureMessage(e, phrase('bulk.fileNotMade')), color: 'danger' }))
			.finally(() => setExporting(false))
	}

	const [deleting, setDeleting] = useState(null)
	// once a deleted order has left the list, focus goes to the menu of the row that took its
	// place, so it never falls back to the top of the page
	const [refocus, setRefocus] = useState(null)
	useEffect(() => {
		if (!refocus || !orders.data || orders.data.orders.some(o => o.id === refocus.id)) return
		setRefocus(null)
		const menus = [...(column.current?.querySelectorAll('button[aria-haspopup="menu"]') ?? [])]
		const target = menus[Math.min(refocus.at, menus.length - 1)] ?? column.current?.querySelector('input, button, a')
		target?.focus()
	}, [refocus, orders.data])
	const [filtersOpen, setFiltersOpen] = useState(false)
	useEffect(() => { if (railed) setFiltersOpen(false) }, [railed])

	// a crumb removed hands focus to the next crumb, else the one before, else Filters or the search
	const [crumbFocus, setCrumbFocus] = useState(null)
	const removing = changes => ev => {
		const all = [...(column.current?.querySelectorAll('.sp-crumb__remove') ?? [])]
		setCrumbFocus({ at: Math.max(0, all.indexOf(ev?.currentTarget)), count: all.length })
		update(changes)
	}
	const clearCrumbs = () => {
		setCrumbFocus({ at: 0, count: column.current?.querySelectorAll('.sp-crumb__remove').length ?? 0 })
		clearAll()
	}

	const vendorName = id => vendors?.find(v => v.id === id)?.name ?? reading.named.get(id) ?? phrase('field.vendor')
	const categoryName = id => (id === 'none' ? phrase('import.noCategory') : categories?.find(c => c.id === id)?.name ?? reading.named.get(id) ?? phrase('field.category'))
	const crumbOf = {
		date: () => {
			if (!f.from && !f.to) return null
			const preset = custom ? null : PRESETS.find(p => p.key === f.period) ?? presetOf(f.from, f.to)
			const label = preset ? phrase(preset.label)
				: f.from && f.to ? `${shortDate(f.from)} - ${shortDate(f.to)}`
					: f.from ? phrase('orders.from', { date: shortDate(f.from) }) : phrase('orders.until', { date: shortDate(f.to) })
			return <Crumb key="date" name={preset ? label : phrase('orders.dateRange')} onRemove={ev => { setCustom(false); removing({ from: '', to: '', period: '' })(ev) }}>{label}</Crumb>
		},
		// one crumb for each value a facet holds, each removing only itself
		status: () => listOf(f.status).map(s => <Crumb key={`status-${s}`} onRemove={removing({ status: toggled(f.status, s, false) })}>{statusName(s)}</Crumb>),
		vendor: () => listOf(f.vendor).map(v => <Crumb key={`vendor-${v}`} onRemove={removing({ vendor: toggled(f.vendor, v, false) })}>{vendorName(v)}</Crumb>),
		category: () => listOf(f.category).map(c => <Crumb key={`category-${c}`} onRemove={removing({ category: toggled(f.category, c, false) })}>{categoryName(c)}</Crumb>),
		receipt: () => listOf(f.receipt).map(r => <Crumb key={`receipt-${r}`} onRemove={removing({ receipt: toggled(f.receipt, r, false) })}>{RECEIPT[r] ? phrase(RECEIPT[r]) : r}</Crumb>),
		files: () => f.files === '1' && <Crumb key="files" onRemove={removing({ files: '' })}>{phrase('orders.hasAttachments')}</Crumb>,
		discounted: () => f.discounted === '1' && <Crumb key="discounted" onRemove={removing({ discounted: '' })}>{phrase('orders.discountedOnly')}</Crumb>,
		kind: () => f.kind && <Crumb key="kind" onRemove={removing({ kind: '' })}>{kindName(f.kind)}</Crumb>,
		// arriving from an import (11b): one chip, never part of a saved view
		import: () => {
			if (!f.import) return null
			const made = fromImport.data?.id === f.import ? fromImport.data.createdAt : null
			const label = made ? phrase('orders.fromImport', { date: withShortMonth(importDate(), new Date(made * 1000)) }) : phrase('orders.fromAnImport')
			return <Crumb key="import" onRemove={removing({ import: '' })}>{label}</Crumb>
		},
		amount: () => {
			if (!f.min && !f.max) return null
			const label = f.min && f.max ? `${amount(Number(f.min), 0)} - ${currency(Number(f.max), 0)}`
				: f.min ? phrase('orders.over', { amount: currency(Number(f.min), 0) }) : phrase('orders.upTo', { amount: currency(Number(f.max), 0) })
			return <Crumb key="amount" name={phrase('orders.amountRange')} onRemove={removing({ min: '', max: '' })}>{label}</Crumb>
		}
	}
	// in the order the filters were applied (c12): a new one joins the end of the address
	const groupOf = k => (k === 'from' || k === 'to' || k === 'period' ? 'date' : k === 'min' || k === 'max' ? 'amount' : k)
	// in Ask mode the words Ask kept as search text are a crumb too, since the field holds the sentence
	const searched = ask.on && f.q ? [<Crumb key="q" name={phrase('orders.searchText')} onRemove={removing({ q: '' })}>{`"${f.q}"`}</Crumb>] : []
	const crumbs = [...searched, ...[...new Set([...asked.keys()].map(groupOf))].flatMap(g => crumbOf[g]?.() ?? []).filter(Boolean)]
	useEffect(() => {
		if (!crumbFocus || crumbs.length === crumbFocus.count) return
		setCrumbFocus(null)
		const all = [...(column.current?.querySelectorAll('.sp-crumb__remove') ?? [])]
		const target = all[crumbFocus.at] ?? all[crumbFocus.at - 1]
			?? column.current?.querySelector('button[aria-haspopup="dialog"]') ?? column.current?.querySelector('input')
		target?.focus()
	}, [crumbFocus, crumbs.length])

	// Clear all hides once it has cleared, so focus moves to the first facet rather than the page
	const clearRail = ev => {
		const rail = ev.currentTarget.closest('.sp-card')
		clearAll()
		rail?.querySelector('.sp-facets :is(button, input):not(:disabled)')?.focus()
	}
	const facetData = { amountScale: amountScale.data?.amountScale }
	const filtersCard = (
		<Card>
			<CardHeader name={phrase('orders.filters')} actionSize="xsmall" actions={[{ label: phrase('list.clearAll'), onClick: clearRail, held: !crumbs.length }]} />
			<OrderFacets f={f} update={update} custom={custom} setCustom={setCustom} matched={orders.data?.matched} counts={facets.data?.facets} {...facetData} />
		</Card>
	)

	const sortLabel = phrase(SORTS.find(s => s.id === sort).label)
	const filtersButton = (
		<Button variant="outline" aria-haspopup="dialog" aria-expanded={filtersOpen ? 'true' : 'false'} onClick={() => setFiltersOpen(true)}>
			{crumbs.length ? phrase('orders.filters') + dot + crumbs.length : phrase('orders.filters')}
		</Button>
	)
	const sortOptions = SORTS.map(s => (
		<ComboboxOption key={s.id} selected={s.id === sort} onSelect={() => update({ sort: s.id })}>
			{phrase(s.label)}
		</ComboboxOption>
	))
	// on a phone the search stands alone, and Filters and Sort share one card below it (7a)
	const controls = touch ? <>
		<OrderSearch key={searchKey} q={typed} onSearch={search} ask={ask} touch />
		<ListItem variant="card">
			<div className="sp-combobox sp-combobox--grow">
				<button type="button" className="sp-combobox__trigger" aria-haspopup="dialog" aria-expanded={filtersOpen ? 'true' : 'false'}
					onClick={() => setFiltersOpen(true)}>
					<span className="sp-grow">{phrase('orders.filters')}</span>
					{crumbs.length ? <span className="sp-list-item__count">{crumbs.length}</span> : null}
				</button>
			</div>
			<Combobox aria-label={phrase('sort.label')} value={sortLabel}>{sortOptions}</Combobox>
		</ListItem>
	</> : (
		// without the rail, Filters joins the bar before sort (15e)
		<Controls>
			<OrderSearch key={searchKey} q={typed} onSearch={search} ask={ask} touch={touch} />
			{railed ? null : filtersButton}
			<Combobox variant="sort" prefix={phrase('sort.label')} value={sortLabel}>{sortOptions}</Combobox>
			{narrow
				? null
				: <Segmented name="order-view" role="group" aria-label={phrase('orders.showAs')} value={view}
					options={[{ value: 'rows', label: phrase('orders.rows') }, { value: 'cards', label: phrase('orders.cards') }]}
					onChange={v => update({ view: v === 'cards' ? 'cards' : '' })} />}
		</Controls>
	)

	const open = order => navigate(`/orders/${order.id}`)
	const data = orders.data
	const chosen = data ? data.orders.filter(o => current.ids.includes(o.id)) : []
	const count = current.all ? data?.matched ?? 0 : chosen.length
	const bulk = (
		<BulkActions chosen={chosen} all={current.all} count={count} request={request} filtered={crumbs.length > 0 || !!f.q}
			touch={touch} icons={narrow} onDone={clearPicked} />
	)
	// shift takes the run from the last one picked to this one, in the order shown (c1, 2h)
	const anchor = useRef(null)
	const pickRun = (id, shift) => {
		const shown = data.orders.map(o => o.id)
		const [a, b] = [shown.indexOf(anchor.current), shown.indexOf(id)]
		if (shift && a >= 0 && b >= 0) return setPicked([...new Set([...current.ids, ...shown.slice(Math.min(a, b), Math.max(a, b) + 1)])])
		anchor.current = id
		setPicked(current.ids.includes(id) ? current.ids.filter(x => x !== id) : [...current.ids, id])
	}
	let body
	if (orders.error)
		body = <Failed what={phrase('orders.yours')} error={orders.error} onRetry={orders.refresh} />
	else if (!data) body = narrow ? <CardsLoading size={size} /> : <RowsLoading width={width} size={size} sort={sort} />
	else if (data.total === 0)
		body = (
			<Card variant="flush">
				<Empty>
					<Mark size="large" aria-hidden="true" aria-label={phrase('repeats.receipt')}><Icon name="receipt" size={26} /></Mark>
					<EmptyTitle>{phrase('orders.noneYet')}</EmptyTitle>
					<EmptyBody>
						{reads === false
							? phrase('orders.noneYetNoRead')
							: phrase('orders.noneYetRead')}
					</EmptyBody>
					<div className="sp-row-flex sp-gap-8">
						{held
							? <Button size="small" disabled data-tip={phrase('import.held')}>{phrase('orders.scan')}</Button>
							: <Button size="small" onClick={scan.open}>{phrase('orders.scan')}</Button>}
						<Button variant="outline" size="small" to="/orders/new?source=empty">{phrase('orders.empty')}</Button>
					</div>
				</Empty>
			</Card>
		)
	else if (data.matched === 0 && !crumbs.length && f.q)
		body = (
			<Card variant="flush">
				<Empty>
					<EmptyTitle>{phrase('orders.noMatchSearch', { q: f.q })}</EmptyTitle>
					<EmptyBody>{phrase('orders.checkSpelling')}</EmptyBody>
					<Button variant="outline" size="small" onClick={clearSearch}>{phrase('orders.clearSearch')}</Button>
				</Empty>
			</Card>
		)
	else if (data.matched === 0)
		body = (
			<NoMatch f={f} request={request} total={data.total} vendors={vendors} categories={categories} statusName={statusName}
				onWiden={period => { setCustom(false); update({ period, from: '', to: '' }) }} onClear={clearCrumbs} />
		)
	else {
		// the summary line (2b): how many, what they come to, what was saved, and the file of them
		const summary = facets.data?.summary
		const caption = (
			<>
				<strong className="sp-data">{plural(data.matched, 'order')}</strong>
				{summary ? <span className="sp-subtitle">{dot.trimStart()}{currency(summary.total)}</span> : null}
				{summary ? <Saving value={summary.saved} /> : null}
				<span className="sp-grow" />
				<Button variant="outline" size="small" disabled={exporting} onClick={exportCsv}>{phrase('orders.exportCsv')}</Button>
			</>
		)
		const pickedAll = chosen.length > 0 && chosen.length === data.orders.length
		const note = pickedAll && data.matched > data.orders.length
			? (current.all
				? <span>{phrase('orders.allSelected', { orders: plural(data.matched, 'matching order') })}</span>
				: <>
					<span>{phrase('orders.pageSelected', { orders: plural(data.orders.length, 'order') })}</span>
					<Button variant="outline" size="small" onClick={() => setSelection({ key: selectionKey, ids: current.ids, all: true })}>
						{phrase('orders.selectAllMatching', { shown: amount(data.matched, 0) })}
					</Button>
				</>)
			: null
		if (narrow)
			body = (
				<OrderCards data={data} size={size} summary={summary} touch={touch} picked={current.ids} onPick={pickRun} onOpen={open} onLoadMore={loadMore} onDelete={setDeleting}
					bulk={touch || !chosen.length ? null : <BulkBar loose count={phrase('orders.selected', { shown: amount(count, 0) })} onClear={clearPicked}>{bulk}</BulkBar>} />
			)
		else if (view === 'cards')
			body = (
				<OrderGrid data={data} size={size} touch={touch} caption={caption} picked={current.ids} count={count} bulk={bulk} note={note}
					onPick={pickRun} onPickAll={setPicked} onOpen={open} onLoadMore={loadMore} onDelete={setDeleting}
					onCategory={id => update({ category: toggled(f.category, id, true) })} />
			)
		else
			body = (
				<OrderRows data={data} width={width} size={size} sort={sort} touch={touch} caption={caption} picked={current.ids} onPick={setPicked}
					count={count} bulk={bulk} note={note} onLoadMore={loadMore} onDelete={setDeleting} />
			)
	}

	// an account with no orders has nothing to filter (6a): one empty card, no rail
	const none = data?.total === 0
	const alone = !railed || none
	const main = (
		<div className={alone ? 'sp-grow sp-stack sp-gap-12 ol-alone' : 'sp-grow sp-stack sp-gap-12'} ref={column}>
			{/* on a phone a selection takes the top bar's place (c12) */}
			{touch && narrow && chosen.length ? <BulkBar head count={phrase('orders.selected', { shown: amount(count, 0) })} onClear={clearPicked}>{bulk}</BulkBar> : null}
			{none ? null : controls}
			{ask.on && ask.unread
				? <span className="sp-field__help" data-color="warning">{phrase('orders.askUnread')}</span>
				: null}
			{crumbs.length ? <Filters onClear={clearCrumbs}>{crumbs}</Filters> : null}
			{body}
			<Leaving>{filtersOpen
				? (
					<FiltersSheet
						params={asked}
						views={params}
						custom={custom}
						facetData={facetData}
						onApply={(next, nextCustom) => { setFiltersOpen(false); setCustom(nextCustom); update(next) }}
						onClose={() => setFiltersOpen(false)}
					/>
				)
				: null}</Leaving>
			<Leaving>{deleting
				? (
					<DeleteOrder order={deleting} onClose={() => setDeleting(null)}
						onDeleted={() => { setDeleting(null); setRefocus({ id: deleting.id, at: data.orders.findIndex(o => o.id === deleting.id) }) }} />
				)
				: null}</Leaving>
		</div>
	)

	// the route's rail layout takes two children, the rail first
	// every category chip on the page asks once, here, whether it is over its limit (8b)
	if (alone) return <OverLimitProvider>{main}</OverLimitProvider>
	return (
		<OverLimitProvider>
			<div className="sp-rail sp-stack sp-gap-12">
				<ViewsCard params={params} matched={orders.data?.matched}
					summary={[...crumbs.map(c => (PRESETS.some(p => phrase(p.label) === c.props.children) ? c.props.children.toLowerCase() : c.props.children)), sortLabel.toLowerCase()].join(dot)} />
				{filtersCard}
			</div>
			{main}
		</OverLimitProvider>
	)
}

/** The facets on a phone or a narrow window (c12 touch, 18b): a sheet over the list, whose
    choices wait for Apply rather than filtering at once. */
function FiltersSheet({ params, views, custom, facetData, onApply, onClose }) {
	const phrase = usePhrase()
	const [draft, setDraft] = useState(() => new URLSearchParams(params))
	const [draftCustom, setDraftCustom] = useState(custom)
	const f = readFilters(draft)
	const update = useCallback(changes => setDraft(d => withChanges(d, changes)), [])
	// the date group's order count is for the choices in the sheet, not the list behind it
	const count = useApi(getOrders, [{ ...requestOf(f, ''), page: 1, pageSize: 0, with: 'facets' }])
	const box = useRef(null)
	// modal while open; closing gives focus back to the Filters button that opened it
	useFocusTrap(box)

	// removed facets first, then the rest in the order they were chosen in the sheet
	const apply = () => {
		const changes = Object.fromEntries(FACETS.filter(k => !draft.has(k)).map(k => [k, '']))
		for (const [k, v] of draft) if (FACETS.includes(k)) changes[k] = v
		onApply(changes, draftCustom)
	}
	const clear = () => { setDraftCustom(false); update(Object.fromEntries(FACETS.map(k => [k, '']))) }
	const matched = count.loading ? undefined : count.data?.matched

	return createPortal(
		<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
			<Sheet role="dialog" aria-modal="true" aria-label={phrase('orders.filters')} ref={box} tabIndex={-1}
				onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
				<div className="sp-row-flex">
					<span className="sp-heading">{phrase('orders.filters')}</span>
					<span className="sp-grow" />
					<Button variant="text" size="small" onClick={clear}>{phrase('orders.reset')}</Button>
				</div>
				<div className="ol-sheet-body">
					<SheetViews params={views} onOpen={onClose} />
					<OrderFacets bare f={f} update={update} custom={draftCustom} setCustom={setDraftCustom} matched={matched}
							counts={count.loading ? undefined : count.data?.facets} {...facetData} />
				</div>
				<Button size="small" fullWidth disabled={matched === 0} onClick={apply}>
					{matched === undefined ? phrase('action.apply') : matched === 0 ? phrase('orders.noMatch') : phrase('orders.show', { orders: plural(matched, 'order') })}
				</Button>
			</Sheet>
		</Scrim>,
		document.body
	)
}

/** The list's search (c20). The field keeps what is typed and writes it to the address once it
    settles, so a key pressed while the list redraws is never overwritten. With `ask` it ends in Ask
    (2b): Alt+A switches the mode, and in Ask mode the field holds a sentence sent with Enter. */
function OrderSearch({ q, onSearch, ask, touch }) {
	const phrase = usePhrase()
	const [text, setText] = useState(q)
	const wrote = useRef(q)
	useEffect(() => {
		if (q === wrote.current) return
		wrote.current = q
		setText(q)
	}, [q])
	const settled = useSettled(text)
	const last = useRef(settled)
	useEffect(() => {
		if (settled === last.current) return
		last.current = settled
		if (settled === wrote.current) return
		wrote.current = settled
		onSearch(settled)
	}, [settled, onSearch, ask.on])
	const field = useRef(null)
	const pageSearch = usePageSearch()
	const bind = useCallback(el => { field.current = el; pageSearch(el) }, [pageSearch])
	// the field keeps focus across the switch, which draws it again
	const switching = useRef(false)
	useEffect(() => { if (switching.current) { switching.current = false; field.current?.focus() } })
	const toggle = () => { switching.current = true; ask.toggle() }
	const keys = ev => {
		if (ev.altKey && ev.code === 'KeyA' && ask.available && !ask.working) { ev.preventDefault(); toggle() }
		else if (ask.on && ev.key === 'Enter') { ev.preventDefault(); ask.send() }
		else if (ask.working && ev.key === 'Escape') { ev.preventDefault(); ask.stop() }
	}
	const ends = ask.available
		? <AskTrail on={ask.on} busy={ask.working} spent={ask.spent} onToggle={toggle} onStop={ask.stop} />
		: undefined
	if (ask.on) return (
		<SearchInput
			value={ask.text}
			onChange={ask.setText}
			icon="message-circle"
			clear={false}
			ends={ends}
			readOnly={ask.working}
			inputRef={bind}
			onKeyDown={keys}
			placeholder={phrase('orders.askExample')}
			aria-label={phrase('orders.askLabel')}
		/>
	)
	return (
		<SearchInput
			value={text}
			onChange={setText}
			ends={ends}
			inputRef={bind}
			onKeyDown={keys}
			placeholder={phrase(touch ? 'orders.search' : 'orders.searchLong')}
			aria-label={phrase('orders.search')}
		/>
	)
}

/** What the typed search `q` reads (2b), with the shops and categories it names once the server has
    said which runs of words those are. Until it has, those words are searched as text. */
function useSearchReading(q) {
	const settled = useSettled(q)
	const spans = useMemo(() => nameSpans(settled, { presets: PRESETS }), [settled])
	const found = useApi(getSearchNames, [spans], { enabled: spans.length > 0 })
	return useMemo(() => {
		const names = new Map()
		// a run that names a shop and a category is the category
		for (const n of found.data?.names ?? []) if (!names.has(n.span) || n.kind === 'category') names.set(n.span, n)
		const reading = readSearch(q, { presets: PRESETS, names: spans.length ? names : null })
		// the names the server gave, so a part's crumb is named before the facet's own read answers
		return { ...reading, named: new Map([...names.values()].map(n => [n.id, n.name])) }
	}, [q, spans, found.data])
}

/** The text the search box holds, once it has stopped changing, so a word typed is one request. */
function useSettled(value, ms = 250) {
	const [settled, setSettled] = useState(value)
	useEffect(() => {
		if (value === settled) return
		const timer = setTimeout(() => setSettled(value), value ? ms : 0)
		return () => clearTimeout(timer)
	}, [value, settled, ms])
	return settled
}

/** The orders as rows (2b): the summary line, which the bulk bar takes over once a row is
    picked (2h), the table, and Load more. */
function OrderRows({ data, width, size, sort, touch, caption, picked, onPick, count, bulk, note, onLoadMore, onDelete }) {
	const phrase = usePhrase()
	const { typeOf } = useStatusTypes()
	const show = columnsFor(width)
	return (
		<List data={data.orders} recordKey={o => o.id} noun="orders" rowTo={o => `/orders/${o.id}`} locale={NUMBER_LOCALE}
			pageSize={size} total={data.matched} onLoadMore={onLoadMore} picked={picked} onPick={onPick} bulkNote={note}
			rowVoid={o => typeOf(o.status) === 'cancelled'} onContextMenu={menuHere}>
			<Caption>{caption}</Caption>
			<Selected>
				<span className="sp-bulkbar__count">{phrase('orders.selected', { shown: amount(count, 0) })}</span>
				<span className="sp-grow" />
				{bulk}
			</Selected>
			<ListHead>
				<ListCell cell="checkbox" />
				<ListCell width="title">{headOf(sort, 'title', phrase('orderMenu.order'))}</ListCell>
				<ListCell width="date">{headOf(sort, 'date', phrase('field.date'))}</ListCell>
				{show.categories ? <ListCell width="flex">{phrase('field.categories')}</ListCell> : null}
				<ListCell width="status">{phrase('field.status')}</ListCell>
				<ListCell width="amount">{headOf(sort, 'amount', phrase('order.total'))}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>{o => (
				<>
					<ListCell cell="checkbox" />
					<ListCell cell="flex">
						<OrderPhoto order={o} />
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{vendorName(o)}</span>
							<span className="sp-subtitle sp-truncate">{orderLine(o)}</span>
						</span>
						<OrderFiles count={o.fileCount} />
						<OrderNote note={o.note} />
					</ListCell>
					<ListCell><span className="sp-data">{shortDate(o.date)}</span></ListCell>
					{show.categories ? <ListCell><CategoryChips categories={o.categories} date={o.date} /></ListCell> : null}
					<ListCell><StatusPill status={o.status} /></ListCell>
					<ListCell cell="amount"><OrderAmount order={o} /></ListCell>
					<ListCell cell="menu"><RowMenu order={o} touch={touch} onDelete={onDelete} /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

/* The statuses whose own name says what happened to an order ("none returned"); any other, or one
   the account renamed, is named as a status. */
const PAST = { Ordered: 'noMatch.ordered', Delivered: 'noMatch.delivered', Returned: 'noMatch.returned', Cancelled: 'noMatch.cancelled' }

/* The periods a narrow date filter widens to, smallest first, each holding the range in force. A range
   inside this year widens to the whole year (6a), never to a quarter or a month. */
const widerThan = (from, to) => [
	...PRESETS.filter(p => p.key === 'year').map(p => { const [a, b] = p.range(new Date()); return { key: p.key, label: p.label, from: a, to: b } }),
	{ key: '', label: 'noMatch.allDates', from: '', to: '' }
].filter(c => !c.key || (from && to && c.from <= from && c.to >= to && !(c.from === from && c.to === to)))

const widened = readAs(getOrders, async (request, periods, signal) => {
	const answers = await Promise.all(periods.map(p => getOrders({ ...request, from: p.from, to: p.to, pageSize: 0 }, signal)))
	return answers.map(a => a.matched)
})

/** A filtered list that holds nothing says why, and offers the smallest wider period that finds
    something (6a). Every number in the sentence waits for its answer. */
function NoMatch({ f, request, total, vendors, categories, statusName, onWiden, onClear }) {
	const phrase = usePhrase()
	const vendorIds = listOf(f.vendor)
	const categoryIds = listOf(f.category)
	const statuses = listOf(f.status)
	const vendor = vendorIds.length === 1 ? vendors?.find(v => v.id === vendorIds[0]) : null
	const category = !vendorIds.length && categoryIds.length === 1 ? categories?.find(c => c.id === categoryIds[0]) : null
	const subject = vendor ?? category
	// what narrows the list besides who it is from and when
	const others = [
		...statuses, ...(vendor ? [] : vendorIds), ...(category ? [] : categoryIds), ...listOf(f.receipt),
		f.files, f.discounted, f.kind, f.min || f.max, f.q
	].filter(Boolean)
	const dated = !!(f.from || f.to)
	const periods = dated ? widerThan(f.from, f.to) : []
	const counts = useApi(widened, [request, periods.map(p => ({ from: p.from, to: p.to }))], { enabled: dated })
	const wider = counts.data ? periods.find((p, i) => counts.data[i] > 0) : null
	const found = wider ? counts.data[periods.indexOf(wider)] : 0
	const waiting = (dated && !counts.data && !counts.error) || (vendorIds.length === 1 && !vendors) || (categoryIds.length === 1 && !categories)

	const preset = PRESETS.find(p => p.key === f.period) ?? presetOf(f.from, f.to)
	const when = !dated ? '' : preset ? phrase(preset.label).toLowerCase()
		: f.from && f.to ? phrase('noMatch.between', { from: shortDate(f.from), to: shortDate(f.to) })
			: f.from ? phrase('noMatch.since', { date: shortDate(f.from) }) : phrase('noMatch.upTo', { date: shortDate(f.to) })
	const what = others.length === 1 && statuses.length === 1
		? (PAST[statuses[0]] && statusName(statuses[0]) === statuses[0] ? phrase(PAST[statuses[0]]) : phrase('noMatch.withStatus', { name: statusName(statuses[0]) }))
		: others.length ? phrase('noMatch.otherFilters') : null
	// the period is named only when it is what leaves the list empty
	const period = wider ? ' ' + (what || !preset ? when : phrase('noMatch.fromPeriod', { when })) : ''
	let said
	if (subject && !subject.orders) said = phrase('noMatch.noneYet', { name: subject.name })
	else if (subject && (what || wider)) said = phrase('noMatch.butNone', { name: subject.name, orders: plural(subject.orders, 'order'), what: what ? ` ${what}` : '', period })
	else if (wider && !subject) said = others.length
		? phrase('noMatch.noneFiltered', { orders: plural(total, 'order'), when })
		: phrase(preset ? 'noMatch.noneFrom' : 'noMatch.noneDated', { orders: plural(total, 'order'), when })
	else said = phrase(f.q ? 'noMatch.removeSearch' : 'noMatch.remove')
	if (wider) said += ' ' + phrase('noMatch.widening', { shown: amount(found, 0) })

	return (
		<Card variant="flush">
			<Empty>
				<EmptyTitle>{phrase('noMatch.title')}</EmptyTitle>
				{waiting ? <Skeleton shape="line" /> : <EmptyBody>{said}</EmptyBody>}
				<div className="sp-row-flex sp-gap-8">
					{wider ? <Button size="small" onClick={() => onWiden(wider.key)}>{phrase('noMatch.searchIn', { period: phrase(wider.label).toLowerCase() })}</Button> : null}
					<Button variant="outline" size="small" onClick={onClear}>{phrase('noMatch.clear')}</Button>
				</div>
			</Empty>
		</Card>
	)
}

/** At 640 of list column and under, rows become the 2i card, two lines: in a narrow column with its box;
    on a phone without it, since a phone does not select (2c, Mobile screens). */
function OrderCards({ data, size, summary, touch, picked, bulk, onPick, onOpen, onLoadMore, onDelete }) {
	const phrase = usePhrase()
	const { typeOf } = useStatusTypes()
	return (
		<>
			{bulk ?? <span className="sp-meta">{plural(data.matched, 'order')}{summary ? `${dot}${currency(summary.total)}` : ''}</span>}
			{data.orders.map(o => {
				const on = picked.includes(o.id)
				const amount = o.total == null ? null : <span className={typeOf(o.status) === 'cancelled' ? 'sp-amount sp-void sp-nowrap' : 'sp-amount sp-nowrap'}>{currency(o.total)}</span>
				const when = `${shortDate(o.date)}${dot}${plural(o.itemCount, 'item')}`
				const saving = typeOf(o.status) === 'cancelled' ? <span className="sp-amount-secondary">{phrase('orderMenu.notCounted')}</span> : <Saving value={o.saved} />
				return (
					touch
						? (
							<PressedRow key={o.id} order={o} mark={<OrderPhoto order={o} />} onOpen={onOpen} onDelete={onDelete}>
								<Stacked>
									<Line>
										<span className="sp-title sp-truncate sp-grow">{vendorName(o)}</span>
										{amount}
									</Line>
									<Line>
										<span className="sp-subtitle sp-nowrap sp-grow">{when}</span>
										{saving}
									</Line>
								</Stacked>
							</PressedRow>
						)
						: (
							<div key={o.id} className="ol-pickable">
								<label className="ol-pick">
									<Check checked={on} aria-label={phrase('orderMenu.select', { name: orderName(o) })} onChange={ev => onPick(o.id, ev.nativeEvent?.shiftKey)} />
								</label>
								<ListItem variant="card" selected={on} mark={<><span className="ol-pick-room" /><OrderPhoto order={o} /></>} onClick={() => onOpen(o)}>
									<Stacked>
										<Line>
											<span className="sp-title sp-truncate sp-grow">{vendorName(o)}</span>
											{amount}
										</Line>
										<Line>
											<span className="sp-subtitle sp-nowrap sp-grow">{when}</span>
											{saving}
										</Line>
									</Stacked>
								</ListItem>
							</div>
						)
				)
			})}
			<ListMore loose shown={data.orders.length} total={data.matched} pageSize={size} onMore={onLoadMore} locale={NUMBER_LOCALE} />
		</>
	)
}

/** The Cards view (2c): the same orders, picked the same way, drawn as cards with their photos.
    The summary line or the bulk bar stands above the grid, each led by the box that picks the page, as rows have. */
function OrderGrid({ data, size, touch, caption, picked, count, bulk, note, onPick, onPickAll, onOpen, onLoadMore, onDelete, onCategory }) {
	const phrase = usePhrase()
	const [menuFor, setMenuFor] = useState(null)
	const page = data.orders.map(o => o.id)
	const selectAll = {
		selectedCount: picked.filter(id => page.includes(id)).length, total: page.length, noun: 'orders',
		onToggleAll: on => onPickAll(on ? [...new Set([...picked, ...page])] : picked.filter(id => !page.includes(id)))
	}
	const head = picked.length
		? (
			<>
				<BulkBar loose count={phrase('orders.selected', { shown: amount(count, 0) })} selectAll={selectAll}>{bulk}</BulkBar>
				{note ? <div className="sp-bulkbar sp-bulkbar--loose sp-bulkbar--note">{note}</div> : null}
			</>
		)
		: <ListToolbar loose selectAll={selectAll}>{caption}</ListToolbar>
	const footer = <ListMore loose shown={data.orders.length} total={data.matched} pageSize={size} onMore={onLoadMore} locale={NUMBER_LOCALE} />
	return (
		<List body="cards" head={head} footer={footer} onContextMenu={menuHere}>
			{data.orders.map(o => (
				<OrderCard key={o.id} order={o} touch={touch} picked={picked.includes(o.id)} onPick={shift => onPick(o.id, shift)}
					menuOpen={menuFor === o.id} onMenu={setMenuFor} onOpen={onOpen} onDelete={onDelete} onCategory={onCategory} />
			))}
		</List>
	)
}

const LOADING = [['62pc', '58', '88', '44pc'], ['48pc', '74', '74', '36pc'], ['55pc', '46', '92', '30pc']]
const loadingRows = size => Array.from({ length: size }, (_, i) => ({ id: i, r: LOADING[i % LOADING.length] }))

/* Skeletons hold the real rows' places, a page of them, so nothing moves when the orders land (6b). */
function RowsLoading({ width, size, sort }) {
	const phrase = usePhrase()
	const show = columnsFor(width)
	const rows = loadingRows(size)
	return (
		<List data={rows} recordKey={x => x.id} noun="orders">
			<Caption><Skeleton shape="line" data-w="82" data-h="13" /></Caption>
			<ListHead>
				<ListCell width="title">{headOf(sort, 'title', phrase('orderMenu.order'))}</ListCell>
				<ListCell width="date">{headOf(sort, 'date', phrase('field.date'))}</ListCell>
				{show.categories ? <ListCell width="flex">{phrase('field.categories')}</ListCell> : null}
				<ListCell width="status">{phrase('field.status')}</ListCell>
				<ListCell width="amount">{headOf(sort, 'amount', phrase('order.total'))}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>{({ r }) => (
				<>
					<ListCell cell="flex">
						<Skeleton shape="mark" />
						<span className="sp-stacked sp-grow"><Skeleton shape="line" data-w={r[0]} /><Skeleton shape="line" data-w={r[3]} data-h="10" /></span>
					</ListCell>
					<ListCell><Skeleton shape="line" data-w={r[1]} data-h="13" /></ListCell>
					{show.categories ? <ListCell><Skeleton shape="line" data-w="52" data-h="22" /></ListCell> : null}
					<ListCell><Skeleton shape="pill" /></ListCell>
					<ListCell cell="amount"><Skeleton shape="end" data-w={r[2]} data-h="20" /><Skeleton shape="end" data-w="74" data-h="18" /></ListCell>
					<ListCell cell="menu"><Skeleton shape="icon" /></ListCell>
				</>
			)}</ListRow>
		</List>
	)
}

/* An empty text of the line's own type sizes a skeleton line to the real one exactly. */
const strut = role => <span className={role} aria-hidden="true">{'\u200b'}</span>

function CardsLoading({ size }) {
	return [<span key="count" className="sp-row-flex"><Skeleton shape="line" data-w="82" data-h="13" />{strut('sp-meta')}</span>, ...loadingRows(size).map(({ id, r: [title, , figure] }) => (
		<ListItem key={id} variant="card" mark={<Skeleton shape="mark" />}>
			<Stacked>
				<Line><Skeleton shape="line" data-w={title} data-h="22" />{strut('sp-title')}<span className="sp-grow" /><Skeleton shape="line" data-w={figure} data-h="22" /></Line>
				<Line><Skeleton shape="line" data-w="36pc" data-h="18" /><span className="sp-grow" /><Skeleton shape="line" data-w="88" data-h="18" /></Line>
			</Stacked>
		</ListItem>
	))]
}

/* A value's live count at the end of its row (2b): left out while it is not known (6b). */
const countOf = n => (n == null ? null : <><span className="sp-grow" /><span className="sp-field-group__count">{amount(n, 0)}</span></>)

/** The vendors or categories with these ids, archived ones too: what the filters name. */
function usePicked(kind, ids) {
	const real = ids.filter(id => id !== 'none')
	const read = kind === 'vendor' ? getVendorPage : getCategoryPage
	const page = useApi(read, [{ ids: real.join(','), archived: 'all', pageSize: Math.max(1, real.length) }], { enabled: real.length > 0 })
	return real.length ? page.data?.[kind === 'vendor' ? 'vendors' : 'categories'] : []
}

/** A facet group's values, most used first, read a page at a time: `rows` (the page, then any picked
    value it does not hold), how many match the typed text, and how many the group holds in all. */
function useFacetValues(kind, find, limit, picked) {
	const vendor = kind === 'vendor'
	const read = vendor ? getVendorPage : getCategoryPage
	const request = { sort: vendor ? 'use' : 'orders-desc', pageSize: limit }
	const needle = find.trim()
	const all = useApi(read, [request])
	const found = useApi(read, [{ ...request, query: needle }], { enabled: Boolean(needle) })
	const list = needle ? found : all
	const held = usePicked(kind, picked) ?? []
	const rows = list.data?.[vendor ? 'vendors' : 'categories'] ?? []
	const extra = needle ? [] : held.filter(r => !rows.some(x => x.id === r.id))
	return { rows: [...rows, ...extra], paged: rows.length, matched: list.data?.matched ?? 0, total: all.data?.matched ?? 0 }
}

/** The rail's groups (c12, 2b): several values each, with live counts; a value with nothing
    behind it stays, greyed. `bare` gives the groups alone, for the sheet (7b). */
function OrderFacets({ bare = false, f, update, custom, setCustom, amountScale, matched, counts }) {
	const phrase = usePhrase()
	const statuses = useStatuses()
	const over = useOverLimitIds()
	const size = useApi(getSettings).data?.pageSize ?? 10
	const live = (group, key) => (counts ? counts[group]?.[key] ?? 0 : undefined)
	// a group's total is the count the sidebar shows (2b); its first few values rest, more come a page at a time
	// at rest a group shows its first few, searched a page; each "more" adds a page
	const limitOf = (pages, typing, rest) => (typing ? size : rest) + size * pages
	const moreOf = (values, pages, typing, rest) => Math.min(limitOf(pages + 1, typing, rest), values.matched) - values.paged
	const [vendorPages, setVendorPages] = useState(0)
	const [find, setFind] = useState('')
	const vendorsPicked = listOf(f.vendor)
	const vendorValues = useFacetValues('vendor', find, limitOf(vendorPages, find.trim(), 4), vendorsPicked)
	const listed = vendorValues.rows
	// the categories the same way: their first few, then the rest on asking, found by name past twenty
	const [categoryPages, setCategoryPages] = useState(0)
	const [findCategory, setFindCategory] = useState('')
	const categoriesPicked = listOf(f.category)
	const categoryValues = useFacetValues('category', findCategory, limitOf(categoryPages, findCategory.trim(), 6), categoriesPicked)
	const categoriesListed = categoryValues.rows
	const vendorsMore = moreOf(vendorValues, vendorPages, find.trim(), 4)
	const categoriesMore = moreOf(categoryValues, categoryPages, findCategory.trim(), 6)
	const empty = (n, total, on) => !on && (n === undefined ? !total : n === 0)
	const switches = useId()

	const Groups = bare ? Fragment : Facets
	return (
		<Groups>
			<DateFacet from={f.from} to={f.to} period={f.period} matched={matched} update={update} custom={custom} setCustom={setCustom} />

			<FieldGroup facet legend={phrase('field.status')}>
				{statuses.map(s => {
					const on = listOf(f.status).includes(s.key)
					const n = live('status', s.key)
					return (
						<Choice key={s.key} control={<Check checked={on} disabled={empty(n, 1, on)} onChange={ev => update({ status: toggled(f.status, s.key, ev.target.checked) })} />}>
							{s.name}{countOf(n)}
						</Choice>
					)
				})}
			</FieldGroup>

			<FieldGroup facet legend={phrase('repeats.receipt')}>
				{['attached', 'missing'].map(r => {
					const on = listOf(f.receipt).includes(r)
					const n = counts?.receipt?.[r]
					return (
						<Choice key={r} control={<Check checked={on} disabled={empty(n, 1, on)} onChange={ev => update({ receipt: toggled(f.receipt, r, ev.target.checked) })} />}>
							{phrase(r === 'attached' ? 'orders.attached' : 'orders.missing')}{countOf(n)}
						</Choice>
					)
				})}
			</FieldGroup>

			{vendorValues.total
				? (
					<FieldGroup facet legend={phrase('field.vendor')} count={phrase('orders.total', { count: vendorValues.total })}>
						{vendorValues.total > 20
							? <SearchInput value={find} onChange={setFind} placeholder={phrase('orders.findVendor')} aria-label={phrase('orders.findVendorLabel')} />
							: null}
						{vendorValues.total > 20 ? <Announce>{find ? (vendorValues.matched ? plural(vendorValues.matched, 'vendor') : phrase('orders.noVendorNamed')) : ''}</Announce> : null}
						{find && !vendorValues.matched ? <span className="sp-subtitle">{phrase('orders.noVendorNamed')}</span> : null}
						<FieldGroupValues>
							{listed.map(v => {
								const on = vendorsPicked.includes(v.id)
								const n = live('vendor', v.id)
								return (
									<Choice key={v.id} control={<Check checked={on} disabled={empty(n, v.orders, on)}
										onChange={ev => update({ vendor: toggled(f.vendor, v.id, ev.target.checked) })} />}>
										<span className="sp-truncate">{v.name}</span>{countOf(n)}
									</Choice>
								)
							})}
						</FieldGroupValues>
						{vendorsMore > 0
							? <FieldGroupMore onClick={() => setVendorPages(vendorPages + 1)}>{phrase('orders.showMore', { count: vendorsMore })}</FieldGroupMore>
							: null}
					</FieldGroup>
				)
				: null}

			{categoryValues.total
				? (
					<FieldGroup facet legend={phrase('field.categories')}>
						{categoryValues.total > 20
							? <SearchInput value={findCategory} onChange={setFindCategory} placeholder={phrase('orderMenu.findCategory')} aria-label={phrase('orderMenu.findCategoryLabel')} />
							: null}
						{categoryValues.total > 20
							? <Announce>{findCategory ? (categoryValues.matched ? plural(categoryValues.matched, 'category') : phrase('orders.noCategoryNamed')) : ''}</Announce>
							: null}
						{findCategory && !categoryValues.matched ? <span className="sp-subtitle">{phrase('orders.noCategoryNamed')}</span> : null}
						{categoriesListed.length
							? (
								<FieldGroupValues>
									<Filters>
										{categoriesListed.map(c => {
											const on = categoriesPicked.includes(c.id)
											const n = live('category', c.id)
											return (
												<Chip key={c.id} variant="facet" value={c.id} selected={on} disabled={empty(n, c.orders, on)}
													count={n == null ? null : amount(n, 0)} trail={over.has(c.id) ? <OverLimitDot /> : undefined}
													onSelect={next => update({ category: toggled(f.category, c.id, next) })}>{c.name}</Chip>
											)
										})}
									</Filters>
								</FieldGroupValues>
							)
							: null}
						{categoriesMore > 0
							? <FieldGroupMore onClick={() => setCategoryPages(categoryPages + 1)}>{phrase('orders.showMore', { count: categoriesMore })}</FieldGroupMore>
							: null}
					</FieldGroup>
				)
				: null}

			<FieldGroup facet legend={phrase('field.kind')}>
				<Combobox value={f.kind ? kindName(f.kind) : phrase('orders.allKinds')} aria-label={phrase('field.kind')}>
					{['', ...spendKinds].map(k => (
						<ComboboxOption key={k || 'all'} selected={f.kind === k} onSelect={() => update({ kind: k })}>
							{k ? kindName(k) : phrase('orders.allKinds')}
						</ComboboxOption>
					))}
				</Combobox>
			</FieldGroup>

			{amountScale?.stops || amountScale?.highest ? <AmountFacet scale={amountScale} min={f.min} max={f.max} update={update} /> : null}

			<div className="sp-field-group">
				<label className="sp-row-flex sp-gap-12">
					<Switch id={`${switches}-files`} checked={f.files === '1'} onChange={ev => update({ files: ev.target.checked ? '1' : '' })} />
					<span className="sp-data">{phrase('orders.hasAttachments')}</span>
				</label>
				<label className="sp-row-flex sp-gap-12">
					<Switch id={`${switches}-discounted`} checked={f.discounted === '1'} onChange={ev => update({ discounted: ev.target.checked ? '1' : '' })} />
					<span className="sp-data">{phrase('orders.discountedOnly')}</span>
				</label>
			</div>
		</Groups>
	)
}

/** One control, four settings (2d): a preset, or a range typed in under them. */
function DateFacet({ from, to, period, matched, update, custom, setCustom }) {
	const phrase = usePhrase()
	const name = useId()

	const chosen = custom ? 'custom' : period || presetOf(from, to)?.key || (from || to ? 'custom' : null)
	const [draft, setDraft] = useState({ from, to })
	useEffect(() => setDraft({ from, to }), [from, to])
	const wrong = !!(draft.from && draft.to && draft.to < draft.from)
	// on a phone Custom opens the range sheet (c14); its Apply sets From and To here, and the
	// filter sheet's own Apply runs the filter
	const touch = useShellShape() === 'touch'
	const [range, setRange] = useState(null)
	const openRange = () => setRange({ from: from || today(), to: to || today() })

	// a range that ends before it starts waits in the fields while the reader is in them; a date
	// the page cannot read is never kept, and leaving the two fields shows the range in force
	const edit = next => {
		if (![next.from, next.to].every(d => !d || isDay(d))) return
		setDraft(next)
		if (!(next.from && next.to && next.to < next.from)) update({ from: next.from, to: next.to, period: '' })
	}
	const leave = ev => { if (!ev.currentTarget.contains(ev.relatedTarget)) setDraft({ from, to }) }
	// a count not known yet is left out rather than shown as zero (6b)
	const summary = [from ? plural(daysBetween(from, to || today()), 'day') : null, matched == null ? null : plural(matched, 'order')]
		.filter(Boolean).join(dot)

	return (
		<FieldGroup facet legend={phrase('field.date')}>
			<Filters>
				{PRESETS.map(p => (
					<Chip key={p.key} variant="facet" inputType="radio" name={name} value={p.key} selected={chosen === p.key}
						onSelect={() => { setCustom(false); update({ period: p.key, from: '', to: '' }) }}>
						{phrase(p.label)}
					</Chip>
				))}
				<Chip variant="facet" inputType="radio" name={name} value="custom" data-preset="custom" selected={chosen === 'custom'}
					onSelect={() => { setCustom(true); if (touch) openRange() }}>
					{phrase('orders.custom')}
				</Chip>
			</Filters>
			{touch ? (
				<FieldGroupPanel>
					{from || to
						? (
							<>
								<span className="sp-data">{from ? shortDate(from) : '…'} - {shortDate(to || today())}</span>
								<div className="sp-row-flex sp-gap-8">
									<span className="sp-subtitle">{summary}</span>
									<span className="sp-grow" />
									<Button variant="outline" size="small" onClick={openRange}>{phrase('import.change')}</Button>
									<Button variant="outline" size="small" onClick={() => update({ from: '', to: '', period: '' })}>{phrase('orders.clear')}</Button>
								</div>
							</>
						)
						: <Button variant="outline" size="small" onClick={openRange}>{phrase('orders.chooseDates')}</Button>}
				</FieldGroupPanel>
			) : (
				<FieldGroupPanel onBlur={leave}>
					<Field label={phrase('orders.fromLabel')}><DateField value={draft.from} locale={activeLocaleCode()} onChange={v => edit({ ...draft, from: v })} /></Field>
					<Field label={phrase('orders.toLabel')} message={wrong ? phrase('orders.toBeforeFrom') : null} messageType={wrong ? 'danger' : 'hint'}>
						<DateField value={draft.to} placeholder={phrase('time.today')} locale={activeLocaleCode()} onChange={v => edit({ ...draft, to: v })} />
					</Field>
					{wrong
						? null
						: from || to
							? (
								<div className="sp-row-flex sp-gap-8">
									<span className="sp-subtitle">{summary}</span>
									<span className="sp-grow" />
									<Button variant="outline" size="small" onClick={() => update({ from: '', to: '', period: '' })}>{phrase('orders.clear')}</Button>
								</div>
							)
							: <span className="sp-field__help">{phrase('orders.toEmpty')}</span>}
				</FieldGroupPanel>
			)}
			{range ? (
				<RangeSheet onClose={() => setRange(null)}>
					<RangePicker single from={range.from} to={range.to} max={today()} locale={activeLocaleCode()}
						onChange={(a, b) => setRange({ from: a, to: b })}
						onApply={() => { update({ from: range.from, to: range.to, period: '' }); setRange(null) }}
						onCancel={() => setRange(null)} />
				</RangeSheet>
			) : null}
		</FieldGroup>
	)
}

/* A drag is many values; the list asks for the one it settles on. A To at the open end (2b)
   is no bound at all; one typed past it is kept. */
function AmountFacet({ scale, min, max, update }) {
	const phrase = usePhrase()
	const stops = scale.stops
	const top = stops ? stops[stops.length - 1] : Math.max(1000, Math.ceil(scale.highest / 1000) * 1000)
	const fromUrl = useMemo(() => [
		min ? Math.min(Number(min), top) : 0,
		max ? (stops ? Number(max) : Math.min(Number(max), top)) : top
	], [min, max, top, stops])
	const [range, setRange] = useState(fromUrl)
	useEffect(() => setRange(fromUrl), [fromUrl])
	useEffect(() => {
		if (range[0] === fromUrl[0] && range[1] === fromUrl[1]) return
		const timer = setTimeout(() => update({ min: range[0] > 0 ? range[0] : '', max: range[1] !== top ? range[1] : '' }), 300)
		return () => clearTimeout(timer)
	}, [range, fromUrl, top, update])
	const end = stops ? currency(top, 0).replace(amount(top, 0), `${amount(top, 0)}+`) : currency(top, 0)
	return (
		<FieldGroup facet legend={phrase('field.amount')} meta={`0 - ${end}`}>
			<RangeSlider value={range} min={0} max={top} step={100} stops={stops ?? undefined} open={!!stops} label={phrase('field.amount')}
				format={n => amount(n, 0)} locale={NUMBER_LOCALE} onChange={setRange} />
		</FieldGroup>
	)
}
