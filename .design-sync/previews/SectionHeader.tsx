import { Button, Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel, SummaryRow } from 'spendly-react'

// The band above a group of cards: a label on the left, the actions for the whole group on
// the right. It sits outside the cards, not inside one.
const column: React.CSSProperties = { width: 420, display: 'grid', gap: 12 }

export const LabelAndOneAction = () => (
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

export const WhileEditing = () => (
	<div style={column}>
		<SectionHeader>
			<SectionLabel>Your cards</SectionLabel>
			<span className="row-inline">
				<Button variant="caps compact" icon="check">DONE</Button>
				<Button variant="pill">CANCEL</Button>
			</span>
		</SectionHeader>
		<Card aria-label="Spending rhythm">
			<CardHeader title="Spending rhythm" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Average order" value="367 kr." />
			</CardBody>
		</Card>
	</div>
)
