import { Card, CardBody, CardDivider, CardHeader, CategoryRow, Donut, DonutBox, LegendRow } from 'spendly-react'

/* The 132px ring on Home, Orders and Categories. It takes `segments` -- `{ share, colour }`,
   shares in percent -- plus the figure and the caption that sit in its hole. It draws no
   legend of its own: the rows beside or under it are built from the same array, which is what
   keeps the arcs and the rows from disagreeing. */

const split = [
	{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart', share: 38.4, spend: 4791, amount: '4.791 kr.' },
	{ id: 'c-household', name: 'Household', colour: '#8B5CF6', icon: 'home', share: 21.2, spend: 2644, amount: '2.644 kr.' },
	{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', icon: 'plug', share: 17.9, spend: 2233, amount: '2.233 kr.' },
	{ id: 'c-transport', name: 'Transport', colour: '#2FA36B', icon: 'tag', share: 12.1, spend: 1509, amount: '1.509 kr.' },
	{ id: 'c-home-office', name: 'Home office', colour: '#1FA8E0', icon: 'display', share: 10.4, spend: 1297, amount: '1.297 kr.' }
]

/* Home's category card: the ring centred in a DonutBox, the rows it names underneath. */
export const CategoryBreakdown = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<DonutBox>
				<Donut segments={split.map(c => ({ share: c.share, colour: c.colour }))}
					value="12.474 kr." label="Spent this month"
					ariaLabel="Category split of 12.474 kr. this month" />
			</DonutBox>
			<div className="category-rows">
				{split.map(c => (
					<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />
				))}
			</div>
		</CardBody>
	</Card>
)

/* Beside its key instead of above it: a `ring-row` body puts the ring and a
   `chart-legend chart-legend-fill` block side by side, and stacks them below 900px. */
export const BesideItsKey = () => (
	<Card aria-label="Where it went">
		<CardHeader title="Where it went • April 2024" />
		<CardDivider />
		<CardBody variant="ring-row">
			<Donut segments={split.map(c => ({ share: c.share, colour: c.colour }))}
				value="12.474 kr." label="April 2024"
				ariaLabel="Category split of 12.474 kr. in April 2024" />
			<div className="chart-legend chart-legend-fill">
				{split.map(c => (
					<LegendRow key={c.id} colour={c.colour} title={c.name}
						amount={c.amount}
						to={`/orders/all?category=${c.id}&from=2024-04-01&to=2024-04-30`} />
				))}
			</div>
		</CardBody>
	</Card>
)

/* One segment fills the whole ring with no separator in it -- a gap sits between two
   segments, so a lone slice has nothing to be separated from.

   The figure in the hole shrinks itself to whatever the circle can hold, so a seven-digit
   total stays inside the ring instead of lying across the arcs. Nothing has to be shortened
   by the caller. */
export const SingleSegment = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<DonutBox>
				<Donut segments={[{ share: 100, colour: '#C43F2A' }]}
					value="1.284.905 kr." label="Spent all time"
					ariaLabel="Category split of 1.284.905 kr., all of it Groceries" />
			</DonutBox>
			<div className="category-rows">
				<CategoryRow category={{ ...split[0], share: 100, spend: 1284905 }}
					to="/orders/all?category=c-groceries" />
			</div>
		</CardBody>
	</Card>
)

/* Without `segments` the ring draws no arcs at all: a flat track with the figure still in it.
   The app reaches for an EmptyState instead when a month has nothing in it, because a grey
   circle is a split of nothing -- this is what the component falls back to, not a state to
   design a card around. */
export const NoSegments = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<DonutBox>
				<Donut value="0 kr." label="Spent this month"
					ariaLabel="Nothing spent this month" />
			</DonutBox>
		</CardBody>
	</Card>
)
