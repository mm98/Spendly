import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, Crumb, Filters, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteVendor, getSettings, getVendors, invalidateCategoryData, invalidateVendorData, mergeVendor, updateVendor, vendorTextMatch
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, dayMonth, dot, plural, shortDate } from '../api/format.js'
import { useShellShape, useWidth } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import { Saving } from '../app/saving.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import {
	Bar, ConfirmDelete, MergeDialog, MergePicker, RowMenu, SortControl, archiveVendor, deleteNote, isGone, sayFailure, useRefocus
} from './vendorsCategories.jsx'

const SHOWN = [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]
// at this width of the list or under, the last order joins the name's second line (5k)
const FOLD = 880
// the address of the look-alike view, as Home links to it (10a)
const LOOKALIKES = 'possible-duplicate'

/** The look-alike view's rows: each vendor that is probably a duplicate under the one it is like
    (the API's `duplicateOf`), the pairs in the list's order. */
function pairedRows(vendors, by) {
	const under = new Map()
	for (const v of vendors) if (v.duplicateOf && !v.archived) under.set(v.duplicateOf, [...(under.get(v.duplicateOf) ?? []), v])
	const rows = []
	const seen = new Set()
	for (const keep of vendors.filter(v => under.has(v.id)).sort(by))
		for (const v of [keep, ...under.get(keep.id).sort(by)]) if (!seen.has(v.id)) { seen.add(v.id); rows.push(v) }
	return rows
}

/** A vendor's second line: favourite, orders, made by a scan (5a), and the last order when it has no column. */
const factsOf = (v, last) => [v.favourite ? 'Favourite' : null, plural(v.orders, 'order'), v.createdByScan ? 'created by receipt scan' : null,
	last && v.lastOrder ? `last ${last(v.lastOrder)}` : null].filter(Boolean).join(dot)

const SORTS = [
	{ id: 'spend-desc', label: 'Spend ↓', by: (a, b) => b.spend - a.spend },
	{ id: 'spend-asc', label: 'Spend ↑', by: (a, b) => a.spend - b.spend },
	{ id: 'name-asc', label: 'Name A - Z', by: (a, b) => a.name.localeCompare(b.name) },
	{ id: 'orders-desc', label: 'Orders ↓', by: (a, b) => b.orders - a.orders },
	{ id: 'saved-desc', label: 'Saved ↓', by: (a, b) => b.saved - a.saved },
	{ id: 'saved-asc', label: 'Saved ↑', by: (a, b) => a.saved - b.saved }
]

