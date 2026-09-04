import {
	Button, Card, CardBody, Combobox, DateInput, Field, FieldPair, FieldShell, FieldUnit,
	FilterSection, FormActions, ListToolbar, Segmented, TextInput
} from 'spendly-react'

/* The bordered box a group of fields is kept in: Settings stacks four of them down one form,
   All orders uses one as the filter panel under its toolbar. */

const noop = () => {}
const searchRef = { current: null }

const kinds = [{ heading: 'Kinds', options: [
	{ id: 'Groceries', label: 'Groceries' },
	{ id: 'Household', label: 'Household' },
	{ id: 'Electronics', label: 'Electronics' }
] }]

const vendors = [{ heading: 'Favourites', options: [
	{ id: 'v-bilka', label: 'Bilka' },
	{ id: 'v-netto', label: 'Netto' }
] }, { heading: 'All vendors', options: [
	{ id: 'v-foetex', label: 'Føtex' },
	{ id: 'v-rema', label: 'Rema 1000' }
] }]

const sorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'amount-desc', label: 'Amount, highest' }
]

/* Settings: a heading and the controls that answer one question. Nothing on that page is a
   bare control in a card body. */
export const AGroupOfSettings = () => (
	<FilterSection>
		<span className="panel-heading">New orders</span>
		<FieldPair>
			<Field label="Kind" htmlFor="setting-default-kind"
				help="What the Kind field on step 1 opens with.">
				<Combobox id="setting-default-kind" label="Default kind" value="Groceries"
					groups={kinds} onChange={noop} onSelect={noop} />
			</Field>
			<Field label="Status" group help="Which segment is selected on a new order.">
				<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
					onChange={noop} label="Default status" />
			</Field>
		</FieldPair>
	</FilterSection>
)

/* All orders: the same box as the filter panel, closing on its own actions. `id` is what the
   toolbar's FILTERS button names in aria-controls. */
export const TheFilterPanel = () => (
	<FilterSection id="filter-panel">
		<Field label="Vendor" htmlFor="filter-vendor">
			<Combobox id="filter-vendor" label="Vendor" placeholder="Any vendor" value="Bilka"
				groups={vendors} onChange={noop} onSelect={noop} />
		</Field>
		<FieldPair variant="field-pair-keep">
			<Field label="From" htmlFor="filter-from">
				<DateInput id="filter-from" label="From date" value="2024-04-01" onChange={noop} />
			</Field>
			<Field label="To" htmlFor="filter-to">
				<DateInput id="filter-to" label="To date" value="2024-05-15" onChange={noop} />
			</Field>
		</FieldPair>
		<FieldPair variant="field-pair-keep">
			<Field label="Min amount" htmlFor="filter-min-amount">
				<FieldShell>
					<TextInput id="filter-min-amount" inputMode="decimal" placeholder="Any"
						aria-label="Minimum amount" value="250" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
			<Field label="Max amount" htmlFor="filter-max-amount">
				<FieldShell>
					<TextInput id="filter-max-amount" inputMode="decimal" placeholder="Any"
						aria-label="Maximum amount" value="" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
		</FieldPair>
		<Field label="Status" group>
			<Segmented options={['Any', 'Ordered', 'Delivered', 'Returned']} value="Delivered"
				onChange={noop} label="Status" />
		</Field>
		<FormActions>
			<Button variant="caps compact" onClick={noop}>APPLY FILTERS</Button>
			<Button variant="ghost compact" onClick={noop}>CLEAR</Button>
		</FormActions>
	</FilterSection>
)

/* Closed. `hidden` is passed straight through to the div, so the panel takes no height at all
   and the toolbar above it keeps its place. */
export const Closed = () => (
	<Card aria-label="Search and filters">
		<CardBody variant="card-body-filters">
			<ListToolbar query="" onQuery={noop} searchRef={searchRef}
				placeholder="Search vendor, note or item text..." label="Search orders"
				sortLabel="Sort orders" sorts={sorts} sortValue="Date, newest" onSort={noop}
				filters={{ open: false, panelId: 'filter-panel', onToggle: noop }} />
			<FilterSection id="filter-panel" hidden>
				<Field label="Vendor" htmlFor="closed-filter-vendor">
					<Combobox id="closed-filter-vendor" label="Vendor" placeholder="Any vendor"
						value="" groups={vendors} onChange={noop} onSelect={noop} />
				</Field>
			</FilterSection>
		</CardBody>
	</Card>
)
