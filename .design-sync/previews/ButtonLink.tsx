import {
	AiCard, AiCardMark, Button, ButtonLink, Card, CardBody, CardDivider, CardHeader,
	Chip, EmptyState
} from 'spendly-react'

const noop = () => {}

/* Its weight against the text it sits in: heavier and underlined, so it reads as the one
   thing on the line that can be pressed. */
export const BesideBodyText = () => (
	<Card>
		<CardHeader title="Order history" />
		<CardDivider />
		<CardBody>
			<p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, maxWidth: '52ch' }}>
				Every change to this order is kept, with the date it was made and what it changed
				from. Nothing is thrown away when you edit an order.
			</p>
			<ButtonLink onClick={noop}>SHOW HISTORY</ButtonLink>
		</CardBody>
	</Card>
)

/* The way out of an empty list. `to` makes it a router link; without it, a real button. */
export const InAnEmptyState = () => (
	<Card>
		<CardHeader title="Orders" />
		<CardDivider />
		<CardBody>
			<EmptyState>
				<p>No orders yet. Add one and your spending appears here.</p>
				<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
			</EmptyState>
		</CardBody>
	</Card>
)

/* Closing out a set of filters, at the end of the row it clears. */
export const NextToFilters = () => (
	<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
		<Chip label="Remove filter Bilka" onRemove={noop}>Bilka</Chip>
		<Chip label="Remove filter Delivered" onRemove={noop}>Delivered</Chip>
		<span style={{ marginLeft: 6 }}><ButtonLink onClick={noop}>CLEAR ALL</ButtonLink></span>
	</div>
)

/* On the dark card, where the plain ink would disappear: `button-link-invert` is the one
   extra class it takes. */
export const OnADarkCard = () => (
	<div style={{ maxWidth: 340 }}>
		<AiCard
			header={{ to: '/scan', title: 'Get receipts read for you',
				meta: 'Finish setting up Spendly', destination: 'Scan receipt' }}
			headline="Scan receipts, skip typing"
			body="A PDF, photo or screenshot becomes a draft order. You check every value before it is saved.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<ButtonLink className="button-link-invert" onClick={noop}>LATER</ButtonLink>
			<AiCardMark />
		</AiCard>
	</div>
)
