import { Button, ButtonLink, Card, CardBody, CardDivider, CardHeader, EmptyState } from 'spendly-react'

// An empty state is an answer a card gives in place of its rows, so it is drawn inside one.
const side: React.CSSProperties = { width: 360 }

export const NoOrdersYet = () => (
	<div style={side}>
		<Card aria-label="Orders">
			<CardHeader title="Orders" to="/orders" label="Orders, open Orders" />
			<CardDivider />
			<CardBody>
				<EmptyState>
					<p>No orders yet. Add one and your spending appears here.</p>
					<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
				</EmptyState>
			</CardBody>
		</Card>
	</div>
)

export const NothingSpentYet = () => (
	<div style={side}>
		<Card aria-label="Breakdown • this month">
			<CardHeader title="Breakdown • this month" />
			<CardDivider />
			<CardBody>
				<EmptyState icon="chart">
					<p>Nothing spent in August yet. Add categories to an order to see the split here.</p>
					<Button variant="block" to="/categories">ALL CATEGORIES</Button>
				</EmptyState>
			</CardBody>
		</Card>
	</div>
)

export const NoFavourites = () => (
	<div style={side}>
		<Card aria-label="Favourites">
			<CardHeader title="Favourites" />
			<CardDivider />
			<CardBody>
				<EmptyState icon="starFilled">
					<p>No favourites yet. Turn on Favourite when editing a category and it appears here.</p>
				</EmptyState>
			</CardBody>
		</Card>
	</div>
)

export const NoMatches = () => (
	<div style={side}>
		<Card aria-label="All orders">
			<CardHeader title="All orders • 0 of 34" />
			<CardDivider />
			<CardBody>
				<EmptyState>
					<p>No orders match these filters.</p>
					<ButtonLink>CLEAR ALL</ButtonLink>
				</EmptyState>
			</CardBody>
		</Card>
	</div>
)
