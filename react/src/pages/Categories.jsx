import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, Crumb, Filters, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Gauge } from '../components/Data.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Kbd, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteCategory, getCategoryPages, getSettings, invalidateCategoryData, invalidateVendorData, mergeCategory
} from '../api/client.js'
import { NUMBER_LOCALE, amountRound, currency, dot, monthNames, plural } from '../api/format.js'
import { MAC, useShellShape, useWidth } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import {
	Bar, CategoryMark, DeleteCategory, Held, MergeDialog, MergePicker, RowMenu, SortControl, isGone, monthPace, sayFailure, useRefocus
} from './vendorsCategories.jsx'

// the server orders the list (api/src/lib/categoryList.js)
const SORTS = [
	{ id: 'name-asc', label: 'Name A - Z' },
	{ id: 'month-desc', label: 'This month ↓' },
	{ id: 'month-asc', label: 'This month ↑' },
	{ id: 'limit-desc', label: 'Limit ↓' },
	{ id: 'orders-desc', label: 'Orders ↓' }
]
// at this width of the list or under, the monthly limit joins the name's second line (5k)
const FOLD = 880
// at this width of the list or under, the table becomes cards, as the order list does (2i)
const CARDS = 640
// the search drops its shortcut badge at this width of the list or under (15e)
const KBD = 720

// Settings' shared sort in this list's terms: spend here is the month's, and a category saves nothing
const FROM_SETTING = { 'spend-desc': 'month-desc', 'spend-asc': 'month-asc' }

/* The month against the limit in the thin bar. Past the limit, a table row splits the track into
   the part up to it and the overage (5i); a phone card fills it, with the overage in words. */
function MonthGauge({ category, pace, split = false }) {
	const { monthSpend: spend, budget } = category
	if (!(budget > 0)) return <Gauge thin untargeted value={0} aria-label="No limit set" />
	if (spend > budget && !split) return <Gauge thin passed value={100} marker={pace?.at} aria-label="Share of the limit used" />
	if (spend > budget) {
		const upTo = (budget / spend) * 100
		return <Gauge thin value={upTo} over={100 - upTo} marker={pace?.at} aria-label="Share of the limit used" />
	}
	return <Gauge thin value={(spend / budget) * 100} marker={pace?.at} aria-label="Share of the limit used" />
}