/** Vendors (5a): find a vendor and open it, or create one. Favourites are kept at the top. */
export default function Vendors() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const vendors = useApi(getVendors)
	const settings = useApi(getSettings).data
	const step = settings?.pageSize ?? 10
	// the order Settings names, until the address names another
	const opening = SORTS.find(s => s.id === settings?.listSort) ?? SORTS[0]
	const [params, setParams] = useSearchParams()
	const query = touch ? '' : params.get('q') ?? ''
	const sort = SORTS.find(s => s.id === params.get('sort')) ?? opening
	const archived = params.get('archived') === 'yes'
	// only the vendors that look like another, in pairs (10a): Home's "look like duplicates" opens it
	const alike = !archived && params.get('flag') === LOOKALIKES
	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	// the row whose Merge into… popover is open, then the two vendors 5j's dialog compares
	const [picking, setPicking] = useState(null)
	const [merging, setMerging] = useState(null)
	const [busy, setBusy] = useState(false)
	const column = useRef(null)
	const width = useWidth(column)
	const folded = !touch && width > 0 && width <= FOLD
	// a page of rows per Load more, kept for Back along with the scroll
	const { pages, setPages, restored } = useListMemory(`vendors?${query}&${sort.id}&${archived}&${alike}`)
	useEffect(() => { if (vendors.data) restored() }, [vendors.data])

	const write = (q, sortId, view = archived, flag = alike) => {
		const next = {}
		if (q) next.q = q
		if (sortId !== opening.id) next.sort = sortId
		if (view) next.archived = 'yes'
		if (flag && !view) next.flag = LOOKALIKES
		setParams(next, { replace: true })
	}

	// Home's Merge names one pair (16a): its comparison opens here, once, over the look-alike view
	const location = useLocation()
	const asked = location.state?.merge
	useEffect(() => {
		if (!asked || !vendors.data) return
		const source = vendors.data.find(v => v.id === asked.source)
		const target = vendors.data.find(v => v.id === asked.target)
		if (source && target) setMerging({ source, target })
		navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
	}, [asked, vendors.data])

	const all = vendors.data ?? []
	const order = (a, b) => (b.favourite - a.favourite) || sort.by(a, b)
	const paired = alike ? pairedRows(all, order) : null
	const rows = (paired ?? all.filter(v => v.archived === archived).sort(order)).filter(v => vendorTextMatch(v, query).matches)
	const shown = rows.slice(0, pages * step)
	const nameOf = id => all.find(v => v.id === id)?.name
	const refocus = useRefocus(vendors.data, '.sp-table [aria-haspopup="menu"]', '.sp-controls input, .sp-controls a')

	const remove = () => {
		setBusy(true)
		refocus(deleting, shown.findIndex(r => r.id === deleting.id))
		deleteVendor(deleting.id)
			.catch(e => { if (!isGone(e)) throw e })
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				vendors.refresh()
				setDeleting(null)
			})
			.catch(e => sayFailure(toast, e, 'The vendor was not deleted. Try again.'))
			.finally(() => setBusy(false))
	}

	// archiving can be undone, so it asks nothing and says so in a toast that offers the way back (6f)
	const setArchived = (vendor, to) => {
		setBusy(true)
		refocus(vendor, shown.findIndex(r => r.id === vendor.id))
		archiveVendor({ vendor, to, update: updateVendor, toast, done: () => { invalidateVendorData(); vendors.refresh() } })
			.catch(e => {
				if (isGone(e)) vendors.refresh()
				sayFailure(toast, e, 'That did not change. Try again.')
			})
			.finally(() => setBusy(false))
	}

	const merge = target => {
		const { source } = merging
		setBusy(true)
		refocus(source, shown.findIndex(r => r.id === source.id))
		mergeVendor(source.id, target.id)
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				vendors.refresh()
				toast({ message: `${source.name} is merged into ${target.name}.` })
				setMerging(null)
			})
			.catch(e => sayFailure(toast, e, 'The vendors were not merged. Try again.'))
			.finally(() => setBusy(false))
	}

	const bar = (
		<Controls ref={column}>
			{touch ? null : (
				<SearchInput value={query} onChange={q => write(q, sort.id)}
					placeholder="Search vendors by name or alias" aria-label="Search vendors by name or alias" />
			)}
			<Segmented name="vendors-shown" options={SHOWN} value={archived ? 'archived' : 'active'} variant={touch ? 'facet' : 'default'}
				onChange={v => write(query, sort.id, v === 'archived')} role="radiogroup" aria-label="Which vendors" />
			{/* on a phone the view takes the first row, and sort and New share the second */}
			{touch ? <span className="sp-grow" /> : null}
			<SortControl sorts={SORTS} value={sort.id} onChange={id => write(query, id)} />
			{touch
				? <Button to="/vendors/new" iconStart="plus" aria-label="New vendor" />
				: <Button to="/vendors/new">New vendor</Button>}
		</Controls>
	)
	const crumbs = alike
		? <Filters><Crumb name="the possible duplicates filter" onRemove={() => write(query, sort.id, false, false)}>Possible duplicates</Crumb></Filters>
		: null
	// in the look-alike view a probable duplicate leads with the vendor it is like: it is why the row is here
	const likeNote = v => (alike && v.duplicateOf
		? <><span className="sp-ink-warning">possible duplicate of {nameOf(v.duplicateOf)}</span>{dot}</>
		: null)

	let body
	if (!vendors.data && vendors.error) body = <Failed what="Your vendors" error={vendors.error} onRetry={vendors.refresh} />
	else if (!vendors.data) body = <VendorsLoading touch={touch} size={step} folded={folded} spend={sort.id.startsWith('spend') ? sort.label : 'Spend'} />
	else if (archived && !vendors.data.some(v => v.archived)) body = (
		<Card>
			<Empty>
				<EmptyTitle>No archived vendors</EmptyTitle>
				<EmptyBody>Archive a vendor from its menu to keep it out of the list. Its orders keep it.</EmptyBody>
				<Button variant="outline" size="small" onClick={() => write(query, sort.id, false)}>Show active vendors</Button>
			</Empty>
		</Card>
	)
	else if (!vendors.data.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendors yet</EmptyTitle>
				<EmptyBody>A vendor is added when an order names it, or add one now.</EmptyBody>
				<Button size="small" to="/vendors/new">New vendor</Button>
			</Empty>
		</Card>
	)
	else if (alike && !paired.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendors look like duplicates</EmptyTitle>
				<EmptyBody>Two vendors look alike when their names are almost the same, or when they have the same VAT number.</EmptyBody>
				<Button variant="outline" size="small" onClick={() => write(query, sort.id, false, false)}>Show all vendors</Button>
			</Empty>
		</Card>
	)
	else if (!rows.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendor matches "{query}"</EmptyTitle>
				<Button variant="outline" size="small" onClick={() => write('', sort.id)}>Clear search</Button>
			</Empty>
		</Card>
	)
	else if (touch) body = (
		<>
			{shown.map(v => (
				<Card key={v.id} to={`/vendors/${v.id}/edit`}>
					<div className="sp-cell-flex">
						<VendorMark name={v.name} colour={v.colour} />
						<Stacked>
							<span className="sp-heading sp-truncate">{v.name}</span>
							<span className="sp-meta sp-truncate">{likeNote(v)}{factsOf(v, shortDate)}</span>
						</Stacked>
						<span className="sp-amount sp-nowrap">{amount(v.spend)}</span>
					</div>
				</Card>
			))}
			<ListMore loose shown={shown.length} total={rows.length} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
		</>
	)
	else body = (
		<List data={shown} total={rows.length} onLoadMore={() => setPages(pages + 1)} recordKey={v => v.id} noun="vendors" pageSize={step}
			rowTo={v => `/vendors/${v.id}/edit`} locale={NUMBER_LOCALE}>
			<Caption><strong className="sp-data">{plural(rows.length, 'vendor')}</strong></Caption>
			<ListHead>
				<ListCell width="title">Vendor</ListCell>
				{folded ? null : <ListCell width="date">Last order</ListCell>}
				<ListCell width="amount">{sort.id.startsWith('spend') ? sort.label : 'Spend'}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{v => [
					<ListCell key="t" cell="flex">
						<VendorMark name={v.name} colour={v.colour} />
						<Stacked>
							<span className="sp-title sp-truncate">{v.name}</span>
							<span className="sp-meta sp-truncate">{likeNote(v)}{factsOf(v, folded ? dayMonth : null)}</span>
						</Stacked>
					</ListCell>,
					folded ? null : (
						<ListCell key="d">
							{v.lastOrder ? <span className="sp-data">{shortDate(v.lastOrder)}</span> : <span className="sp-data sp-ink-5">none</span>}
						</ListCell>
					),
					<ListCell key="a" cell="amount">
						<span className="sp-amount">{currency(v.spend)}</span>
						<Saving value={v.saved} />
					</ListCell>,
					<ListCell key="m" cell="menu">
						<RowMenu noun="Vendor" label={v.name} open={menuFor === v.id}
							onToggle={() => { setPicking(null); setMenuFor(menuFor === v.id ? null : v.id) }}
							onClose={() => { setMenuFor(null); setPicking(null) }}
							panel={picking === v.id
								? box => <MergePicker kind="vendor" source={v} options={all} anchor={box} onClose={() => setPicking(null)}
									onPick={target => { setPicking(null); setMerging({ source: v, target }) }} />
								: null}>
							<MenuItem icon="external-link" onClick={() => navigate(`/orders?vendor=${v.id}`)}>Open in the order list</MenuItem>
							<MenuItem icon="pencil" onClick={() => navigate(`/vendors/${v.id}/edit`)}>Edit vendor</MenuItem>
							<MenuItem icon="arrows-join" onClick={() => { setMenuFor(null); setPicking(v.id) }}>Merge into…</MenuItem>
							<MenuSeparator />
							{v.archived
								? <MenuItem icon="archive" onClick={() => { setMenuFor(null); setArchived(v, false) }}>Unarchive</MenuItem>
								: <MenuItem icon="archive" onClick={() => { setMenuFor(null); setArchived(v, true) }}>Archive</MenuItem>}
							{v.orders === 0
								? <MenuItem icon="trash" danger onClick={() => { setMenuFor(null); setDeleting(v) }}>Delete</MenuItem>
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
			{crumbs}
			{body}
			{deleting
				? (
					<ConfirmDelete title={`Delete ${deleting.name}?`} action="Delete vendor" busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(null)}>
						{deleteNote(deleting)}
					</ConfirmDelete>
				)
				: null}
			{merging
				? <MergeDialog kind="vendor" source={merging.source} initial={merging.target} options={all} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the vendors land. */
function VendorsLoading({ touch, size, spend, folded }) {
	const rows = Array.from({ length: size }, (_, i) => ({ id: i, w: WIDTHS[i % WIDTHS.length] }))
	if (touch) return rows.map(({ id, w }) => (
		<Card key={id} aria-busy="true">
			<div className="sp-cell-flex">
				<Skeleton shape="mark" />
				<Stacked><Bar role="sp-heading" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></Stacked>
				<Bar role="sp-amount" w={w[2]} h="13" end />
			</div>
		</Card>
	))
	return (
		<List data={rows} recordKey={r => r.id} noun="vendors" pageSize={size} aria-busy="true">
			<Caption><Bar role="sp-data" w="82" h="13" /></Caption>
			<ListHead>
				<ListCell width="title">Vendor</ListCell>
				{folded ? null : <ListCell width="date">Last order</ListCell>}
				<ListCell width="amount">{spend}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{({ w }) => [
					<ListCell key="t" cell="flex">
						<Skeleton shape="mark" />
						<Stacked><Bar role="sp-title" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></Stacked>
					</ListCell>,
					folded ? null : <ListCell key="d"><Bar role="sp-data" w="74" h="11" /></ListCell>,
					<ListCell key="a" cell="amount">
						<Bar role="sp-amount" w={w[2]} h="13" end />
						<Bar role="sp-amount-secondary" w="74" h="10" end />
					</ListCell>,
					<ListCell key="m" cell="menu"><Skeleton shape="icon" /></ListCell>
				]}
			</ListRow>
		</List>
	)
}
