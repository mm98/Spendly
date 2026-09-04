import { Button, Card, CardBody, CardDivider, CardHeader, CategoryRow } from 'spendly-react'

/* The rows beside the breakdown ring on Orders and Home, and the budget rows on Categories.

   The row takes the whole category record and reads four fields off it: `colour` and `icon`
   for the tile, `name`, `spend` for the figure, and `share` for the default meta line. The
   app always puts them in a `category-rows` block inside a CardBody -- that is the grid that
   keeps the tiles, names and figures in three columns down the card. */

const groceries = { id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart', share: 38.4, spend: 4791 }
const household = { id: 'c-household', name: 'Household', colour: '#8B5CF6', icon: 'home', share: 21.2, spend: 2644 }
const electronics = { id: 'c-electronics', name: 'Electronics', colour: '#E9C517', icon: 'plug', share: 17.9, spend: 2233 }
const transport = { id: 'c-transport', name: 'Transport', colour: '#D34F2E', icon: 'tag', share: 12.1, spend: 1509 }
const homeOffice = { id: 'c-home-office', name: 'Home office', colour: '#1FA8E0', icon: 'display', share: 10.4, spend: 1297 }

export const MonthBreakdown = () => (
	<Card aria-label="Category breakdown">
		<CardHeader title="Category breakdown" />
		<CardDivider />
		<CardBody>
			<div className="category-rows">
				<CategoryRow category={groceries} to="/orders/all?category=c-groceries" />
				<CategoryRow category={household} to="/orders/all?category=c-household" />
				<CategoryRow category={electronics} to="/orders/all?category=c-electronics" />
				<CategoryRow category={transport} to="/orders/all?category=c-transport" />
			</div>
			<Button variant="block" to="/categories">ALL CATEGORIES</Button>
		</CardBody>
	</Card>
)

/* `meta` replaces the "x% of expenses" line the row writes for itself. On Categories the
   month's spend is passed as `spend` and the meta names the budget it is measured against,
   so the figure and the sentence describe the same stretch of time. */
export const AgainstBudget = () => (
	<Card aria-label="Against budget">
		<CardHeader title="Against budget • September" to="/categories/all"
			label="Against budget, open all categories" />
		<CardDivider />
		<CardBody>
			<div className="category-rows">
				<CategoryRow category={{ ...groceries, spend: 3980 }}
					meta="88% of a 4.500 kr. budget" to="/orders/all?category=c-groceries" />
				<CategoryRow category={{ ...electronics, spend: 1240 }}
					meta="69% of a 1.800 kr. budget" to="/orders/all?category=c-electronics" />
				<CategoryRow category={{ ...household, spend: 505 }}
					meta="56% of a 900 kr. budget" to="/orders/all?category=c-household" />
				<CategoryRow category={{ ...homeOffice, spend: 210 }}
					meta="30% of a 700 kr. budget" to="/orders/all?category=c-home-office" />
			</div>
			<span className="field-help field-help-below">Budgets are set on a category's own page.</span>
		</CardBody>
	</Card>
)

/* Without `to` the row is a block, not a link, and draws no chevron. */
export const WithoutDestination = () => (
	<Card aria-label="Categories on this order">
		<CardHeader title="Categories on this order" />
		<CardDivider />
		<CardBody>
			<div className="category-rows">
				<CategoryRow category={{ ...groceries, share: 62.5, spend: 464 }} />
				<CategoryRow category={{ ...household, share: 37.5, spend: 278 }} />
			</div>
		</CardBody>
	</Card>
)
