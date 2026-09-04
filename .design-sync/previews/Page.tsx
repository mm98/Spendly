import {
	AiCard, AiCardMark, Button, ButtonLink, Card, CardBody, CardDivider, CardHeader,
	EntryRow, KpiCard, Page, SavingChip
} from 'spendly-react'

const noop = () => {}

const kpiRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }

const OrdersCard = () => (
	<Card>
		<CardHeader title="Latest orders" to="/orders/all" label="Latest orders, open All orders" />
		<CardDivider />
		<CardBody variant="entry-list card-body-tight">
			<EntryRow to="/orders/1" avatar={{ colour: 'var(--donut-blue)', initials: 'BI' }}
				name="Bilka" meta="4 September • 12 items" amount="1.284,50 kr." sub="saved 148,00 kr." />
			<EntryRow to="/orders/2" avatar={{ colour: 'var(--donut-orange)', initials: 'NE' }}
				name="Netto" meta="2 September • 7 items" amount="342,95 kr." sub="saved 24,50 kr." />
			<EntryRow to="/orders/3" avatar={{ colour: 'var(--donut-purple)', initials: 'EL' }}
				name="Elgiganten" meta="29 August • 1 item" amount="4.499,00 kr." sub="saved 500,00 kr." />
		</CardBody>
	</Card>
)

/* No variant: the single column every detail, form and list page sits in. */
export const Overview = () => (
	<Page>
		<Card>
			<CardHeader title="Spent • September 2026" />
			<CardDivider />
			<CardBody>
				<div className="figure-card tabular-figures">12.480 kr.</div>
				<span className="card-caption">across 34 orders</span>
				<div style={{ marginTop: 10 }}><SavingChip>13,6% under retail</SavingChip></div>
			</CardBody>
		</Card>
		<OrdersCard />
	</Page>
)

/* variant="page-grid": what the five list pages write. Same single column as the default,
   said out loud. */
export const PageGrid = () => (
	<Page variant="page-grid">
		<div className="hero hero-panel">
			<h2>Every shop you buy from, in one place.</h2>
			<p>Vendors collect their orders, totals and savings automatically. Favourites stay on top.</p>
			<Button variant="caps" to="/vendors/new">ADD VENDOR</Button>
		</div>
		<div style={kpiRow}>
			<KpiCard label="Spent" amount={12480} delta="8% more than August" trend="up" tone="bad" />
			<KpiCard label="Saved" amount={1965} delta="3% more than August" trend="up" tone="good" />
			<KpiCard label="Orders" value="34" delta="6 fewer than August" trend="down" tone="neutral" />
			<KpiCard label="Vendors" value="12" note="2 are favourites" />
		</div>
	</Page>
)

/* variant="content-grid": the wide column and the rail beside it, which only Home uses.
   The stylesheet collapses this to one column at 1180px and the preview card is narrower
   than that, so the two tracks are pinned inline here to the exact values .content-grid
   declares above the breakpoint. Nothing else in this cell is styled by hand. */
export const WithSideRail = () => (
	<Page variant="content-grid"
		style={{ gridTemplateColumns: 'minmax(0,1.78fr) minmax(300px,1fr)' }}>
		<div className="content-column-main">
			<Card>
				<CardHeader title="Spent • September 2026" />
				<CardDivider />
				<CardBody>
					<div className="figure-card tabular-figures">12.480 kr.</div>
					<span className="card-caption">across 34 orders</span>
					<div style={{ marginTop: 10 }}><SavingChip>13,6% under retail</SavingChip></div>
				</CardBody>
			</Card>
			<OrdersCard />
		</div>
		<div className="content-column-side">
			<AiCard
				header={{ to: '/scan', title: 'Get receipts read for you',
					meta: 'Finish setting up Spendly', destination: 'Scan receipt' }}
				headline="Scan receipts, skip typing"
				body="A PDF, photo or screenshot becomes a draft order. You check every value before it is saved.">
				<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
				<ButtonLink className="button-link-invert" onClick={noop}>LATER</ButtonLink>
				<AiCardMark />
			</AiCard>
			<Card>
				<CardHeader title="Wishlist" to="/wishlist" label="Wishlist, open Wishlist" />
				<CardDivider />
				<CardBody variant="entry-list card-body-tight">
					<EntryRow glyph="cart" name="Robotstøvsuger" meta="Elgiganten" amount="2.799,00 kr." />
					<EntryRow glyph="cart" name="Løbehjul" meta="Bilka" amount="1.199,00 kr." />
				</CardBody>
			</Card>
		</div>
	</Page>
)
