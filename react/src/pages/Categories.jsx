import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Gauge } from '../components/Data.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteCategory, getCategoriesThisMonth, getSettings, invalidateCategoryData, invalidateVendorData
} from '../api/client.js'
import { NUMBER_LOCALE, amountRound, currency, dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import {
	Bar, CategoryMark, ConfirmDelete, Held, RowMenu, SortControl, categoryDeleteNote, isGone, monthPace, sayFailure, useRefocus
} from './vendorsCategories.jsx'

const SORTS = [
	{ id: 'name-asc', label: 'Name A - Z', by: (a, b) => a.name.localeCompare(b.name) },
	{ id: 'month-desc', label: 'This month ↓', by: (a, b) => b.monthSpend - a.monthSpend },
	{ id: 'month-asc', label: 'This month ↑', by: (a, b) => a.monthSpend - b.monthSpend },
	{ id: 'limit-desc', label: 'Limit ↓', by: (a, b) => b.budget - a.budget },
	{ id: 'orders-desc', label: 'Orders ↓', by: (a, b) => b.orders - a.orders }
]
// Settings' shared sort in this list's terms: spend here is the month's, and a category saves nothing
const FROM_SETTING = { 'spend-desc': 'month-desc', 'spend-asc': 'month-asc' }

/* The month against the limit in the thin bar. Past the limit, a table row splits the track into
   the part up to it and the overage (5i); a phone card fills it, with the overage in words. */
function MonthGauge({ category, pace, split = false }) {
	const { monthSpend: spend, budget } = category
	if (!(budget > 0)) return <Gauge thin untargeted value={0} aria-label="No limit set" />
	if (spend > budget && !split) return <Gauge thin passed value={100} marker={pace.at} aria-label="Share of the limit used" />
	if (spend > budget) {
		const upTo = (budget / spend) * 100
		return <Gauge thin value={upTo} over={100 - upTo} marker={pace.at} aria-label="Share of the limit used" />
	}
	return <Gauge thin value={(spend / budget) * 100} marker={pace.at} aria-label="Share of the limit used" />
}

function MonthLine({ category }) {
	const { monthSpend: spend, budget } = category
	if (!(budget > 0)) return <span className="sp-meta">{currency(spend, 0)} spent</span>
	if (spend > budget)
		return <span className="sp-meta sp-ink-warning"><b className="sp-strong">{currency(spend, 0)}</b>{dot}{amountRound(spend - budget)} over</span>
	return <span className="sp-meta">{currency(spend, 0)}{dot}{amountRound(budget - spend)} left</span>
}

/** Categories (5d): each one against its monthly limit, opened for editing from its row. */
export default function Categories() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const state = useApi(getCategoriesThisMonth)
	const settings = useApi(getSettings).data
	const step = settings?.pageSize ?? 10
	// the order Settings names, until the address names another
	const opening = SORTS.find(s => s.id === FROM_SETTING[settings?.listSort]) ?? SORTS[0]
	const [params, setParams] = useSearchParams()
	const query = touch ? '' : params.get('q') ?? ''
	const sort = SORTS.find(s => s.id === params.get('sort')) ?? opening
	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [busy, setBusy] = useState(false)
	const pace = monthPace()
	// a page of rows per Load more, kept for Back along with the scroll
	const { pages, setPages, restored } = useListMemory(`categories?${query}&${sort.id}`)
	useEffect(() => { if (state.data) restored() }, [state.data])

	const write = (q, sortId) => {
		const next = {}
		if (q) next.q = q
		if (sortId !== opening.id) next.sort = sortId
		setParams(next, { replace: true })
	}

	const all = state.data?.categories ?? []
	const needle = query.trim().toLowerCase()
	const rows = all.filter(c => !needle || c.name.toLowerCase().includes(needle)).sort(sort.by)
	const shown = rows.slice(0, pages * step)
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

	const bar = (
		<Controls>
			{touch ? null : (
				<SearchInput value={query} onChange={q => write(q, sort.id)} placeholder="Search categories" aria-label="Search categories" />
			)}
			<SortControl sorts={SORTS} value={sort.id} onChange={id => write(query, id)} />
			{touch
				? <Button to="/categories/new" iconStart="plus" aria-label="New category" />
				: <Button to="/categories/new">New category</Button>}
		</Controls>
	)

	let body
	if (!state.data && state.error) body = <Failed what="Your categories" error={state.error} onRetry={state.refresh} />
	else if (!state.data) body = <CategoriesLoading touch={touch} size={step} month={sort.id.startsWith('month-') ? sort.label : 'This month'}
		limit={sort.id === 'limit-desc' ? 'Monthly limit ↓' : 'Monthly limit'} />
	else if (!all.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No categories yet</EmptyTitle>
				<EmptyBody>Categories group your spend and carry the monthly limit. Add one now, or type a new one on an order.</EmptyBody>
				<Button size="small" to="/categories/new">New category</Button>
			</Empty>
		</Card>
	)
	else if (!rows.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No category matches "{query}"</EmptyTitle>
				<Button variant="outline" size="small" onClick={() => write('', sort.id)}>Clear search</Button>
			</Empty>
		</Card>
	)
	else if (touch) body = (
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
			<ListMore loose shown={shown.length} total={rows.length} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
		</>
	)
	else body = (
		<List data={shown} total={rows.length} onLoadMore={() => setPages(pages + 1)} recordKey={c => c.id} noun="categories" pageSize={step}
			rowTo={c => `/categories/${c.id}/edit`} locale={NUMBER_LOCALE}>
			<Caption><strong className="sp-data">{plural(rows.length, 'category', 'categories')}</strong></Caption>
			<ListHead>
				<ListCell width="title">Category</ListCell>
				<ListCell width="amount">{sort.id.startsWith('month-') ? sort.label : 'This month'}</ListCell>
				<ListCell width="amount">{sort.id === 'limit-desc' ? 'Monthly limit ↓' : 'Monthly limit'}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{c => [
					<ListCell key="t" cell="flex">
						<CategoryMark category={c} />
						<Stacked>
							<span className="sp-title sp-truncate">{c.name}</span>
							<span className="sp-meta sp-truncate">{plural(c.orders, 'order')}</span>
						</Stacked>
					</ListCell>,
					<ListCell key="m">
						<div className="sp-stack sp-gap-6 sp-right">
							<MonthGauge category={c} pace={pace} split />
							<MonthLine category={c} />
						</div>
					</ListCell>,
					<ListCell key="l" cell="amount">
						{c.budget > 0 ? <span className="sp-amount">{currency(c.budget, 0)}</span> : <span className="sp-data sp-ink-5">no limit</span>}
					</ListCell>,
					<ListCell key="x" cell="menu">
						<RowMenu noun="Category" label={c.name} open={menuFor === c.id}
							onToggle={() => setMenuFor(menuFor === c.id ? null : c.id)} onClose={() => setMenuFor(null)}>
							<MenuItem icon="external-link" onClick={() => navigate(`/orders?category=${c.id}`)}>Open in the order list</MenuItem>
							<MenuItem icon="pencil" onClick={() => navigate(`/categories/${c.id}/edit`)}>Edit category</MenuItem>
							{c.orders === 0 && c.bookmarks === 0
								? (
									<>
										<MenuSeparator />
										<MenuItem icon="trash" danger onClick={() => { setMenuFor(null); setDeleting(c) }}>Delete</MenuItem>
									</>
								)
								: null}
						</RowMenu>
					</ListCell>
				]}
			</ListRow>
		</List>
	)

	return (
		<>
			{bar}
			{body}
			{deleting
				? (
					<ConfirmDelete title={`Delete ${deleting.name}?`} action="Delete category" busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(null)}>
						{categoryDeleteNote(deleting.budget)}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the categories land. */
function CategoriesLoading({ touch, size, month, limit }) {
	const rows = Array.from({ length: size }, (_, i) => ({ id: i, w: WIDTHS[i % WIDTHS.length] }))
	const gauge = <Held shape={<Gauge thin untargeted value={0} aria-label="No limit set" />} />
	if (touch) return rows.map(({ id, w }) => (
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
				<ListCell width="amount">{limit}</ListCell>
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
					<ListCell key="l" cell="amount"><Bar role="sp-amount" w="74" h="13" end /></ListCell>,
					<ListCell key="x" cell="menu"><Skeleton shape="icon" /></ListCell>
				]}
			</ListRow>
		</List>
	)
}
