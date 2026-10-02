import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Controls, List, ListCell, ListHead, ListRow } from '../components/List.jsx'
import { Card, ListFooter } from '../components/Card.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Button } from '../components/Button.jsx'
import { Mark } from '../components/Mark.jsx'
import { MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Stacked } from '../components/Utilities.jsx'
import { useApi } from '../api/useApi.js'
import {
	deleteVendor, failureMessage, getSettings, getVendors, invalidateCategoryData, invalidateVendorData, vendorTextMatch
} from '../api/client.js'
import { NUMBER_LOCALE, amount, currency, dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { Saving } from '../app/saving.jsx'
import { ConfirmDelete, Failed, ListLoading, RowMenu, SortControl, deleteNote, usePaged } from './vendorsCategories.jsx'

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

	const write = (q, sortId) => {
		const next = {}
		if (q) next.q = q
		if (sortId !== opening.id) next.sort = sortId
		setParams(next, { replace: true })
	}

	const rows = (vendors.data ?? [])
		.filter(v => vendorTextMatch(v, query).matches)
		.sort((a, b) => (b.favourite - a.favourite) || sort.by(a, b))
	const paged = usePaged(rows, step, query + sort.id)

	const remove = () => {
		setBusy(true)
		deleteVendor(deleting.id)
			.then(() => {
				invalidateVendorData()
				invalidateCategoryData()
				vendors.refresh()
				setDeleting(null)
			})
			.catch(e => toast({ message: failureMessage(e, 'The vendor was not deleted. Try again.'), color: 'danger' }))
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
	if (!vendors.data && vendors.error) body = <Failed title="Your vendors could not be loaded" error={vendors.error} onRetry={vendors.refresh} />
	else if (!vendors.data) body = <ListLoading />
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
			{paged.page.map(v => (
				<Card key={v.id} to={`/vendors/${v.id}/edit`}>
					<div className="sp-cell-flex">
						<Mark size="medium">{v.name}</Mark>
						<Stacked>
							<span className="sp-heading sp-truncate">{v.name}</span>
							<span className="sp-meta">{v.favourite ? `Favourite${dot}` : null}{plural(v.orders, 'order')}</span>
						</Stacked>
						<span className="sp-amount sp-nowrap">{amount(v.spend)}</span>
					</div>
				</Card>
			))}
			{rows.length > step
				? (
					<ListFooter loose>
						<span className="sp-subtitle">Showing {amount(paged.page.length, 0)} of {amount(rows.length, 0)}</span>
						{paged.more ? <Button variant="outline" size="small" onClick={paged.showMore}>Load more</Button> : null}
					</ListFooter>
				)
				: null}
		</>
	)
	else body = (
		<List data={rows} recordKey={v => v.id} noun="vendors" pageSize={step} selectionKey={query + sort.id}
			rowTo={v => `/vendors/${v.id}/edit`} locale={NUMBER_LOCALE}>
			<ListHead>
				<ListCell width="title">Vendor</ListCell>
				<ListCell width="amount">{sort.id.startsWith('spend') ? sort.label : 'Spend'}</ListCell>
				<ListCell width="menu" />
			</ListHead>
			<ListRow>
				{v => [
					<ListCell key="t" cell="flex">
						<Mark size="medium">{v.name}</Mark>
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
