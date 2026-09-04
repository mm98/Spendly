import { Card, CardBody, CardDivider, CardHeader, EntryRow, SummaryRow } from 'spendly-react'

// The hairline is never drawn on its own: it separates a card's header from its body, or one
// block of a card from the next.
const side: React.CSSProperties = { width: 360 }

const bilka = { colour: '#1F6FEB', initials: 'BI' }
const netto = { colour: '#F4C025', initials: 'NE' }

export const UnderTheHeader = () => (
	<div style={side}>
		<Card aria-label="Latest orders">
			<CardHeader title="Latest orders" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow avatar={bilka} name="Bilka" meta="12 August" amount="1.284 kr." to="/orders/1" />
				<EntryRow avatar={netto} name="Netto" meta="9 August" amount="268 kr." to="/orders/2" />
			</CardBody>
		</Card>
	</div>
)

export const BetweenBlocks = () => (
	<div style={side}>
		<Card aria-label="Order details">
			<CardHeader title="Order details" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Vendor" value="Bilka" />
				<SummaryRow label="Date" value="12 August 2026" />
			</CardBody>
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Items" value="14" />
				<SummaryRow label="Total" value="1.284 kr." />
			</CardBody>
		</Card>
	</div>
)
