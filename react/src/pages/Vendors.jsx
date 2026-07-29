import { useMemo, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel } from '../components/Card.jsx'
import { EntryRow, InsetPanel, ItemRow } from '../components/Rows.jsx'
import { Button } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell, Segmented } from '../components/Form.jsx'
import { useApi } from '../api/useApi.js'
import { getVendorsOverview } from '../api/client.js'
import { dayMonth, krRound } from '../api/format.js'

/* Vendors.

   The Favourites sub-tab hides everything marked [data-view-only="overview"], which is the
   stylesheet's own mechanism -- the tab sets the view on the page element and the CSS does
   the rest. What is left is the two spotlight cards, which is what "favourites" means here.

   The horizontal strip carries tabindex="0" and a region role: cards that hold nothing
   focusable are unreachable without a pointer, and five vendors scrolled past the right edge
   at 390px with no way to tab to them. S18. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.orders - a.orders, Saved: (a, b) => b.saved - a.saved }

export default function Vendors() {
	const state = useApi(getVendorsOverview)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>Every shop you buy from, in one place.</h2>
				<p>Vendors collect their orders, totals and savings automatically. Favourites stay on top.</p>
				<Button variant="caps">ADD VENDOR</Button>
			</div>

			<Async state={state} label="Loading your vendors">{data => (
				<VendorsBody data={data} query={query} setQuery={setQuery} sort={sort} setSort={setSort} />
			)}</Async>
		</Page>
	)
}

function VendorsBody({ data, query, setQuery, sort, setSort }) {
	const listed = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return data.rest
			.filter(v => !needle || v.name.toLowerCase().includes(needle))
			.sort(SORTS[sort])
	}, [data.rest, query, sort])

	return (
		<>
			<SectionHeader data-view-only="overview">
				<SectionLabel>Favourites</SectionLabel>
				<Button variant="pill">SEE ALL</Button>
			</SectionHeader>

			<div className="spotlight-pair">
				{data.favourites.map(vendor => (
					<Card key={vendor.id}>
						<CardHeader title={vendor.name}>
							<Chip icon="star">Favourite · saved {krRound(vendor.saved)}</Chip>
						</CardHeader>
						<CardDivider />
						<CardBody>
							<div className="lead-sentence">{vendor.lead}</div>
							<InsetPanel>
								<ItemRow icon="discount" title="Saved vs retail" meta={`${vendor.name} · all time`}
									amount={krRound(vendor.saved)} />
								<ItemRow icon="receipt" title="Latest order"
									meta={`${dayMonth(vendor.latest.date)} · ${vendor.latest.items} items`}
									amount={krRound(vendor.latest.total)} />
							</InsetPanel>
							<Button variant="ghost" to={`/orders/all?vendor=${vendor.id}`}>VIEW ORDERS</Button>
						</CardBody>
					</Card>
				))}
			</div>

			<SectionHeader data-view-only="overview"><SectionLabel>All vendors</SectionLabel></SectionHeader>

			<div className="row-inline toolbar" data-view-only="overview">
				<FieldShell>
					<Icon name="search" />
					<input type="search" value={query} placeholder="Search vendor name…"
						aria-label="Search vendors" onChange={e => setQuery(e.target.value)} />
				</FieldShell>
				<Segmented options={Object.keys(SORTS)} value={sort} onChange={setSort}
					label="Sort vendors" tablist={false} />
			</div>

			<div className="scroll-row" data-view-only="overview" tabIndex={0} role="region" aria-label="All vendors">
				{listed.map(vendor => (
					<Card key={vendor.id}>
						<CardBody>
							<div className="entry-list">
								<EntryRow avatar={vendor} name={vendor.name} meta={`${vendor.orders} orders`} />
							</div>
							<div className="figure-card tabular-figures">{krRound(vendor.spend)}</div>
							<span className="card-caption">saved {krRound(vendor.saved)}</span>
						</CardBody>
					</Card>
				))}
				{listed.length === 0
					? <p className="field-help">No vendor matches "{query}".</p>
					: null}
			</div>
		</>
	)
}
