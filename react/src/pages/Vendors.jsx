import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, Crumb, Filters, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Kbd, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteVendor, getSettings, getVendorPage, getVendorPages, invalidateCategoryData, invalidateVendorData, mergeVendor, updateVendor
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, dayMonth, dot, plural, shortDate } from '../api/format.js'
import { MAC, useShellShape, useWidth } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import { Saving } from '../app/saving.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import {
	Bar, ConfirmDelete, MergeDialog, MergePicker, RowMenu, SortControl, archiveVendor, deleteNote, isGone, sayFailure, useRefocus
} from './vendorsCategories.jsx'

const SHOWN = [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]
// at this width of the list or under, the last order joins the name's second line (5k)
const FOLD = 880
// at this width of the list or under, the table becomes cards, as the order list does (2i)
const CARDS = 640
// the search drops its shortcut badge at this width of the list or under (15e)
const KBD = 720
// the address of the look-alike view, as Home links to it (10a)
const LOOKALIKES = 'possible-duplicate'

/** A vendor's second line: orders, made by a scan (5a), and the last order when it has no column. */
const factsOf = (v, last) => [plural(v.orders, 'order'), v.createdByScan ? 'created by receipt scan' : null,
	last && v.lastOrder ? `last ${last(v.lastOrder)}` : null].filter(Boolean).join(dot)

// the server orders the list, favourites first (api/src/lib/vendorList.js)
const SORTS = [
	{ id: 'spend-desc', label: 'Spend ↓' },
	{ id: 'spend-asc', label: 'Spend ↑' },
	{ id: 'name-asc', label: 'Name A - Z' },
	{ id: 'orders-desc', label: 'Orders ↓' },
	{ id: 'saved-desc', label: 'Saved ↓' },
	{ id: 'saved-asc', label: 'Saved ↑' }
]

