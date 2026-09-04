import { Card, CardBody, CardDivider, CardHeader, Donut, LegendRow } from 'spendly-react'

/* A ring's key, where every entry is also the way into the orders behind it. The app draws it
   as a `chart-legend chart-legend-fill` block beside the ring, inside a `ring-row` CardBody --
   ring and key are built from one array, so the arcs and the rows cannot disagree. */

const split = [
	{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', amount: '4.791 kr.', share: 38.4 },
	{ id: 'c-household', name: 'Household', colour: '#8B5CF6', amount: '2.644 kr.', share: 21.2 },
	{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', amount: '2.233 kr.', share: 17.9 },
	{ id: 'c-transport', name: 'Transport', colour: '#2FA36B', amount: '1.509 kr.', share: 12.1 },
	{ id: 'c-home-office', name: 'Home office', colour: '#1FA8E0', amount: '1.297 kr.', share: 10.4 }
]

export const CategorySplit = () => (
	<Card aria-label="Breakdown">
		<CardHeader title="Breakdown • this month" to="/categories/all"
			label="Breakdown, open all categories" />
		<CardDivider />
		<CardBody variant="ring-row">
			<Donut segments={split.map(c => ({ share: c.share, colour: c.colour }))}
				value="12.474 kr." label="Spent, this month"
				ariaLabel="Category split of 12.474 kr. this month" />
			<div className="chart-legend chart-legend-fill">
				{split.map(c => (
					<LegendRow key={c.id} colour={c.colour} title={c.name}
						amount={c.amount}
						to={`/orders/all?category=${c.id}`} />
				))}
			</div>
		</CardBody>
	</Card>
)

/* `meta` is a second line under the title, drawn only on the rows that have one to draw. A
   row with nothing to add stays the single-line row every other key is. */
export const WithMeta = () => (
	<Card aria-label="Where the money went">
		<CardHeader title="Where the money went • August" />
		<CardDivider />
		<CardBody>
			<div className="chart-legend">
				<LegendRow colour="#C43F2A" title="Groceries" meta="88% of a 4.500 kr. budget"
					amount="3.980 kr." to="/orders/all?category=c-groceries&from=2026-08-01&to=2026-08-31" />
				<LegendRow colour="#8B5CF6" title="Household" meta="56% of a 900 kr. budget"
					amount="505 kr." to="/orders/all?category=c-household&from=2026-08-01&to=2026-08-31" />
				<LegendRow colour="#E9C517" title="Electronics" meta="no budget set"
					amount="2.233 kr." to="/orders/all?category=c-electronics&from=2026-08-01&to=2026-08-31" />
				<LegendRow colour="#2FA36B" title="Transport"
					amount="1.509 kr." to="/orders/all?category=c-transport&from=2026-08-01&to=2026-08-31" />
			</div>
		</CardBody>
	</Card>
)

/* The tail of a long split folds into one grey row standing for several categories at once,
   so it opens the list they are all on rather than a filter for a single id. "Without
   category" is the remainder with no category at all, and filters as `none`. */
export const FoldedTail = () => (
	<Card aria-label="Breakdown">
		<CardHeader title="Breakdown • this year" />
		<CardDivider />
		<CardBody>
			<div className="chart-legend">
				<LegendRow colour="#C43F2A" title="Groceries" amount="41.208 kr."
					to="/orders/all?category=c-groceries" />
				<LegendRow colour="#8B5CF6" title="Household" amount="12.640 kr."
					to="/orders/all?category=c-household" />
				<LegendRow colour="#E9C517" title="Electronics" amount="9.845 kr."
					to="/orders/all?category=c-electronics" />
				<LegendRow colour="#45524C" title="Without category" amount="2.190 kr."
					to="/orders/all?category=none" />
				<LegendRow colour="#8A968D" title="Everything else" amount="6.702 kr."
					to="/categories/all" />
			</div>
		</CardBody>
	</Card>
)
