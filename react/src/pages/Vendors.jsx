import { useMemo, useState } from 'react'
import { Page, useView } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel } from '../components/Card.jsx'
import { EntryRow, InsetPanel, ItemRow } from '../components/Rows.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { FieldShell, Segmented } from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import { getVendors, getVendorsOverview, updateVendor } from '../api/client.js'
import { dayMonth, krRound } from '../api/format.js'

/* Vendors.

   The Favourites sub-tab hides everything marked [data-view-only="overview"], which is the
   stylesheet's own mechanism -- the tab sets the view on the page element and the CSS does the
   rest. What is left is the spotlight cards, and which vendors those are is the user's choice:
   the star on each card toggles it, through the API, and it persists.

   Nothing is created or edited here. ADD VENDOR goes to /vendors/new and the pencil on a card
   goes to /vendors/:id/edit -- the same form component a category and an order are written in,
   with the name, the tile colour, the favourite switch and DELETE on it. The inline editor
   this replaced opened a bordered section inside a card inside a horizontal scroller, which on
   a phone is a form about as wide as its own labels. See components/FormPage.jsx.

   The star stays on the card, because a favourite is not an edit: it is one value, it is
   toggled from the list the value orders, and it says what it did in a toast.

   The horizontal strip carries tabindex="0" and a region role: cards that hold nothing
   focusable are unreachable without a pointer, and five vendors scrolled past the right edge
   at 390px with no way to tab to them. README: Accessibility. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.orders - a.orders, Saved: (a, b) => b.saved - a.saved }

export default function Vendors() {
	const state = useApi(getVendorsOverview)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')
	const toast = useToast()
	const { setView } = useView()

	const toggleFavourite = vendor => {
		updateVendor(vendor.id, { favourite: !vendor.favourite })
			.then(() => {
				invalidate(getVendors); invalidate(getVendorsOverview)
				state.refresh()
				toast(`${vendor.name} ${vendor.favourite ? 'removed from' : 'added to'} favourites.`)
			})
			.catch(e => toast(e.message, 'negative'))
	}

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>Every shop you buy from, in one place.</h2>
				<p>Vendors collect their orders, totals and savings automatically. Favourites stay on top.</p>
				{/* The hero holds one call to action at the hero size, and nothing else. It opens the
				    page that writes a vendor rather than a panel below it: `.hero .button.button-caps`
				    is 48px, and any second button standing beside it is either 48px too or a
				    mismatched pair -- which is what a 32px CANCEL next to it was. README: Buttons. */}
				<Button variant="caps" to="/vendors/new">ADD VENDOR</Button>
			</div>

			<Async state={state} label="Loading your vendors">{data => (
				<VendorsBody data={data} query={query} setQuery={setQuery} sort={sort} setSort={setSort}
					onFavourite={toggleFavourite} setView={setView} />
			)}</Async>
		</Page>
	)
}

