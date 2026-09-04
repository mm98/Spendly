import { Card, CardBody, CardDivider, CardHeader, LegendRow, SpendGauge } from 'spendly-react'

/* Statistics' 170px ring. Same contract as Donut -- `segments` of `{ share, colour }`, a
   figure and a caption for the hole -- drawn larger, because on Statistics it is the card's
   subject rather than a summary above a list.

   It goes in a `ring-row` card body with its key beside it, both built from one array. */

const window2404 = [
	{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', share: 38.4, amount: '4.791 kr.', meta: '106% of budget' },
	{ id: 'c-household', name: 'Household', colour: '#8B5CF6', share: 21.2, amount: '2.644 kr.', meta: '88% of budget' },
	{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', share: 17.9, amount: '2.233 kr.', meta: 'No budget set' },
	{ id: 'c-transport', name: 'Transport', colour: '#2FA36B', share: 12.1, amount: '1.509 kr.', meta: '76% of budget' },
	{ id: 'c-home-office', name: 'Home office', colour: '#1FA8E0', share: 10.4, amount: '1.297 kr.', meta: 'No budget set' }
]

export const WhereItWent = () => (
	<Card aria-label="Where it went">
		<CardHeader title="Where it went • April 2024">
			<span className="field-help">monthly budgets</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="ring-row">
			<SpendGauge segments={window2404.map(e => ({ share: e.share, colour: e.colour }))}
				value="12.474 kr." label="April 2024"
				ariaLabel="Category split of 12.474 kr. in April 2024" />
			<div className="chart-legend chart-legend-fill">
				{window2404.map(e => (
					<LegendRow key={e.id} colour={e.colour} title={e.name} meta={e.meta} amount={e.amount}
						to={`/orders/all?category=${e.id}&from=2024-04-01&to=2024-04-30`} />
				))}
			</div>
		</CardBody>
	</Card>
)

/* An account with more categories than the card has rows folds its tail into one segment. The
   fold's share is the sum of everything inside it, so the ring still adds up to the figure in
   its middle -- dropping the tail instead would draw a circle that does not close. Its colour
   is a neutral grey no real entry is using, and its row opens the whole list rather than a
   filter for an id it has not got. */
const wholeYear = [
	{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', share: 41.2, amount: '41.208 kr.' },
	{ id: 'c-household', name: 'Household', colour: '#8B5CF6', share: 12.6, amount: '12.640 kr.' },
	{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', share: 9.8, amount: '9.845 kr.' },
	{ id: null, name: 'Without category', colour: '#45524C', share: 2.2, amount: '2.190 kr.' },
	{ id: 'more', name: 'Everything else', colour: '#8A968D', share: 34.2, amount: '34.117 kr.' }
]

export const WithFoldedTail = () => (
	<Card aria-label="Where it went">
		<CardHeader title="Where it went • 2023" />
		<CardDivider />
		<CardBody variant="ring-row">
			<SpendGauge segments={wholeYear.map(e => ({ share: e.share, colour: e.colour }))}
				value="100.000 kr." label="2023"
				ariaLabel="Category split of 100.000 kr. in 2023" />
			<div className="chart-legend chart-legend-fill">
				{wholeYear.map(e => (
					<LegendRow key={e.name} colour={e.colour} title={e.name} amount={e.amount}
						to={e.id === 'more' ? '/categories/all'
							: `/orders/all?category=${e.id ?? 'none'}&from=2023-01-01&to=2023-12-31`} />
				))}
			</div>
		</CardBody>
	</Card>
)

/* Without `segments` the gauge is a flat track with its figure still in the hole. A window
   with nothing spent in it gets an EmptyState on Statistics instead -- this is the
   component's own fallback, not a card to design. */
export const NoSegments = () => (
	<Card aria-label="Where it went">
		<CardHeader title="Where it went • May 2024" />
		<CardDivider />
		<CardBody variant="ring-row">
			<SpendGauge value="0 kr." label="May 2024" ariaLabel="Nothing spent in May 2024" />
		</CardBody>
	</Card>
)
