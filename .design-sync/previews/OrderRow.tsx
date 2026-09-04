import { Card, CardBody, CardDivider, CardHeader, OrderRow } from 'spendly-react'

/* The All orders row. It takes the whole order record and lays it out in four columns:
   vendor identity, status, the total with what it saved under it, and the chevron.

   `dateLabel` is the one field the page adds: the API sends `date` as an ISO day, and the
   page formats it before handing the record over. */

const order = (o) => ({ itemCount: 1, categories: [], saved: 0, ...o })

const bilka = { id: 'v-bilka', name: 'Bilka', initials: 'BI', colour: '#877364' }
const netto = { id: 'v-netto', name: 'Netto', initials: 'NE', colour: '#3E5C8A' }
const elgiganten = { id: 'v-elgiganten', name: 'Elgiganten', initials: 'EL', colour: '#AD620D' }
const matas = { id: 'v-matas', name: 'Matas', initials: 'MA', colour: '#8453F5' }
const foetex = { id: 'v-foetex', name: 'Føtex', initials: 'FØ', colour: '#177DA7' }

const groceries = { id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart' }
const household = { id: 'c-household', name: 'Household', colour: '#8B5CF6', icon: 'home' }
const electronics = { id: 'c-electronics', name: 'Electronics', colour: '#E9C517', icon: 'plug' }

export const AllOrders = () => (
	<Card aria-label="Orders">
		<CardHeader title="Orders • 24 matches" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<OrderRow to="/orders/o-1" order={order({ id: 'o-1', date: '2026-09-02', dateLabel: '2 Sep',
				status: 'Delivered', vendor: bilka, categories: [groceries, household],
				itemCount: 18, total: 742.45, saved: 38.5 })} />
			<OrderRow to="/orders/o-2" order={order({ id: 'o-2', date: '2026-08-29', dateLabel: '29 Aug',
				status: 'Delivered', vendor: elgiganten, categories: [electronics],
				itemCount: 2, total: 2499, saved: 500 })} />
			<OrderRow to="/orders/o-3" order={order({ id: 'o-3', date: '2026-08-27', dateLabel: '27 Aug',
				status: 'Ordered', vendor: netto, categories: [groceries],
				itemCount: 11, total: 318.95, saved: 0 })} />
			<OrderRow to="/orders/o-4" order={order({ id: 'o-4', date: '2026-08-24', dateLabel: '24 Aug',
				status: 'Returned', vendor: matas, categories: [household],
				itemCount: 4, total: 429.5, saved: 64.25 })} />
		</CardBody>
	</Card>
)

/* The status column carries the record's own word, one of Ordered, Delivered or Returned. */
export const Statuses = () => (
	<Card aria-label="Orders">
		<CardHeader title="Orders • 3 matches" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<OrderRow to="/orders/o-5" order={order({ id: 'o-5', date: '2026-09-03', dateLabel: '3 Sep',
				status: 'Ordered', vendor: foetex, categories: [groceries],
				itemCount: 9, total: 284.1, saved: 12 })} />
			<OrderRow to="/orders/o-1" order={order({ id: 'o-1', date: '2026-09-02', dateLabel: '2 Sep',
				status: 'Delivered', vendor: bilka, categories: [groceries, household],
				itemCount: 18, total: 742.45, saved: 38.5 })} />
			<OrderRow to="/orders/o-4" order={order({ id: 'o-4', date: '2026-08-24', dateLabel: '24 Aug',
				status: 'Returned', vendor: matas, categories: [household],
				itemCount: 4, total: 429.5, saved: 64.25 })} />
		</CardBody>
	</Card>
)

/* An order with no categories on it drops that part of the meta line and keeps everything
   else. The saved line is always drawn, "saved 0,00 kr." included, so the total column keeps
   one shape all the way down the list. */
export const SparseRecords = () => (
	<Card aria-label="Orders">
		<CardHeader title="Orders • 3 matches" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<OrderRow to="/orders/o-6" order={order({ id: 'o-6', date: '2026-08-21', dateLabel: '21 Aug',
				status: 'Delivered', vendor: netto, itemCount: 1, total: 86.5, saved: 0 })} />
			<OrderRow to="/orders/o-7" order={order({ id: 'o-7', date: '2026-08-18', dateLabel: '18 Aug',
				status: 'Delivered', vendor: foetex, itemCount: 6, total: 194.75, saved: 0 })} />
			<OrderRow to="/orders/o-8" order={order({ id: 'o-8', date: '2026-08-12', dateLabel: '12 Aug',
				status: 'Ordered', vendor: bilka, categories: [groceries],
				itemCount: 24, total: 1284.5, saved: 121.4 })} />
		</CardBody>
	</Card>
)
