import { Button, Card, CardBody, CardDivider, CardHeader, EntryRow } from 'spendly-react'

// A header is only ever the top band of a card, so every cell draws the card around it.
const side: React.CSSProperties = { width: 360 }

const bilka = { colour: '#1F6FEB', initials: 'BI' }
const netto = { colour: '#F4C025', initials: 'NE' }

const rows = (
	<>
		<EntryRow avatar={bilka} name="Bilka" meta="12 August" amount="1.284 kr." to="/orders/1" />
		<EntryRow avatar={netto} name="Netto" meta="9 August" amount="268 kr." to="/orders/2" />
	</>
)

export const Plain = () => (
	<div style={side}>
		<Card aria-label="Latest orders">
			<CardHeader title="Latest orders" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">{rows}</CardBody>
		</Card>
	</div>
)

export const Navigating = () => (
	<div style={side}>
		<Card aria-label="Spent • August 2026">
			<CardHeader title="Spent • August 2026" to="/stats"
				label="Spent, August 2026, open Statistics" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">{rows}</CardBody>
		</Card>
	</div>
)

export const WithControl = () => (
	<div style={side}>
		<Card aria-label="Vendors">
			<CardHeader title="Vendors • 12">
				<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
			</CardHeader>
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">{rows}</CardBody>
		</Card>
	</div>
)

export const Disclosure = () => (
	<div style={{ ...side, display: 'grid', gap: 16 }}>
		<Card aria-label="Filters open">
			<CardHeader title="Filters" onToggle={() => {}} open controls="filters-open" />
			<CardDivider />
			<CardBody id="filters-open" variant="entry-list card-body-tight">{rows}</CardBody>
		</Card>
		<Card aria-label="Filters closed">
			<CardHeader title="Filters" onToggle={() => {}} open={false} controls="filters-closed" />
		</Card>
	</div>
)