function MonthLine({ category, pace }) {
	const { monthSpend: spend, budget } = category
	if (!(budget > 0)) return <span className="sp-meta">{currency(spend, 0)} spent</span>
	if (spend > budget)
		return <span className="sp-meta sp-ink-warning"><b className="sp-strong">{currency(spend, 0)}</b>{dot}{amountRound(spend - budget)} over</span>
	// ahead of pace only past ten points over the marker (5i)
	if (pace && (spend / budget) * 100 > pace.at + 10)
		return <span className="sp-meta sp-ink-warning"><b className="sp-strong">{currency(spend, 0)}</b>{dot}ahead of pace</span>
	return <span className="sp-meta">{currency(spend, 0)}{dot}{amountRound(budget - spend)} left</span>
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const OVER_LIMIT = 'over-limit'

/* A month named in the address measures every row against it, so the pace marker, which belongs to
   the month in progress, goes. */
const monthWords = month => {
	const [year, number] = month.split('-').map(Number)
	const name = monthNames('long', true)[number - 1]
	return { name, full: `${name} ${year}` }
}

/** Categories (5d): each one against its monthly limit, opened for editing from its row. */
export default function Categories() {
	const touch = useShellShape() === 'touch'
	const toast = useToast()
	const settingsRead = useApi(getSettings)
	const settings = settingsRead.data
	const step = settings?.pageSize ?? 10
	// the order Settings names, until the address names another
	const opening = SORTS.find(s => s.id === FROM_SETTING[settings?.listSort]) ?? SORTS[0]
	const [params, setParams] = useSearchParams()
	const query = touch ? '' : params.get('q') ?? ''
	const sort = SORTS.find(s => s.id === params.get('sort')) ?? opening
	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	// the row whose Merge into… popover is open (5d), then the two 5j's dialog compares
	const [picking, setPicking] = useState(null)
	const [merging, setMerging] = useState(null)
	const [busy, setBusy] = useState(false)
	const column = useRef(null)
	// the bar spans the list, so its outer width is the list's; the hook reports the inner one
	const width = useWidth(column) && column.current.offsetWidth
	const cards = touch || (width > 0 && width <= CARDS)
	const folded = !cards && width > 0 && width <= FOLD
	const over = params.get('flag') === OVER_LIMIT
	const month = MONTH.test(params.get('month')) ? params.get('month') : null
	const named = month ? monthWords(month) : null
	const pace = named ? null : monthPace()
	// a page of rows per Load more, held in the address
	const { pages, setPages, restored } = useListMemory()
	const state = useApi(getCategoryPages, [{ query, sort: sort.id, with: 'month', ...(over ? { flag: OVER_LIMIT } : {}), ...(month ? { month } : {}) }, step, pages],
		{ enabled: Boolean(settings || settingsRead.error) })
	useEffect(() => { if ((state.data || state.error) && !state.loading) restored() }, [state.data, state.error, state.loading, restored])

	const write = (q, sortId, kept = { over, month }) => {
		const next = {}
		if (q) next.q = q
		if (kept.over) next.flag = OVER_LIMIT
		if (kept.month) next.month = kept.month
		if (sortId !== opening.id) next.sort = sortId
		setParams(next, { replace: true })
	}

	const shown = state.data?.categories ?? []
	const matched = state.data?.matched ?? 0
	const refocus = useRefocus(state.data?.categories, '.sp-table [aria-haspopup="menu"]', '.sp-controls a')

	const remove = () => {
		setBusy(true)
		refocus(deleting, shown.findIndex(r => r.id === deleting.id))
		deleteCategory(deleting.id)
			.catch(e => { if (!isGone(e)) throw e })
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				state.refresh()
				setDeleting(null)
			})
			.catch(e => sayFailure(toast, e, 'The category was not deleted. Try again.'))
			.finally(() => setBusy(false))
	}

	const merge = target => {
		const { source } = merging
		setBusy(true)
		refocus(source, shown.findIndex(r => r.id === source.id))
		mergeCategory(source.id, target.id)
			.then(() => {
				invalidateCategoryData()
				invalidateVendorData()
				state.refresh()
				toast({ message: `${source.name} is merged into ${target.name}.` })
				setMerging(null)
			})
			.catch(e => sayFailure(toast, e, 'The categories were not merged. Try again.'))
			.finally(() => setBusy(false))
	}

	const bar = (
		<Controls ref={column}>
			{touch ? null : (
				<SearchInput value={query} onChange={q => write(q, sort.id)} placeholder="Search categories" aria-label="Search categories" data-page-search="categories"
					kbd={width > KBD ? <Kbd>{MAC ? '⌘K' : 'Ctrl K'}</Kbd> : undefined} />
			)}
			<SortControl sorts={SORTS} value={sort.id} onChange={id => write(query, id)} />
			{touch
				? <Button to="/categories/new" iconStart="plus" aria-label="New category" />
				: <Button to="/categories/new">New category</Button>}
		</Controls>
	)

	let body
	if (!state.data && state.error) body = <Failed what="Your categories" error={state.error} onRetry={state.refresh} />
	else if (!state.data) body = <CategoriesLoading cards={cards} size={step} month={named?.name ?? (sort.id.startsWith('month-') ? sort.label : 'This month')}
		limit={sort.id === 'limit-desc' ? 'Monthly limit ↓' : 'Monthly limit'} folded={folded} />
	else if (!matched && !query && (over || month)) body = (
		<Card>
			<Empty>
				<EmptyTitle>{over ? 'No category is over its limit' : 'No category has spend'} {named ? `in ${named.full}` : 'this month'}</EmptyTitle>
			</Empty>
		</Card>
	)
	else if (!matched && !query) body = (
		<Card>
			<Empty>
				<EmptyTitle>No categories yet</EmptyTitle>
				<EmptyBody>Categories group your spend and carry the monthly limit. Add one now, or type a new one on an order.</EmptyBody>
				<Button size="small" to="/categories/new">New category</Button>
			</Empty>
		</Card>
	)
	else if (!matched) body = (
		<Card>
			<Empty>
				<EmptyTitle>No category matches "{query}"</EmptyTitle>
				<Button variant="outline" size="small" onClick={() => write('', sort.id)}>Clear search</Button>
			</Empty>
		</Card>
	)
	else if (cards) body = (
		<>
			{shown.map(c => {
				const over = c.budget > 0 && c.monthSpend > c.budget
				return (
					<Card key={c.id} to={`/categories/${c.id}/edit`}>
						<div className="sp-cell-flex">
							<CategoryMark category={c} />
							<div className="sp-stack sp-gap-6 sp-grow">
								<span className="sp-heading sp-truncate">{c.name}</span>
								<span className="sp-meta">{c.budget > 0 ? `limit ${currency(c.budget, 0)}` : 'no limit'}</span>
							</div>
							<span className={over ? 'sp-amount sp-ink-warning sp-nowrap' : 'sp-amount sp-nowrap'}>{currency(c.monthSpend, 0)}</span>
						</div>
						<MonthGauge category={c} pace={pace} />
						{over ? <span className="sp-meta sp-ink-warning">{currency(c.monthSpend - c.budget, 0)} over the limit.</span> : null}
					</Card>
				)
			})}
			<ListMore loose shown={shown.length} total={matched} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
		</>
	)
	else body = (
		<List data={shown} total={matched} onLoadMore={() => setPages(pages + 1)} recordKey={c => c.id} noun="categories" pageSize={step}
			rowTo={c => `/categories/${c.id}/edit`} locale={NUMBER_LOCALE}>
			<Caption><strong className="sp-data">{plural(matched, 'category', 'categories')}</strong></Caption>
			<ListHead>
				<ListCell width="title">Category</ListCell>
				<ListCell width="amount">{named?.name ?? (sort.id.startsWith('month-') ? sort.label : 'This month')}</ListCell>
				{folded ? null : <ListCell width="amount">{sort.id === 'limit-desc' ? 'Monthly limit ↓' : 'Monthly limit'}</ListCell>}
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{c => [
					<ListCell key="t" cell="flex">
						<CategoryMark category={c} />
						<Stacked>
							<span className="sp-title sp-truncate">{c.name}</span>
							<span className="sp-meta sp-truncate">
								{plural(c.orders, 'order')}{dot}{currency(c.monthAverage ?? 0, 0)} avg. per month
								{folded ? `${dot}${c.budget > 0 ? `limit ${currency(c.budget, 0)}` : 'no limit'}` : null}
							</span>
						</Stacked>
					</ListCell>,
					<ListCell key="m">
						<div className="sp-stack sp-gap-6 sp-right">
							<MonthGauge category={c} pace={pace} split />
							<MonthLine category={c} pace={pace} />
						</div>
					</ListCell>,
					folded ? null : (
						<ListCell key="l" cell="amount">
							{c.budget > 0 ? <span className="sp-amount">{currency(c.budget, 0)}</span> : <span className="sp-data sp-ink-5">no limit</span>}
						</ListCell>
					),
					<ListCell key="x" cell="menu">
						<RowMenu noun="Category" label={c.name} open={menuFor === c.id}
							onToggle={() => { setPicking(null); setMenuFor(menuFor === c.id ? null : c.id) }}
							onClose={() => { setMenuFor(null); setPicking(null) }}
							panel={picking === c.id
								? box => <MergePicker kind="category" source={c} anchor={box} onClose={() => setPicking(null)}
									onPick={target => { setPicking(null); setMerging({ source: c, target }) }} />
								: null}>
							<MenuItem icon="external-link" to={`/orders?category=${c.id}`}>Open in the order list</MenuItem>
							<MenuItem icon="pencil" to={`/categories/${c.id}/edit`}>Edit category</MenuItem>
							<MenuItem icon="arrows-join" onClick={() => { setMenuFor(null); setPicking(c.id) }}>Merge into…</MenuItem>
							<MenuSeparator />
							<MenuItem icon="trash" danger onClick={() => { setMenuFor(null); setDeleting(c) }}>Delete</MenuItem>
						</RowMenu>
					</ListCell>
				]}
			</ListRow>
		</List>
	)

	const crumbs = [
		over ? <Crumb key="over" onRemove={() => write(query, sort.id, { over: false, month })}>Over the limit</Crumb> : null,
		named ? <Crumb key="month" onRemove={() => write(query, sort.id, { over, month: null })}>{named.full}</Crumb> : null
	].filter(Boolean)

	return (
		<>
			{bar}
			{crumbs.length ? <Filters>{crumbs}</Filters> : null}
			{body}
			{deleting
				? <DeleteCategory category={deleting} busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />
				: null}
			{merging
				? <MergeDialog kind="category" source={merging.source} initial={merging.target} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the categories land. */
function CategoriesLoading({ cards, size, month, limit, folded }) {
	const rows = Array.from({ length: size }, (_, i) => ({ id: i, w: WIDTHS[i % WIDTHS.length] }))
	const gauge = <Held shape={<Gauge thin untargeted value={0} aria-label="No limit set" />} />
	if (cards) return rows.map(({ id, w }) => (
		<Card key={id} aria-busy="true">
			<div className="sp-cell-flex">
				<Skeleton shape="mark" />
				<div className="sp-stack sp-gap-6 sp-grow"><Bar role="sp-heading" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></div>
				<Bar role="sp-amount" w={w[2]} h="13" end />
			</div>
			{gauge}
		</Card>
	))
	return (
		<List data={rows} recordKey={r => r.id} noun="categories" pageSize={size} aria-busy="true">
			<Caption><Bar role="sp-data" w="82" h="13" /></Caption>
			<ListHead>
				<ListCell width="title">Category</ListCell>
				<ListCell width="amount">{month}</ListCell>
				{folded ? null : <ListCell width="amount">{limit}</ListCell>}
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{({ w }) => [
					<ListCell key="t" cell="flex">
						<Skeleton shape="mark" />
						<Stacked><Bar role="sp-title" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></Stacked>
					</ListCell>,
					<ListCell key="m">
						<div className="sp-stack sp-gap-6">
							{gauge}
							<Bar role="sp-meta" w={w[2]} h="10" end />
						</div>
					</ListCell>,
					folded ? null : <ListCell key="l" cell="amount"><Bar role="sp-amount" w="74" h="13" end /></ListCell>,
					<ListCell key="x" cell="menu"><Skeleton shape="icon" /></ListCell>
				]}
			</ListRow>
		</List>
	)
}
