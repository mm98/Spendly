import { Card, CardBody, CardDivider, CardHeader, EntityRow, ListState, OrderRow, Pager } from 'spendly-react'

/* ListState draws nothing of its own. It wraps a listing page in the route table and
   remembers that list's query string for the length of the visit, so arriving on a bare URL
   puts back the search, sort, page and filters the reader last had. With a query string in
   the URL, or with nothing remembered yet, it renders its children untouched -- which is
   what both cells below show.

   There is no visual state to preview: the restore is a redirect during render, and it
   happens before anything paints. What the cells prove is that the wrapper is transparent --
   the list looks the same wrapped as unwrapped. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

export const AroundTheVendorList = () => (
	<ListState name="all-vendors">
		<Card aria-label="All vendors">
			<CardHeader title="Vendors • 12" />
			<CardDivider />
			<CardBody variant="card-body-tight">
				<EntityRow mark={avatar('BI', '#877364')} name="Bilka" meta="34 orders"
					amount="18.420 kr." sub="saved 1.965 kr." editTo="/vendors/v-bilka/edit" />
				<EntityRow mark={avatar('EL', '#AD620D')} name="Elgiganten" meta="6 orders"
					amount="12.480 kr." sub="saved 1.240 kr." editTo="/vendors/v-elgiganten/edit" />
				<EntityRow mark={avatar('FØ', '#177DA7')} name="Føtex" meta="21 orders"
					amount="7.310 kr." sub="saved 402 kr." editTo="/vendors/v-foetex/edit" />
				<Pager from={1} to={3} matched={12} page={1} pages={4} onPage={() => {}} />
			</CardBody>
		</Card>
	</ListState>
)

export const AroundTheOrderList = () => (
	<ListState name="all-orders">
		<Card aria-label="Orders">
			<CardHeader title="Orders • 24 matches" />
			<CardDivider />
			<CardBody variant="card-body-tight">
				<OrderRow to="/orders/o-1" order={{ id: 'o-1', date: '2026-09-02', dateLabel: '2 Sep',
					status: 'Delivered', vendor: { id: 'v-bilka', name: 'Bilka', initials: 'BI', colour: '#877364' },
					categories: [{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart' }],
					itemCount: 18, total: 742.45, saved: 38.5 }} />
				<OrderRow to="/orders/o-2" order={{ id: 'o-2', date: '2026-08-29', dateLabel: '29 Aug',
					status: 'Delivered', vendor: { id: 'v-elgiganten', name: 'Elgiganten', initials: 'EL', colour: '#AD620D' },
					categories: [{ id: 'c-electronics', name: 'Electronics', colour: '#E9C517', icon: 'plug' }],
					itemCount: 2, total: 2499, saved: 500 }} />
				<OrderRow to="/orders/o-3" order={{ id: 'o-3', date: '2026-08-27', dateLabel: '27 Aug',
					status: 'Ordered', vendor: { id: 'v-netto', name: 'Netto', initials: 'NE', colour: '#3E5C8A' },
					categories: [{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart' }],
					itemCount: 11, total: 318.95, saved: 0 }} />
				<Pager from={1} to={3} matched={24} page={1} pages={8} onPage={() => {}} />
			</CardBody>
		</Card>
	</ListState>
)
