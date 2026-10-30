import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, Crumb, Filters, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Gauge } from '../components/Data.jsx'
import { MenuItem, MenuSeparator, useToast, Leaving } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteCategory, getCategoryPages, getSettings, invalidateCategoryData, invalidateVendorData, mergeCategory, overBudget, periodSpend
} from '../api/client.js'
import { NUMBER_LOCALE, amountRound, currency, dot, monthNames, plural } from '../api/format.js'
import { useShellShape, useWidth } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import {
	Bar, CardMenu, CategoryMark, DeleteCategory, Held, MergeDialog, MergePicker, RowMenu, SortControl, isGone, periodPace, sayFailure, useRefocus
} from './vendorsCategories.jsx'
import { usePageSearch } from '../app/afterDraw.js'
import { phrase, usePhrase } from '../language/phrases.js'

// the server orders the list (api/src/lib/categoryList.js)
const SORTS = [
	{ id: 'name-asc', label: 'sort.arrow.nameAsc' },
	{ id: 'month-desc', label: 'sort.arrow.monthDesc' },
	{ id: 'month-asc', label: 'sort.arrow.monthAsc' },
	{ id: 'limit-desc', label: 'sort.arrow.limitDesc' },
	{ id: 'orders-desc', label: 'sort.arrow.ordersDesc' }
]
// at this width of the list or under, the monthly limit joins the name's second line (5k)
const FOLD = 880
// at this width of the list or under, the table becomes cards, as the order list does (2i)
const CARDS = 640

// Settings' shared sort in this list's terms: spend here is the month's, and a category saves nothing
const FROM_SETTING = { 'spend-desc': 'month-desc', 'spend-asc': 'month-asc' }

/* The month against the limit in the thin bar. Past the limit, a table row splits the track into
   the part up to it and the overage (5i); a phone card fills it, with the overage in words. */
function MonthGauge({ category, pace, split = false }) {
	const { budget } = category
	const spend = periodSpend(category)
	if (!(budget > 0)) return <Gauge thin untargeted value={0} aria-label={phrase('categories.noLimitSet')} />
	if (spend > budget && !split) return <Gauge thin passed value={100} marker={pace?.at} aria-label={phrase('categories.shareUsed')} />
	if (spend > budget) {
		const upTo = (budget / spend) * 100
		return <Gauge thin value={upTo} over={100 - upTo} marker={pace?.at} aria-label={phrase('categories.shareUsed')} />
	}
	return <Gauge thin value={(spend / budget) * 100} marker={pace?.at} aria-label={phrase('categories.shareUsed')} />
}

/** `months` names the stretch of a yearly limit read back to a named month: "Jan - Aug". */
function MonthLine({ category, pace, months }) {
	const { budget } = category
	const spend = periodSpend(category)
	if (!(budget > 0)) return <span className="sp-meta">{phrase('categories.spent', { amount: currency(spend, 0) })}</span>
	const spent = months && category.budgetPeriod === 'year' ? `${currency(spend, 0)} ${months}` : currency(spend, 0)
	if (spend > budget)
		return <span className="sp-meta sp-ink-warning"><b className="sp-strong">{spent}</b>{dot}{phrase('categories.over', { amount: amountRound(spend - budget) })}</span>
	// ahead of pace only past ten points over the marker (5i)
	if (pace && (spend / budget) * 100 > pace.at + 10)
		return <span className="sp-meta sp-ink-warning"><b className="sp-strong">{spent}</b>{dot}{phrase('categories.aheadOfPace')}</span>
	return <span className="sp-meta">{spent}{dot}{phrase('categories.left', { amount: amountRound(budget - spend) })}</span>
}

/** A limit and the period it is for, as the name's second line says it: "limit 22.000 kr. a month". */
const limitWords = c => (c.budget > 0 ? phrase('categories.limitOf', { amount: currency(c.budget, 0), period: c.budgetPeriod }) : phrase('categories.noLimit'))

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const OVER_LIMIT = 'over-limit'
const LIMITED = 'limited'
const NEAR_LIMIT = 'near-limit'

/* A named month drops a monthly row's pace marker, since the month is over; a yearly row is
   measured on its year up to that month, with the marker at that month's share of the year. */
const monthWords = month => {
	const [year, number] = month.split('-').map(Number)
	const name = monthNames('long', true)[number - 1]
	const short = monthNames('short', true)
	return { name, full: `${name} ${year}`, number, months: number === 1 ? short[0] : `${short[0]} - ${short[number - 1]}` }
}

