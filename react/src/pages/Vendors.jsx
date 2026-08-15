import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { InsetPanel, ItemRow, LegendRow } from '../components/Rows.jsx'
import { Donut, foldForRing } from '../components/Viz.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { useToast } from '../components/Toast.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import { getVendors, getVendorsOverview, updateVendor } from '../api/client.js'
import { dayMonth, krRound } from '../api/format.js'

/* Vendors, overview.

   Stats about the vendors, not a list of them -- the list is its own tab, the same split All
   orders has had all along. This page used to be both, and the list half of it was a grid of
   cards that could not be scanned; what is left here is what the numbers say.

   A vendor page is for two things, and browsing orders is neither: it is for what the spending
   looks like across the shops, and for keeping the records right. So the ring splits spend by
   vendor, the tiles count what there is, and every way into a record is on the other tab. */

export default function Vendors() {
	const state = useApi(getVendorsOverview)
	const toast = useToast()

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
				<Button variant="caps" to="/vendors/new">ADD VENDOR</Button>
			</div>

			<Async state={state} label="Loading your vendors">{data => {
				const all = data.all
				const spend = all.reduce((sum, v) => sum + v.spend, 0)
				const saved = all.reduce((sum, v) => sum + v.saved, 0)
				const orders = all.reduce((sum, v) => sum + v.orders, 0)
				const busiest = all.reduce((most, v) => (v.orders > (most?.orders ?? 0) ? v : most), null)

				/* The ring and the rows beside it are one list of numbers, drawn from one array --
				   the rule every other ring in this app already follows. */
				const split = foldForRing(
					all.map(v => ({ id: v.id, name: v.name, colour: v.colour, spend: v.spend })),
					n => `${n} more vendors`)

				return (
					<>
						<div className="kpi-row">
							<KpiCard label="Vendors" value={String(all.length)}
								note={busiest ? `${busiest.name} is the most frequent` : null} />
							<KpiCard label="Spent" value={krRound(spend)} note="all time" />
							<KpiCard label="Saved vs retail" value={krRound(saved)}
								note={spend > 0 ? `${Math.round((saved / (spend + saved)) * 100)}% under retail` : null} />
							<KpiCard label="Orders" value={String(orders)}
								note={all.length ? `${Math.round(orders / all.length)} per vendor on average` : null} />
						</div>

						<Card aria-label="Where it goes">
							<CardHeader title="Where it goes · all time" to="/vendors/all"
								label="Where it goes, open all vendors" />
							<CardDivider />
							<CardBody variant="ring-row">
								{split.length ? (
									<>
										<Donut segments={split.map(v => ({ share: spend ? (v.spend / spend) * 100 : 0, colour: v.colour }))}
											value={krRound(spend)} label="Spent, all time"
											ariaLabel={`Vendor split of ${krRound(spend)}`} />
										<div className="chart-legend chart-legend-fill">
											{split.map(v => (
												/* The folded row names a count rather than a vendor, so it opens the
												   list where those vendors actually are instead of an orders filter
												   for a vendor that does not exist. */
												<LegendRow key={v.id ?? 'more'} colour={v.colour} title={v.name}
													amount={krRound(v.spend)}
													to={v.id ? `/orders/all?vendor=${v.id}` : '/vendors/all'} />
											))}
										</div>
									</>
								) : (
									<EmptyState>
										<p>Nothing spent yet. Your first order creates its vendor.</p>
									</EmptyState>
								)}
							</CardBody>
						</Card>

						<Card aria-label="Favourites">
							<CardHeader title="Favourites" to="/vendors/all" label="Favourites, open all vendors" />
							<CardDivider />
							<CardBody>
								{data.favourites.length ? (
									<div className="spotlight-pair">
										{data.favourites.map(vendor => (
											<Card key={vendor.id}>
												<CardHeader title={vendor.name} to={`/orders/all?vendor=${vendor.id}`}
													label={`${vendor.name}, open their orders`} />
												<CardDivider />
												<CardBody>
													<div className="lead-sentence">
														{vendor.lead ?? `${vendor.orders} orders, ${krRound(vendor.spend)}.`}</div>
													<InsetPanel>
														<ItemRow icon="discount" title="Saved vs retail"
															meta={`${vendor.name} · all time`} amount={krRound(vendor.saved)} />
														{/* The row is always drawn. Dropping it for a vendor with no orders
														    yet left two cards side by side at different heights, with the
														    shorter one's buttons floating in the gap -- and it said nothing
														    about why. A fact that is not there is still a fact. */}
														<ItemRow icon="receipt" title="Latest order"
															meta={vendor.latest
																? `${dayMonth(vendor.latest.date)} · ${vendor.latest.items} items`
																: 'None · all time'}
															amount={krRound(vendor.latest?.total ?? 0)} />
													</InsetPanel>
													<div className="row-inline row-actions entity-actions">
														<IconButton icon="star" label={`Remove ${vendor.name} from favourites`}
															onClick={() => toggleFavourite(vendor)} />
														<IconButton icon="pencil" label={`Edit ${vendor.name}`}
															to={`/vendors/${vendor.id}/edit`} />
													</div>
												</CardBody>
											</Card>
										))}
									</div>
								) : (
									<EmptyState>
										<p>No favourites yet. Star a vendor on its own page and it lands here.</p>
										<Button variant="block" to="/vendors/all">ALL VENDORS</Button>
									</EmptyState>
								)}
							</CardBody>
						</Card>
					</>
				)
			}}</Async>
		</Page>
	)
}
