import { Button, Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel, SummaryRow } from 'spendly-react'

// The uppercase label the app names a block with. Above a group of cards it sits inside a
// SectionHeader; inside a card, CardHeader already draws one from its `title`.
const column: React.CSSProperties = { width: 420, display: 'grid', gap: 12 }

export const AboveAGroupOfCards = () => (
	<div style={column}>
		<SectionHeader>
			<SectionLabel>Your cards</SectionLabel>
			<Button variant="pill" icon="pencil">EDIT</Button>
		</SectionHeader>
		<Card aria-label="Spending rhythm">
			<CardHeader title="Spending rhythm" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Average order" value="367 kr." />
				<SummaryRow label="Busiest day" value="Saturday" />
			</CardBody>
		</Card>
	</div>
)

export const WithoutAnAction = () => (
	<div style={column}>
		<SectionLabel>Your cards</SectionLabel>
		<Card aria-label="Top vendors">
			<CardHeader title="Top vendors" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Bilka" value="14.902 kr." />
				<SummaryRow label="Netto" value="3.480 kr." />
			</CardBody>
		</Card>
	</div>
)