/** Categories (5d): each one against its monthly limit, opened for editing from its row. */
export default function Categories() {
	const phrase = usePhrase()
	const pageSearch = usePageSearch()
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
	const limits = params.get('flag') === LIMITED
	const near = params.get('flag') === NEAR_LIMIT
	const month = MONTH.test(params.get('month')) ? params.get('month') : null
	const named = month ? monthWords(month) : null
	const paceOf = c => (!named ? periodPace(c.budgetPeriod) : c.budgetPeriod === 'year' ? { at: (named.number / 12) * 100 } : null)
	// a page of rows per Load more, held in the address
	const { pages, setPages, restored } = useListMemory()
	const state = useApi(getCategoryPages, [{ query, sort: sort.id, with: 'month', ...(over ? { flag: OVER_LIMIT } : limits ? { flag: LIMITED } : near ? { flag: NEAR_LIMIT, early: settings?.notifyEarly } : {}), ...(month ? { month } : {}) }, step, pages],
		{ enabled: Boolean(settings || settingsRead.error) })
	useEffect(() => { if ((state.data || state.error) && !state.loading) restored() }, [state.data, state.error, state.loading, restored])

	const write = (q, sortId, kept = { over, limits, near, month }) => {
		const next = {}
		if (q) next.q = q
		if (kept.over) next.flag = OVER_LIMIT
		else if (kept.limits) next.flag = LIMITED
		else if (kept.near) next.flag = NEAR_LIMIT
		if (kept.month) next.month = kept.month
		if (sortId !== opening.id) next.sort = sortId
		setParams(next, { replace: true })
	}

	const shown = state.data?.categories ?? []
	const matched = state.data?.matched ?? 0
	const refocus = useRefocus(state.data?.categories, '.sp-table [aria-haspopup="menu"]', '.sp-controls a')

	// one record's menu, the same from its row's kebab and from a long press on its phone card
	const closeMenu = () => { setMenuFor(null); setPicking(null) }
	const mergePanel = c => picking === c.id
		? box => <MergePicker kind="category" source={c} anchor={box} onClose={() => setPicking(null)}
			onPick={target => { setPicking(null); setMerging({ source: c, target }) }} />
		: null
	const menuItems = c => (
		<>
			<MenuItem icon="external-link" to={`/orders?category=${c.id}`}>{phrase('library.openInOrders')}</MenuItem>
			<MenuItem icon="pencil" to={`/categories/${c.id}/edit`}>{phrase('categories.edit')}</MenuItem>
			<MenuItem icon="arrows-join" onClick={() => { setMenuFor(null); setPicking(c.id) }}>{phrase('library.mergeInto')}</MenuItem>
			<MenuSeparator />
			<MenuItem icon="trash" danger onClick={() => { setMenuFor(null); setDeleting(c) }}>{phrase('action.delete')}</MenuItem>
		</>
	)

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
			.catch(e => sayFailure(toast, e, phrase('categories.notDeleted')))
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
				toast({ message: phrase('library.merged', { source: source.name, target: target.name }) })
				setMerging(null)
			})
			.catch(e => sayFailure(toast, e, phrase('categories.notMerged')))
			.finally(() => setBusy(false))
	}

	const bar = (
		<Controls ref={column}>
			{touch ? null : (
				<SearchInput value={query} onChange={q => write(q, sort.id)} placeholder={phrase('categories.search')} aria-label={phrase('categories.search')} inputRef={pageSearch} />
			)}
			<SortControl sorts={SORTS} value={sort.id} onChange={id => write(query, id)} />
			{touch
				? <Button to="/categories/new" iconStart="plus" aria-label={phrase('categories.new')} />
				: <Button to="/categories/new">{phrase('categories.new')}</Button>}
		</Controls>
	)

	let body
	if (!state.data && state.error) body = <Failed what={phrase('categories.yours')} error={state.error} onRetry={state.refresh} />
	else if (!state.data) body = <CategoriesLoading cards={cards} size={step} month={named?.name ?? phrase(sort.id.startsWith('month-') ? sort.label : 'categories.thisPeriod')}
		limit={phrase(sort.id === 'limit-desc' ? 'categories.limitDown' : 'categories.limit')} folded={folded} />
	else if (!matched && !query && (over || limits || near || month)) body = (
		<Card>
			<Empty>
				<EmptyTitle>{limits ? phrase('categories.empty.noLimits') : near ? phrase('categories.empty.near')
					: phrase(over ? 'categories.empty.over' : 'categories.empty.spend', { named: named ? 'yes' : 'no', month: named?.full })}</EmptyTitle>
			</Empty>
		</Card>
	)
	else if (!matched && !query) body = (
		<Card>
			<Empty>
				<EmptyTitle>{phrase('categories.empty.none')}</EmptyTitle>
				<EmptyBody>{phrase('categories.empty.noneBody')}</EmptyBody>
				<Button size="small" to="/categories/new">{phrase('categories.new')}</Button>
			</Empty>
		</Card>
	)
	else if (!matched) body = (
		<Card>
			<Empty>
				<EmptyTitle>{phrase('categories.empty.noMatch', { query })}</EmptyTitle>
				<Button variant="outline" size="small" onClick={() => write('', sort.id)}>{phrase('orders.clearSearch')}</Button>
			</Empty>
		</Card>
	)
	else if (cards) body = (
		<>
			{shown.map(c => {
				const over = overBudget(c)
				return (
					<CardMenu key={c.id} to={`/categories/${c.id}/edit`} label={c.name} open={menuFor === c.id}
						onOpen={() => { setPicking(null); setMenuFor(c.id) }} onClose={closeMenu} panel={mergePanel(c)} menu={menuItems(c)}>
						<div className="sp-cell-flex">
							<CategoryMark category={c} />
							<Stacked>
								<span className="sp-heading sp-truncate">{c.name}</span>
								<span className="sp-meta sp-truncate">{limitWords(c)}</span>
							</Stacked>
							<span className={over ? 'sp-amount sp-ink-warning sp-nowrap' : 'sp-amount sp-nowrap'}>{currency(periodSpend(c), 0)}</span>
						</div>
						<MonthGauge category={c} pace={paceOf(c)} />
						{over ? <span className="sp-meta sp-ink-warning">{phrase('categories.overTheLimit', { amount: currency(periodSpend(c) - c.budget, 0) })}</span> : null}
					</CardMenu>
				)
			})}
			<ListMore loose shown={shown.length} total={matched} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
		</>
	)
	else body = (
		<List data={shown} total={matched} onLoadMore={() => setPages(pages + 1)} recordKey={c => c.id} noun="categories" pageSize={step}
			rowTo={c => `/categories/${c.id}/edit`} locale={NUMBER_LOCALE}>
			<Caption><strong className="sp-data">{plural(matched, 'category')}</strong></Caption>
			<ListHead>
				<ListCell width="title">{phrase('field.category')}</ListCell>
				<ListCell width="amount">{named?.name ?? phrase(sort.id.startsWith('month-') ? sort.label : 'categories.thisPeriod')}</ListCell>
				{folded ? null : <ListCell width="amount">{phrase(sort.id === 'limit-desc' ? 'categories.limitDown' : 'categories.limit')}</ListCell>}
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{c => [
					<ListCell key="t" cell="flex">
						<CategoryMark category={c} />
						<Stacked>
							<span className="sp-title sp-truncate">{c.name}</span>
							<span className="sp-meta sp-truncate">
								{plural(c.orders, 'order')}{dot}{phrase('categories.average', { amount: currency(c.monthAverage ?? 0, 0) })}
								{folded ? `${dot}${limitWords(c)}` : null}
							</span>
						</Stacked>
					</ListCell>,
					<ListCell key="m">
						<div className="sp-stack sp-gap-6 sp-right">
							<MonthGauge category={c} pace={paceOf(c)} split />
							<MonthLine category={c} pace={paceOf(c)} months={named?.months} />
						</div>
					</ListCell>,
					folded ? null : (
						<ListCell key="l" cell="amount">
							{c.budget > 0
								? (
									<>
										<span className="sp-amount">{currency(c.budget, 0)}</span>
										<span className="sp-meta">{phrase('categories.per', { period: c.budgetPeriod })}</span>
									</>
								)
								: <span className="sp-data sp-ink-5">{phrase('categories.noLimit')}</span>}
						</ListCell>
					),
					<ListCell key="x" cell="menu">
						<RowMenu noun="category" label={c.name} open={menuFor === c.id}
							onToggle={() => { setPicking(null); setMenuFor(menuFor === c.id ? null : c.id) }}
							onClose={closeMenu} panel={mergePanel(c)}>
							{menuItems(c)}
						</RowMenu>
					</ListCell>
				]}
			</ListRow>
		</List>
	)

	const crumbs = [
		over ? <Crumb key="over" onRemove={() => write(query, sort.id, { over: false, limits, near, month })}>{phrase('categories.crumb.over')}</Crumb> : null,
		near ? <Crumb key="near" onRemove={() => write(query, sort.id, { over, limits, near: false, month })}>{phrase('categories.crumb.near')}</Crumb> : null,
		limits ? <Crumb key="limits" onRemove={() => write(query, sort.id, { over, limits: false, near, month })}>{phrase('categories.crumb.limited')}</Crumb> : null,
		named ? <Crumb key="month" onRemove={() => write(query, sort.id, { over, limits, near, month: null })}>{named.full}</Crumb> : null
	].filter(Boolean)

	return (
		<>
			{bar}
			{crumbs.length ? <Filters>{crumbs}</Filters> : null}
			{body}
			<Leaving>{deleting
				? <DeleteCategory category={deleting} busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />
				: null}</Leaving>
			<Leaving>{merging
				? <MergeDialog kind="category" source={merging.source} initial={merging.target} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}</Leaving>
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the categories land. */
function CategoriesLoading({ cards, size, month, limit, folded }) {
	const rows = Array.from({ length: size }, (_, i) => ({ id: i, w: WIDTHS[i % WIDTHS.length] }))
	const gauge = <Held shape={<Gauge thin untargeted value={0} aria-label={phrase('categories.noLimitSet')} />} />
	if (cards) return rows.map(({ id, w }) => (
		<Card key={id} aria-busy="true">
			<div className="sp-cell-flex">
				<Skeleton shape="mark" />
				<Stacked><Bar role="sp-heading" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></Stacked>
				<Bar role="sp-amount" w={w[2]} h="13" end />
			</div>
			{gauge}
		</Card>
	))
	return (
		<List data={rows} recordKey={r => r.id} noun="categories" pageSize={size} aria-busy="true">
			<Caption><Bar role="sp-data" w="82" h="13" /></Caption>
			<ListHead>
				<ListCell width="title">{phrase('field.category')}</ListCell>
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
