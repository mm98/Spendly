import { Button, Card, CardBody, CardDivider, CardHeader, EntryRow } from 'spendly-react'

/* Latest orders (Orders overview) and Top vendors / Favourite vendors (Home) are the same
   row: a coloured mark, two lines of text, a figure and what it saved under it.

   Every cell composes inside a CardBody carrying `entry-list`, because that is where the
   row's type sizes, its meta line and its right-hand figure are declared -- an EntryRow
   outside one renders at the wrong size. That is the app's own composition, from
   pages/Orders.jsx and pages/Home.jsx. */

const bilka = { initials: 'BI', colour: '#877364' }
const netto = { initials: 'NE', colour: '#3E5C8A' }
const foetex = { initials: 'FØ', colour: '#177DA7' }
const elgiganten = { initials: 'EL', colour: '#AD620D' }
const matas = { initials: 'MA', colour: '#8453F5' }

export const LatestOrders = () => (
	<Card aria-label="Latest orders">
		<CardHeader title="Latest orders" />
		<CardDivider />
		<CardBody variant="entry-list card-body-tight">
			<EntryRow avatar={bilka} name="Bilka" meta="2 Sep" amount="742,45 kr."
				sub="saved 38,50 kr." to="/orders/o-1" />
			<EntryRow avatar={elgiganten} name="Elgiganten" meta="29 Aug" amount="2.499,00 kr."
				sub="saved 500,00 kr." to="/orders/o-2" />
			<EntryRow avatar={netto} name="Netto" meta="27 Aug" amount="318,95 kr."
				sub="saved 0,00 kr." to="/orders/o-3" />
			<EntryRow avatar={matas} name="Matas" meta="24 Aug" amount="429,50 kr."
				sub="saved 64,25 kr." to="/orders/o-4" />
			<Button variant="block" to="/orders/all">SEE ALL</Button>
		</CardBody>
	</Card>
)

export const TopVendors = () => (
	<Card aria-label="Top vendors">
		<CardHeader title="Top vendors" to="/vendors" label="Top vendors, open Vendors" />
		<CardDivider />
		<CardBody variant="entry-list">
			<EntryRow avatar={bilka} name="Bilka" meta="34 orders" amount="18.420 kr."
				sub="saved 1.965 kr." to="/orders/all?vendor=v-bilka" />
			<EntryRow avatar={elgiganten} name="Elgiganten" meta="6 orders" amount="12.480 kr."
				sub="saved 1.240 kr." to="/orders/all?vendor=v-elgiganten" />
			<EntryRow avatar={foetex} name="Føtex" meta="21 orders" amount="7.310 kr."
				sub="saved 402 kr." to="/orders/all?vendor=v-foetex" />
			<EntryRow avatar={netto} name="Netto" meta="18 orders" amount="5.940 kr."
				sub="saved 128 kr." to="/orders/all?vendor=v-netto" />
		</CardBody>
	</Card>
)

/* A row with nothing behind it goes nowhere: no chevron, and it is a plain block rather than
   a link. Keep linked and unlinked rows in separate lists -- a list holding both leaves a
   chevron-width gap on the rows that have none, so the names stay in one column. */
export const WithoutDestination = () => (
	<Card aria-label="Returns this month">
		<CardHeader title="Returns • August" />
		<CardDivider />
		<CardBody variant="entry-list card-body-tight">
			<EntryRow avatar={elgiganten} name="Elgiganten" meta="21 Aug • refunded in full"
				amount="1.299,00 kr." sub="saved 0,00 kr." />
			<EntryRow avatar={matas} name="Matas" meta="14 Aug" amount="249,95 kr."
				sub="saved 25,00 kr." />
			<EntryRow avatar={bilka} name="Bilka" meta="9 Aug" amount="86,50 kr."
				sub="saved 4,25 kr." />
		</CardBody>
	</Card>
)

/* `glyph` replaces the avatar where the row stands for something that has no record colour
   of its own -- an Icon name on the neutral tile, instead of a vendor's initials. */
export const NeutralGlyphs = () => (
	<Card aria-label="This month">
		<CardHeader title="This month" />
		<CardDivider />
		<CardBody variant="entry-list card-body-tight">
			<EntryRow glyph="receipt" name="Orders" meta="34 in September" amount="12.480 kr." />
			<EntryRow glyph="store" name="Vendors" meta="7 shops" amount="1.783 kr." />
			<EntryRow glyph="scan" name="Scanned receipts" meta="12 read" amount="4.209 kr." />
		</CardBody>
	</Card>
)