function VendorsBody({ data, query, setQuery, sort, setSort, onFavourite, setView }) {
	const listed = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return data.all
			.filter(v => !needle || v.name.toLowerCase().includes(needle))
			.sort(SORTS[sort])
	}, [data.all, query, sort])

	return (
		<>
			<SectionHeader data-view-only="overview">
				<SectionLabel>Favourites</SectionLabel>
				{/* The Favourites view is what "see all of them" means here, and it is the same
				    place the sub-tab goes -- one destination, two ways in. */}
				<Button variant="pill" onClick={() => setView('favourites')}>SEE ALL</Button>
			</SectionHeader>

			<div className="spotlight-pair">
				{data.favourites.map(vendor => (
					<Card key={vendor.id}>
						{/* One vendor card, in two sizes. The header is the way into the vendor's
						    orders -- label left, chevron right, the whole band a link, which is where
						    every card in this app puts its destination and what the all-vendors card
						    below already did. A full-width VIEW ORDERS at the foot was a second
						    control for that one destination.

						    So the header carries no buttons: an action inside a link is two things to
						    activate in one box, and no engine agrees about which one a click means.
						    The star and the pencil go at the foot, in the row the all-vendors card
						    already had. It also held a "Favourite · saved 6.940 kr." chip that said
						    nothing the card did not say twice -- the star is the favourite state, and
						    the saved figure is the first row of the panel below. README: Cards. */}
						<CardHeader title={vendor.name} to={`/orders/all?vendor=${vendor.id}`}
							label={`${vendor.name}, open their orders`} />
						<CardDivider />
						<CardBody>
							<div className="lead-sentence">
								{vendor.lead ?? `${vendor.orders} orders, ${krRound(vendor.spend)}.`}</div>
							<InsetPanel>
								<ItemRow icon="discount" title="Saved vs retail" meta={`${vendor.name} · all time`}
									amount={krRound(vendor.saved)} />
								{/* The row is always drawn. Dropping it for a vendor with no orders yet left
								    two cards side by side at different heights, with the shorter one's
								    buttons floating in the gap -- and it said nothing about why. A fact
								    that is not there is still a fact. */}
								<ItemRow icon="receipt" title="Latest order"
									meta={vendor.latest
										? `${dayMonth(vendor.latest.date)} · ${vendor.latest.items} items`
										: 'None · all time'}
									amount={krRound(vendor.latest?.total ?? 0)} />
							</InsetPanel>
							<div className="row-inline" style={{ gap: 4, marginTop: 10 }}>
								<IconButton icon="star" label={`Remove ${vendor.name} from favourites`}
									onClick={() => onFavourite(vendor)} />
								<IconButton icon="pencil" label={`Edit ${vendor.name}`}
									to={`/vendors/${vendor.id}/edit`} />
							</div>
						</CardBody>
					</Card>
				))}
				{data.favourites.length === 0 ? (
					<Card>
						<CardBody>
							<p className="field-help">
								No favourites yet. Star a vendor below and it moves up here.</p>
						</CardBody>
					</Card>
				) : null}
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

			{/* No tabIndex: it was there to let a keyboard scroll the row sideways, and the row
			    does not scroll any more -- a tab stop that lands on a container and does nothing
			    is a stop the keyboard has to spend on nothing. */}
			<div className="vendor-grid" data-view-only="overview" role="region" aria-label="All vendors">
				{listed.map(vendor => (
					/* The way into the vendor's orders is the card header, which is where every other
					   card in this app puts it: the label on the left, the chevron on the right, the
					   whole band a link. A chevron in a row of icon buttons at the foot was a third
					   layout for something the system already has one of -- and it mixed navigation
					   in with two actions that are not navigation. README: Cards. */
					<Card key={vendor.id}>
						<CardHeader title={vendor.name} to={`/orders/all?vendor=${vendor.id}`}
							label={`${vendor.name}, open their orders`} />
						<CardDivider />
						<CardBody>
							<div className="entry-list">
								<EntryRow avatar={vendor}
									name={`${vendor.orders} order${vendor.orders === 1 ? '' : 's'}`}
									meta={`saved ${krRound(vendor.saved)}`} />
							</div>
							<div className="figure-card tabular-figures">{krRound(vendor.spend)}</div>
							<span className="card-caption">all time</span>
							<div className="row-inline" style={{ gap: 4, marginTop: 10 }}>
								<IconButton icon="star" label={`Add ${vendor.name} to favourites`}
									onClick={() => onFavourite(vendor)} />
								<IconButton icon="pencil" label={`Edit ${vendor.name}`}
									to={`/vendors/${vendor.id}/edit`} />
							</div>
						</CardBody>
					</Card>
				))}
				{listed.length === 0
					? <p className="field-help">{query ? `No vendor matches "${query}".` : 'No vendors yet.'}</p>
					: null}
			</div>
		</>
	)
}
