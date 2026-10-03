import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Failed } from '../components/Failed.jsx'
import { Caption, Controls, List, ListCell, ListHead, ListMore, ListRow } from '../components/List.jsx'
import { Card } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteVendor, getSettings, getVendors, invalidateCategoryData, invalidateVendorData, vendorTextMatch
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useListMemory } from '../app/listMemory.js'
import { Saving } from '../app/saving.jsx'
import { VendorMark } from '../app/categoryMark.jsx'
import { Bar, ConfirmDelete, RowMenu, SortControl, deleteNote, isGone, sayFailure, useRefocus } from './vendorsCategories.jsx'

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
	const [menuFor, setMenuFor] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [busy, setBusy] = useState(false)
	// a page of rows per Load more, kept for Back along with the scroll
	const { pages, setPages, restored } = useListMemory(`vendors?${query}&${sort.id}`)
	useEffect(() => { if (vendors.data) restored() }, [vendors.data])

	const write = (q, sortId) => {
		const next = {}
		if (q) next.q = q
		if (sortId !== opening.id) next.sort = sortId
		setParams(next, { replace: true })
	}

	const rows = (vendors.data ?? [])
		.filter(v => vendorTextMatch(v, query).matches)
		.sort((a, b) => (b.favourite - a.favourite) || sort.by(a, b))
	const shown = rows.slice(0, pages * step)
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

	const bar = (
		<Controls>
			{touch ? null : (
				<SearchInput value={query} onChange={q => write(q, sort.id)}
					placeholder="Search vendors by name or alias" aria-label="Search vendors by name or alias" />
			)}
			<SortControl sorts={SORTS} value={sort.id} onChange={id => write(query, id)} />
			{touch
				? <Button to="/vendors/new" iconStart="plus" aria-label="New vendor" />
				: <Button to="/vendors/new">New vendor</Button>}
		</Controls>
	)

	let body
	if (!vendors.data && vendors.error) body = <Failed what="Your vendors" error={vendors.error} onRetry={vendors.refresh} />
	else if (!vendors.data) body = <VendorsLoading touch={touch} size={step} spend={sort.id.startsWith('spend') ? sort.label : 'Spend'} />
	else if (!vendors.data.length) body = (
		<Card>
			<Empty>
				<EmptyTitle>No vendors yet</EmptyTitle>
				<EmptyBody>A vendor is added when an order names it, or add one now.</EmptyBody>
				<Button size="small" to="/vendors/new">New vendor</Button>
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
							<span className="sp-meta">{v.favourite ? `Favourite${dot}` : null}{plural(v.orders, 'order')}</span>
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
				<ListCell width="amount">{sort.id.startsWith('spend') ? sort.label : 'Spend'}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{v => [
					<ListCell key="t" cell="flex">
						<VendorMark name={v.name} colour={v.colour} />
						<Stacked>
							<span className="sp-title sp-truncate">{v.name}</span>
							<span className="sp-meta sp-truncate">{v.favourite ? `Favourite${dot}` : null}{plural(v.orders, 'order')}</span>
						</Stacked>
					</ListCell>,
					<ListCell key="a" cell="amount">
						<span className="sp-amount">{currency(v.spend)}</span>
						<Saving value={v.saved} />
					</ListCell>,
					<ListCell key="m" cell="menu">
						<RowMenu noun="Vendor" label={v.name} open={menuFor === v.id}
							onToggle={() => setMenuFor(menuFor === v.id ? null : v.id)} onClose={() => setMenuFor(null)}>
							<MenuItem icon="external-link" onClick={() => navigate(`/orders?vendor=${v.id}`)}>Open in the order list</MenuItem>
							<MenuItem icon="pencil" onClick={() => navigate(`/vendors/${v.id}/edit`)}>Edit vendor</MenuItem>
							{v.orders === 0
								? (
									<>
										<MenuSeparator />
										<MenuItem icon="trash" danger onClick={() => { setMenuFor(null); setDeleting(v) }}>Delete</MenuItem>
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
					<ConfirmDelete title={`Delete ${deleting.name}?`} action="Delete vendor" busy={busy}
						onConfirm={remove} onCancel={() => setDeleting(null)}>
						{deleteNote(deleting)}
					</ConfirmDelete>
				)
				: null}
		</>
	)
}

const WIDTHS = [['62pc', '44pc', '88'], ['48pc', '36pc', '74'], ['55pc', '30pc', '92']]

/* A page of rows held at the loaded rows' places (6b), so nothing moves when the vendors land. */
function VendorsLoading({ touch, size, spend }) {
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
				<ListCell width="amount">{spend}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{({ w }) => [
					<ListCell key="t" cell="flex">
						<Skeleton shape="mark" />
						<Stacked><Bar role="sp-title" w={w[0]} h="13" /><Bar role="sp-meta" w={w[1]} h="10" /></Stacked>
					</ListCell>,
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
