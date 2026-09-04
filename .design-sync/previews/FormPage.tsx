import {
	Button, Card, CardBody, CardDivider, CardHeader, Combobox, DateInput, DeleteCard, Field,
	FieldPair, FieldShell, FieldUnit, FormPage, Note, Segmented, SummaryRow, TextInput
} from 'spendly-react'

/* The one page every create and edit screen in the app is built out of: the card with its
   headline and lead, the fields you pass in, the split CANCEL / save footer it draws itself,
   and the rail beside it. Five screens use it -- order details, order items, scan review,
   category and vendor -- so none of them arranges those parts for itself. */

const noop = () => {}

const vendors = [{ heading: 'Favourites', options: [
	{ id: 'v-bilka', label: 'Bilka' }, { id: 'v-netto', label: 'Netto' }
] }, { heading: 'All vendors', options: [
	{ id: 'v-foetex', label: 'Føtex' }, { id: 'v-rema', label: 'Rema 1000' }
] }]

const OrderSummary = () => (
	<Card aria-label="Order summary">
		<CardBody>
			<div className="card-subheading">Order summary</div>
			<SummaryRow label="Vendor" value="Bilka" />
			<SummaryRow label="Date" value="2 May" />
			<SummaryRow label="Status" value="Delivered" />
		</CardBody>
	</Card>
)

/* Step 1 of a new order. `steps` draws the banner over the card; `cancel` and `submit` are
   plain descriptions of the two buttons, not the buttons themselves. */
export const AStepOfAWizard = () => (
	<FormPage
		title="Order details" lead="Where you bought, when, and how it arrived."
		steps={[
			{ label: 'Order details', icon: 'receipt', on: true },
			{ label: 'Add the items', icon: 'document' }
		]}
		cancel={{ to: '/orders' }}
		submit={{ label: 'NEXT STEP', onClick: noop }}
		rail={<OrderSummary />}>
		<Field label="Vendor" htmlFor="order-vendor">
			<Combobox id="order-vendor" label="Vendor" placeholder="Search vendors..."
				value="Bilka" groups={vendors} onChange={noop} onSelect={noop}
				action="CREATE VENDOR" leadingIcon="store" required />
		</Field>
		<FieldPair variant="field-pair-keep">
			<Field label="Order date" htmlFor="order-date">
				<DateInput id="order-date" label="Order date" value="2024-05-02" onChange={noop} />
			</Field>
			<Field label="Status" group>
				<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
					onChange={noop} label="Status" />
			</Field>
		</FieldPair>
	</FormPage>
)

/* Editing a record. No steps, and the rail carries the delete card -- a record edited on this
   page has nowhere else to put one. */
export const EditingARecord = () => (
	<FormPage
		title="Edit category" lead="Its name, its look, and how much it can spend each month."
		cancel={{ to: '/categories/all' }}
		submit={{ label: 'SAVE CHANGES', onClick: noop }}
		rail={
			<DeleteCard what="category" del={{
				button: <Button variant="block" icon="trash">DELETE CATEGORY</Button>,
				dialog: null
			}}>
				Removing a category does not remove its orders. A category still used by an order
				cannot be removed.
			</DeleteCard>
		}>
		<Field label="Name" htmlFor="category-name">
			<FieldShell>
				<TextInput id="category-name" value="Groceries" aria-label="Category name"
					aria-required="true" onChange={noop} />
			</FieldShell>
		</Field>
		<Field label="Monthly budget" optional htmlFor="category-budget"
			help="Leave it empty for no budget.">
			<FieldShell>
				<TextInput id="category-budget" inputMode="decimal" value="4.500"
					aria-label="Monthly budget" onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</FormPage>
)

/* Scan's review step. `notice` sits between the lead and the first field, and it is where a
   verdict about the whole form goes -- never a rejection of one field, which belongs under
   that field. */
export const WithANotice = () => (
	<FormPage
		title="Review the draft" lead="Every value is editable. Nothing is stored until you save."
		cancel={{ to: '/scan', label: 'DISCARD' }}
		submit={{ label: 'SAVE ORDER', onClick: noop }}
		notice={
			<Note tone="positive" title="Total matches." className="note-lead">
				The 14 lines add up to 742,45 kr., the same as the total printed on the receipt.
			</Note>
		}
		rail={
			<Card aria-label="Source document">
				<CardHeader title="Source" />
				<CardDivider />
				<CardBody>
					<p className="card-lead card-lead-flush">bilka-2-maj.pdf • 1 page</p>
				</CardBody>
			</Card>
		}>
		<Field label="Vendor" htmlFor="scan-vendor">
			<Combobox id="scan-vendor" label="Vendor" value="Bilka" groups={vendors}
				onChange={noop} onSelect={noop} leadingIcon="store" />
		</Field>
		<FieldPair variant="field-pair-keep">
			<Field label="Order date" htmlFor="scan-date">
				<DateInput id="scan-date" label="Order date" value="2024-05-02" onChange={noop} />
			</Field>
			<Field label="Total" htmlFor="scan-total">
				<FieldShell>
					<TextInput id="scan-total" inputMode="decimal" value="742,45"
						aria-label="Total" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
		</FieldPair>
	</FormPage>
)
