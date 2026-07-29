import { useMemo, useState } from 'react'
import { Page, useView } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel } from '../components/Card.jsx'
import { EntryRow, InsetPanel, ItemRow } from '../components/Rows.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Icon } from '../components/Icon.jsx'
import { Field, FieldShell, FormActions, FormStatus, Segmented, TextInput } from '../components/Form.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	createVendor, deleteVendor, getVendors, getVendorsOverview, updateVendor
} from '../api/client.js'
import { dayMonth, krRound } from '../api/format.js'

/* Vendors.

   The Favourites sub-tab hides everything marked [data-view-only="overview"], which is the
   stylesheet's own mechanism -- the tab sets the view on the page element and the CSS does
   the rest. What is left is the spotlight cards, and which vendors those are is now the
   user's choice: the star on each card toggles it, through the API, and it persists.

   ADD VENDOR opens a form that adds one. SEE ALL switches to the Favourites view. Neither
   was wired in the prototype, and a control that names an action and does not do it is the
   defect this app keeps finding. README 13.

   The horizontal strip carries tabindex="0" and a region role: cards that hold nothing
   focusable are unreachable without a pointer, and five vendors scrolled past the right edge
   at 390px with no way to tab to them. S18. */

const SORTS = { Spend: (a, b) => b.spend - a.spend, Name: (a, b) => a.name.localeCompare(b.name),
	Orders: (a, b) => b.orders - a.orders, Saved: (a, b) => b.saved - a.saved }

export default function Vendors() {
	const state = useApi(getVendorsOverview)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('Spend')
	const [adding, setAdding] = useState(false)
	const [name, setName] = useState('')
	const [status, setStatus] = useState({ message: '', good: true })
	const { setView } = useView()

	const refresh = () => { invalidate(getVendors); invalidate(getVendorsOverview); state.refresh() }

	/* Closing the form puts focus back on the button that opened it, which is where it came
	   from -- a disclosure that closes onto the body drops a keyboard user at the top. */
	const cancelAdd = () => {
		setAdding(false)
		setName('')
		queueMicrotask(() => document.querySelector('.hero button')?.focus())
	}

	const add = () => {
		if (!name.trim()) {
			setStatus({ message: 'A vendor needs a name.', good: false })
			return
		}
		createVendor(name)
			.then(vendor => {
				refresh()
				setName(''); setAdding(false)
				setStatus({ message: `${vendor.name} added.`, good: true })
				queueMicrotask(() => document.querySelector('.hero button')?.focus())
			})
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	const toggleFavourite = vendor => {
		updateVendor(vendor.id, { favourite: !vendor.favourite })
			.then(() => {
				refresh()
				setStatus({
					message: `${vendor.name} ${vendor.favourite ? 'removed from' : 'added to'} favourites.`,
					good: true
				})
			})
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	const remove = vendor => {
		deleteVendor(vendor.id)
			.then(() => { refresh(); setStatus({ message: `${vendor.name} removed.`, good: true }) })
			/* A vendor with orders on it cannot go: the orders would point at nothing. The API
			   says so with a 409 and the message names the reason rather than failing silently. */
			.catch(e => setStatus({ message: e.message, good: false }))
	}

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>Every shop you buy from, in one place.</h2>
				<p>Vendors collect their orders, totals and savings automatically. Favourites stay on top.</p>
				{/* The hero holds one call to action at the hero size, and nothing else. The form
				    it opens is in the card below: `.hero .button.button-caps` is 48px, and any
				    second button standing beside it is either 48px too or a mismatched pair --
				    which is what a 32px CANCEL next to it was. The stylesheet says so in its own
				    words a few rules up: two buttons that belong together share one spec, rather
				    than each call site inventing a height. README 6. */}
				<Button variant="caps" aria-expanded={adding} aria-controls="add-vendor"
					onClick={() => {
						setAdding(true)
						queueMicrotask(() => document.getElementById('new-vendor')?.focus())
					}}>ADD VENDOR</Button>
			</div>

			{adding ? (
				<Card id="add-vendor" aria-label="Add a vendor">
					<CardHeader title="Add a vendor" />
					<CardDivider />
					<CardBody>
						<div className="form form-wide">
							<Field label="Vendor name" help="It joins your list straight away, with no orders on it yet.">
								<FieldShell>
									<TextInput id="new-vendor" value={name} onChange={setName}
										placeholder="Silvan" aria-label="Vendor name"
										onKeyDown={e => {
											if (e.key === 'Enter') { e.preventDefault(); add() }
											else if (e.key === 'Escape') cancelAdd()
										}} />
								</FieldShell>
							</Field>
							<FormActions>
								<Button variant="caps compact" onClick={add}>ADD VENDOR</Button>
								<Button variant="ghost compact" onClick={cancelAdd}>CANCEL</Button>
							</FormActions>
						</div>
					</CardBody>
				</Card>
			) : null}

			<FormStatus message={status.message} good={status.good} />

			<Async state={state} label="Loading your vendors">{data => (
				<VendorsBody data={data} query={query} setQuery={setQuery} sort={sort} setSort={setSort}
					onFavourite={toggleFavourite} onRemove={remove} setView={setView} />
			)}</Async>
		</Page>
	)
}

function VendorsBody({ data, query, setQuery, sort, setSort, onFavourite, onRemove, setView }) {
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
				{/* The Favourites view is what "see all of them" means here, and it is the same
				    place the sub-tab goes -- one destination, two ways in. */}
				<Button variant="pill" onClick={() => setView('favourites')}>SEE ALL</Button>
			</SectionHeader>

			<div className="spotlight-pair">
				{data.favourites.map(vendor => (
					<Card key={vendor.id}>
						<CardHeader title={vendor.name}>
							<Chip icon="star">Favourite · saved {krRound(vendor.saved)}</Chip>
							<IconButton icon="star" label={`Remove ${vendor.name} from favourites`}
								onClick={() => onFavourite(vendor)} />
						</CardHeader>
						<CardDivider />
						<CardBody>
							<div className="lead-sentence">
								{vendor.lead ?? `${vendor.orders} orders, ${krRound(vendor.spend)}.`}</div>
							<InsetPanel>
								<ItemRow icon="discount" title="Saved vs retail" meta={`${vendor.name} · all time`}
									amount={krRound(vendor.saved)} />
								{vendor.latest ? (
									<ItemRow icon="receipt" title="Latest order"
										meta={`${dayMonth(vendor.latest.date)} · ${vendor.latest.items} items`}
										amount={krRound(vendor.latest.total)} />
								) : null}
							</InsetPanel>
							<Button variant="ghost" to={`/orders/all?vendor=${vendor.id}`}>VIEW ORDERS</Button>
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

			<div className="scroll-row" data-view-only="overview" tabIndex={0} role="region" aria-label="All vendors">
				{listed.map(vendor => (
					/* The way into the vendor is the card header, which is where every other card
					   in this app puts it: the label on the left, the chevron on the right, the
					   whole band a link. A chevron in a row of icon buttons at the foot was a
					   third layout for something the system already has one of -- and it mixed
					   navigation in with two actions that are not navigation. README 10. */
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
								<IconButton icon="trash" label={`Delete ${vendor.name}`}
									onClick={() => onRemove(vendor)} />
							</div>
						</CardBody>
					</Card>
				))}
				{listed.length === 0
					? <p className="field-help">{query ? `No vendor matches "${query}".` : 'Every vendor is a favourite.'}</p>
					: null}
			</div>
		</>
	)
}
