import { Card, CardBody, CardDivider, CardHeader, FilterChips, ListToolbar, OrderRow, Page } from 'spendly-react'

/* The row of chips under the toolbar, one per filter that is actually on. A chip is the only
   place a filter is stored, so removing one turns that filter off and the count above the
   list moves. With no filters on, the whole row renders nothing -- there is no empty state
   for it and no cell here can show one.

   The chips are derived from the query string by the page, never held by this component:
   each carries a `key` and the `label` the reader sees. */

const searchRef = { current: null }

const orderSorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'discount-desc', label: 'Discount, highest' }
]

export const UnderTheToolbar = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<ListToolbar query="" onQuery={() => {}} searchRef={searchRef}
				placeholder="Search vendor, note or item text..." label="Search orders"
				sortLabel="Sort orders" sorts={orderSorts} sortValue="Date, newest" onSort={() => {}}
				filters={{ open: false, panelId: 'filter-panel', onToggle: () => {} }} />
			<FilterChips focusRef={searchRef} onRemove={() => {}} onClearAll={() => {}}
				chips={[
					{ key: 'dates', label: '1 Aug - 31 Aug' },
					{ key: 'status', label: 'Delivered' },
					{ key: 'vendor', label: 'Vendor: Bilka' },
					{ key: 'category', label: 'Category: Groceries' }
				]} />
		</CardBody>
	</Card>
)

/* One filter on: the chip and CLEAR ALL, which is drawn whenever there is at least one. */
export const OneFilter = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<FilterChips focusRef={searchRef} onRemove={() => {}} onClearAll={() => {}}
				chips={[{ key: 'vendor', label: 'Vendor: Elgiganten' }]} />
		</CardBody>
	</Card>
)

/* Several filters at once, one chip each, in the order the page derives them: dates, status,
   vendor, category, kind, then the amount bounds. A chip long enough to crowd the row cuts
   its own label rather than the row scrolling. */
export const ManyFilters = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<FilterChips focusRef={searchRef} onRemove={() => {}} onClearAll={() => {}}
				chips={[
					{ key: 'dates', label: '1 Aug - 31 Aug' },
					{ key: 'status', label: 'Returned' },
					{ key: 'vendor', label: 'Vendor: Matas' },
					{ key: 'kind', label: 'Gift' },
					{ key: 'min', label: 'From 100 kr.' }
				]} />
		</CardBody>
	</Card>
)

/* What the reader actually sees: the chips name the filters, and the list under them holds
   only what is left. */
export const OverTheList = () => (
	<Page>
		<Card aria-label="Search and filters">
			<CardBody variant="card-body-filters">
				<FilterChips focusRef={searchRef} onRemove={() => {}} onClearAll={() => {}}
					chips={[
						{ key: 'vendor', label: 'Vendor: Bilka' },
						{ key: 'status', label: 'Delivered' }
					]} />
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
				<OrderRow to="/orders/o-8" order={{ id: 'o-8', date: '2026-08-12', dateLabel: '12 Aug',
					status: 'Delivered', vendor: { id: 'v-bilka', name: 'Bilka', initials: 'BI', colour: '#877364' },
					categories: [{ id: 'c-household', name: 'Household', colour: '#8B5CF6', icon: 'home' }],
					itemCount: 24, total: 1284.5, saved: 121.4 }} />
			</CardBody>
		</Card>
	</Page>
)
