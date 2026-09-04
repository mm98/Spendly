import { Card, CardBody, CardDivider, CardHeader, CategoryRow, Donut, DonutBox } from 'spendly-react'

/* The wrapper that centres a ring in a card body and sets the small lead-in above it. It has
   no other job: one child, the ring, and whatever names the ring's segments goes under the
   box rather than inside it. */

const split = [
	{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart', share: 42.9, spend: 4791 },
	{ id: 'c-household', name: 'Household', colour: '#8B5CF6', icon: 'home', share: 23.6, spend: 2644 },
	{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', icon: 'plug', share: 20.0, spend: 2233 },
	{ id: 'c-transport', name: 'Transport', colour: '#2FA36B', icon: 'tag', share: 13.5, spend: 1509 }
]

const segments = split.map(c => ({ share: c.share, colour: c.colour }))

/* Home's and Orders' category card: the ring centred over the rows that name its slices. */
export const CentredRing = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<DonutBox>
				<Donut segments={segments} value="11.177 kr." label="Spent this month"
					ariaLabel="Category split of 11.177 kr. this month" />
			</DonutBox>
			<div className="category-rows">
				{split.map(c => <CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
			</div>
		</CardBody>
	</Card>
)

/* The same card with the ring left in the body on its own. A card body is a stacked block, so
   the ring sits against the left edge and the rows below it no longer line up on a centre --
   this is the reason the box exists, not a second layout to choose between. */
export const WithoutTheBox = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<Donut segments={segments} value="11.177 kr." label="Spent this month"
				ariaLabel="Category split of 11.177 kr. this month" />
			<div className="category-rows">
				{split.map(c => <CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
			</div>
		</CardBody>
	</Card>
)
