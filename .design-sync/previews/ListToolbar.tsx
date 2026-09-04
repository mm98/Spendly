import { Card, CardBody, CardDivider, CardHeader, EntityRow, ListToolbar, OrderRow } from 'spendly-react'

/* The band the four working lists open with: one search field, an optional FILTERS
   disclosure, and the app's one sort combobox.

   `searchRef` is where the chip row sends focus after a filter is removed. In a page it is a
   `useRef`; a preview passes the same plain object. */

const searchRef = { current: null }

const orderSorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'date-asc', label: 'Date, oldest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'amount-asc', label: 'Amount, lowest' },
	{ id: 'discount-desc', label: 'Discount, highest' }
]

const vendorSorts = [
	{ id: 'name-asc', label: 'Name, A to Z' },
	{ id: 'spend-desc', label: 'Spend, highest' },
	{ id: 'spend-asc', label: 'Spend, lowest' },
	{ id: 'orders-desc', label: 'Orders, most' },
	{ id: 'saved-desc', label: 'Saved, highest' }
]

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

/* All vendors and All categories: the toolbar sits bare on the page, above the list's card. */
export const AboveAList = () => (
	<div>
		<ListToolbar query="" onQuery={() => {}} searchRef={searchRef}
			placeholder="Search by vendor name or other name..." label="Search vendors"
			sortLabel="Sort vendors" sorts={vendorSorts} sortValue="Name, A to Z" onSort={() => {}} />
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
			</CardBody>
		</Card>
	</div>
)

/* All orders: the toolbar lives inside a filters card, and `filters` adds the disclosure
   button that opens the panel below it. Pass `filters` only where there is a panel -- a list
   whose only filter is the keyword must not draw a control over an empty one. */
export const WithFilters = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<ListToolbar query="" onQuery={() => {}} searchRef={searchRef}
				placeholder="Search vendor, note or item text..." label="Search orders"
				sortLabel="Sort orders" sorts={orderSorts} sortValue="Date, newest" onSort={() => {}}
				filters={{ open: false, panelId: 'filter-panel', onToggle: () => {} }} />
		</CardBody>
	</Card>
)

/* With the panel open the disclosure's chevron points up. The panel itself is a
   FilterSection below the toolbar, holding the page's own fields. */
export const FiltersOpen = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<ListToolbar query="" onQuery={() => {}} searchRef={searchRef}
				placeholder="Search vendor, note or item text..." label="Search orders"
				sortLabel="Sort orders" sorts={orderSorts} sortValue="Amount, highest" onSort={() => {}}
				filters={{ open: true, panelId: 'filter-panel', onToggle: () => {} }} />
		</CardBody>
	</Card>
)

/* Searching: the keyword is the field's value, and the count in the card header below says
   how much of the list it is holding back. */
export const Searching = () => (
	<div>
		<Card aria-label="Search and filters">
			<CardBody variant="card-body-filters">
				<ListToolbar query="kaffe" onQuery={() => {}} searchRef={searchRef}
					placeholder="Search vendor, note or item text..." label="Search orders"
					sortLabel="Sort orders" sorts={orderSorts} sortValue="Date, newest" onSort={() => {}}
					filters={{ open: false, panelId: 'filter-panel', onToggle: () => {} }} />
			</CardBody>
		</Card>
		<Card aria-label="Orders">
			<CardHeader title="Orders • 2 matches" />
			<CardDivider />
			<CardBody variant="card-body-tight">
				<OrderRow to="/orders/o-1" order={{ id: 'o-1', date: '2026-09-02', dateLabel: '2 Sep',
					status: 'Delivered', vendor: { id: 'v-bilka', name: 'Bilka', initials: 'BI', colour: '#877364' },
					categories: [{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart' }],
					itemCount: 18, total: 742.45, saved: 38.5 }} />
				<OrderRow to="/orders/o-5" order={{ id: 'o-5', date: '2026-08-31', dateLabel: '31 Aug',
					status: 'Delivered', vendor: { id: 'v-foetex', name: 'Føtex', initials: 'FØ', colour: '#177DA7' },
					categories: [{ id: 'c-groceries', name: 'Groceries', colour: '#C43F2A', icon: 'cart' }],
					itemCount: 9, total: 284.1, saved: 12 }} />
			</CardBody>
		</Card>
	</div>
)
