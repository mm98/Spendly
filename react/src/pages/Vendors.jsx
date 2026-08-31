import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonKpiRow } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader, EmptyState, KpiCard } from '../components/Card.jsx'
import { LegendRow } from '../components/Rows.jsx'
import { FavouriteTile, FavouriteTileGrid } from '../components/FavouriteTiles.jsx'
import { Donut, foldForRing } from '../components/Viz.jsx'
import { Button } from '../components/Button.jsx'
import { useApi } from '../api/useApi.js'
import { chartPeriodPhrase, getVendorChartSplit, getVendors } from '../api/client.js'
import { currency, plural, sep } from '../api/format.js'
import { inkOn } from '../api/colour.js'

/* Vendors, overview.

   Stats about the vendors, not a list of them -- the list is its own tab, the same split All
   orders has had all along. This page used to be both, and the list half of it was a grid of
   cards that could not be scanned; what is left here is what the numbers say.

   A vendor page is for two things, and browsing orders is neither: it is for what the spending
   looks like across the shops, and for keeping the records right. So the ring splits spend by
   vendor, the tiles count what there is, and every way into a record is on the other tab. */

export default function Vendors() {
	/* The same request the All vendors tab reads, under the same cache key -- the spotlight/
	   list split is this page's own reshape of that one answer, below. */
	const state = useApi(getVendors)
	/* The ring's own read, separate from `state` above: it is scoped to settings.chartPeriod,
	   which the KPI row and the Favourites tiles are not, and joining it into the same gate
	   would stall both of those on a fetch only the ring needs -- see the Where it goes card
	   below, which gives it its own Async rather than waiting on it up here. Same split as
	   Categories.jsx. */
	const chart = useApi(getVendorChartSplit)

	return (
		<Page variant="page-grid">
			<div className="hero hero-panel">
				<h2>Every shop you buy from, in one place.</h2>
				<p>Vendors collect their orders, totals and savings automatically. Favourites stay on top.</p>
				<Button variant="caps" to="/vendors/new">ADD VENDOR</Button>
			</div>

			<Async state={state} label="Loading your vendors"
				skeleton={<>
					<SkeletonKpiRow />
					<SkeletonCard bodyHeight={220} />
					<SkeletonCard bodyHeight={160} />
				</>}>{all => {
				/* `favourites` is drawn from the same array it is a subset of, favourites
				   included in both: starring a vendor pins it to the spotlight without removing
				   it from the only searchable, sortable view of them. A favourite is drawn
				   twice -- once where it was pinned, and once in the list it never left. */
				const favourites = all.filter(v => v.favourite)
				const spend = all.reduce((sum, v) => sum + v.spend, 0)
				const saved = all.reduce((sum, v) => sum + v.saved, 0)
				const orders = all.reduce((sum, v) => sum + v.orders, 0)
				const busiest = all.reduce((most, v) => (v.orders > (most?.orders ?? 0) ? v : most), null)

				return (
					<>
						<div className="kpi-row">
							<KpiCard label="Vendors" value={String(all.length)}
								note={busiest ? `${busiest.name} is the most frequent` : null} />
							<KpiCard label="Spent" value={currency(spend, 0)} note="all time" />
							<KpiCard label="Saved vs retail" value={currency(saved, 0)}
								note={spend > 0 ? `${Math.round((saved / (spend + saved)) * 100)}% under retail` : null} />
							<KpiCard label="Orders" value={String(orders)}
								note={all.length ? `${Math.round(orders / all.length)} per vendor on average` : null} />
						</div>

						{/* Its own Async, not folded into the page's outer one above: this card is the
						    one thing on the page scoped to settings.chartPeriod, so it is the one thing
						    that waits on that fetch. .async-live is display:contents (app.css), so the
						    boundary costs no extra box between this Card and the grid it sits in. */}
						<Async state={chart} label="Loading your vendors' split"
							skeleton={<SkeletonCard bodyHeight={220} />}>{chartData => {
							/* The ring and the rows beside it are one list of numbers, drawn from one
							    array -- the rule every other ring in this app already follows. Renamed
							    onto foldForRing's own field (`amount` -> `spend`), the one shape it reads. */
							const split = foldForRing(
								chartData.split.map(v => ({ id: v.id, name: v.name, colour: v.colour, spend: v.amount })),
								n => `${n} more vendors`)
							const periodWord = chartPeriodPhrase(chartData.period)
							return (
								/* Same rule as Categories: the header band and the closing buttons open the
								    vendors list only while it has rows -- on an empty account each degrades to
								    its passive form rather than opening a list that answers "No vendors yet".
								    README: Empty states. */
								<Card aria-label="Where it goes">
									<CardHeader title={`Where it goes${sep}${periodWord}`}
										to={all.length ? '/vendors/all' : undefined}
										label="Where it goes, open all vendors" />
									<CardDivider />
									<CardBody variant="ring-row">
										{split.length ? (
											<>
												<Donut segments={split.map(v => ({ share: chartData.spent ? (v.spend / chartData.spent) * 100 : 0, colour: v.colour }))}
													value={currency(chartData.spent, 0)} label={`Spent, ${periodWord}`}
													ariaLabel={`Vendor split of ${currency(chartData.spent, 0)}`} />
												<div className="chart-legend chart-legend-fill">
													{split.map(v => (
														/* The folded row names a count rather than a vendor, so it opens
														   the list where those vendors actually are instead of an
														   orders filter for a vendor that does not exist. */
														<LegendRow key={v.id ?? 'more'} colour={v.colour} title={v.name}
															amount={currency(v.spend, 0)}
															to={v.id ? `/orders/all?vendor=${v.id}` : '/vendors/all'} />
													))}
												</div>
											</>
										) : (
											/* Two absences, two answers, the rule every empty state on this page
											    already makes: with vendors on record the sentence names the window
											    that came up empty; with none at all, naming a window answers a
											    question nobody asked -- the real absence is that no vendor exists
											    yet. */
											<EmptyState>
												<p>{all.length
													? `Nothing spent ${periodWord}.`
													: 'Nothing spent yet. Your first order creates its vendor.'}</p>
											</EmptyState>
										)}
									</CardBody>
								</Card>
							)
						}}</Async>

						<Card aria-label="Favourites">
							<CardHeader title="Favourites"
								to={all.length ? '/vendors/all' : undefined}
								label="Favourites, open all vendors" />
							<CardDivider />
							<CardBody>
								{favourites.length ? (
									<FavouriteTileGrid>
										{favourites.map(vendor => (
											<FavouriteTile key={vendor.id}
												mark={<span className="entry-avatar"
													style={{ background: vendor.colour, color: inkOn(vendor.colour) }}>{vendor.initials}</span>}
												name={vendor.name} to={`/orders/all?vendor=${vendor.id}`}
												linkLabel={`${vendor.name}, open their orders`}
												meta={plural(vendor.orders, 'order')}
												amount={currency(vendor.spend, 0)} saved={`saved ${currency(vendor.saved, 0)}`} />
										))}
									</FavouriteTileGrid>
								) : (
									/* With vendors, the sentence names the next step and the button opens the
									   list a favourite is turned on from; with none there is no vendor to
									   favourite and nothing for the button to show, so neither claim is made. */
									<EmptyState>
										{all.length ? (
											<>
												<p>No favourites yet. Turn on Favourite when editing a vendor and it appears here.</p>
												<Button variant="block" to="/vendors/all">ALL VENDORS</Button>
											</>
										) : (
											<p>No vendors to favourite yet. Your first order creates its vendor.</p>
										)}
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