/** Vendors (5a): find a vendor and open it, or create one. Favourites are kept at the top. */
export default function Vendors() {
	const touch = useShellShape() === 'touch'
	const toast = useToast()
	const settingsRead = useApi(getSettings)
	const settings = settingsRead.data
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
	// the bar spans the list, so its outer width is the list's; the hook reports the inner one
	const width = useWidth(column) && column.current.offsetWidth
	const cards = touch || (width > 0 && width <= CARDS)
	const folded = !cards && width > 0 && width <= FOLD
	// a page of rows per Load more, held in the address
	const { pages, setPages, restored } = useListMemory()
	const request = { query, sort: sort.id, archived: archived ? 'yes' : '', flag: alike ? LOOKALIKES : '' }
	const vendors = useApi(getVendorPages, [request, step, pages], { enabled: Boolean(settings || settingsRead.error) })
	useEffect(() => { if ((vendors.data || vendors.error) && !vendors.loading) restored() }, [vendors.data, vendors.error, vendors.loading, restored])
	// an empty list with nothing typed asks whether any vendor exists at all, archived or not
	const empty = vendors.data?.matched === 0 && !query && !archived && !alike
	const any = useApi(getVendorPage, [{ archived: 'all', pageSize: 1 }], { enabled: empty })

	const write = (q, sortId, view = archived, flag = alike) => {
		const next = {}
		if (q) next.q = q
		if (sortId !== opening.id) next.sort = sortId
		if (view) next.archived = 'yes'
		if (flag && !view) next.flag = LOOKALIKES
		setParams(next, { replace: true })
	}

	const shown = vendors.data?.vendors ?? []
	const matched = vendors.data?.matched ?? 0
	const refocus = useRefocus(vendors.data?.vendors, '.sp-table [aria-haspopup="menu"]', '.sp-controls input, .sp-controls a')

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
					placeholder="Search vendors by name or alias" aria-label="Search vendors by name or alias" data-page-search="vendors"
					kbd={width > KBD ? <Kbd>{MAC ? '⌘K' : 'Ctrl K'}</Kbd> : undefined} />
			)}
			<Segmented name="vendors-shown" options={SHOWN} value={archived ? 'archived' : 'active'} variant={touch ? 'facet' : 'default'}
				onChange={v => write(query, sort.id, v === 'archived')} role="radiogroup" aria-label="Which vendors" />
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
		? <><span className="sp-ink-warning">possible duplicate of {v.duplicateName}</span>{dot}</>
		: null)

	let body
	if (!vendors.data && vendors.error) body = <Failed what="Your vendors" error={vendors.error} onRetry={vendors.refresh} />
	else if (!vendors.data) body = <VendorsLoading cards={cards} size={step} folded={folded} spend={sort.id.startsWith('spend') ? sort.label : 'Spend'} />
	else if (archived && !matched && !query) body = (
		<Card>
			<Empty>
				<EmptyTitle>No archived vendors</EmptyTitle>
				<EmptyBody>Archive a vendor from its menu to keep it out of the list. Its orders keep it.</EmptyBody>
				<Button variant="outline" size="small" onClick={() => write(query, sort.id, false)}>Show active vendors</Button>
			</Empty>
		</Card>
	)
	else if (empty && !any.data) body = <VendorsLoading cards={cards} size={step} folded={folded} spend={sort.id.startsWith('spend') ? sort.label : 'Spend'} />
	else if (empty && !any.data.matched) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendors yet</EmptyTitle>
				<EmptyBody>A vendor is added when an order names it, or add one now.</EmptyBody>
				<Button size="small" to="/vendors/new">New vendor</Button>
			</Empty>
		</Card>
	)
	else if (empty) body = (
		<Card>
			<Empty>
				<EmptyTitle>No active vendors</EmptyTitle>
				<EmptyBody>Every vendor is archived.</EmptyBody>
				<Button variant="outline" size="small" onClick={() => write(query, sort.id, true)}>Show archived vendors</Button>
			</Empty>
		</Card>
	)
	else if (alike && !matched && !query) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendors look like duplicates</EmptyTitle>
				<EmptyBody>Two vendors look alike when their names are almost the same, or when they have the same VAT number.</EmptyBody>
				<Button variant="outline" size="small" onClick={() => write(query, sort.id, false, false)}>Show all vendors</Button>
			</Empty>
		</Card>
	)
	else if (!matched) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendor matches "{query}"</EmptyTitle>
				<Button variant="outline" size="small" onClick={() => write('', sort.id)}>Clear search</Button>
			</Empty>
		</Card>
	)
	else if (cards) body = (
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
			<ListMore loose shown={shown.length} total={matched} pageSize={step} onMore={() => setPages(pages + 1)} locale={NUMBER_LOCALE} />
		</>
	)
	else body = (
		<List data={shown} total={matched} onLoadMore={() => setPages(pages + 1)} recordKey={v => v.id} noun="vendors" pageSize={step}
			rowTo={v => `/vendors/${v.id}/edit`} locale={NUMBER_LOCALE}>
			<Caption><strong className="sp-data">{plural(matched, 'vendor')}</strong></Caption>
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
								? box => <MergePicker kind="vendor" source={v} anchor={box} onClose={() => setPicking(null)}
									onPick={target => { setPicking(null); setMerging({ source: v, target }) }} />
								: null}>
							<MenuItem icon="external-link" to={`/orders?vendor=${v.id}`}>Open in the order list</MenuItem>
							<MenuItem icon="pencil" to={`/vendors/${v.id}/edit`}>Edit vendor</MenuItem>
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
				? <MergeDialog kind="vendor" source={merging.source} initial={merging.target} busy={busy} onConfirm={merge} onCancel={() => setMerging(null)} />
				: null}
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the vendors land. */
function VendorsLoading({ cards, size, spend, folded }) {
	const rows = Array.from({ length: size }, (_, i) => ({ id: i, w: WIDTHS[i % WIDTHS.length] }))
	if (cards) return rows.map(({ id, w }) => (
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
