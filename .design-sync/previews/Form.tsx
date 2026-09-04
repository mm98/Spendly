import {
	Button, CheckRow, Combobox, DateInput, Field, FieldPair, FieldShell, FieldUnit,
	FilterSection, Form, FormActions, Segmented, TextArea, TextInput
} from 'spendly-react'

const noop = () => {}

const vendors = [{
	heading: 'Favourites',
	options: [{ id: 'v1', label: 'Bilka' }, { id: 'v2', label: 'Netto' }],
}, {
	heading: 'All vendors',
	options: [{ id: 'v3', label: 'Coop 365' }, { id: 'v4', label: 'Rema 1000' }],
}]

const kinds = [{
	heading: 'Kinds',
	options: ['Expense', 'Gift', 'Sold', 'Work', 'Other'].map(k => ({ id: k, label: k })),
}]

export const AnOrderForm = () => (
	<div style={{ maxWidth: 560 }}>
		<Form>
			<Field label="Vendor" htmlFor="form-vendor">
				<Combobox id="form-vendor" label="Vendor" placeholder="Search vendors..."
					value="Bilka" groups={vendors} leadingIcon="search" required
					action="CREATE VENDOR" onChange={noop} onSelect={noop} />
			</Field>
			<FieldPair>
				<Field label="Date" htmlFor="form-date">
					<DateInput id="form-date" label="Order date" value="2026-08-14" onChange={noop} />
				</Field>
				<Field label="Status" group>
					<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
						onChange={noop} label="Status" />
				</Field>
			</FieldPair>
			<Field label="Kind" htmlFor="form-kind" help="Only expenses are added to your totals.">
				<Combobox id="form-kind" label="Kind" value="Expense" groups={kinds}
					onChange={noop} onSelect={noop} />
			</Field>
			<FieldPair>
				<Field label="Discount" optional htmlFor="form-discount"
					help="The amount subtracted from the order.">
					<FieldShell>
						<TextInput id="form-discount" inputMode="decimal" value="25,00"
							aria-label="Discount" onChange={noop} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
				<Field label="Shipping fee" optional htmlFor="form-shipping">
					<FieldShell>
						<TextInput id="form-shipping" inputMode="decimal" value="49,00"
							aria-label="Shipping fee" onChange={noop} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
			</FieldPair>
			<Field label="Note" optional htmlFor="form-note">
				<TextArea id="form-note" aria-label="Note" value=""
					placeholder="Add a note about this purchase..." onChange={noop} />
			</Field>
			<FormActions>
				<Button variant="caps compact">SAVE ORDER</Button>
				<Button variant="ghost compact">CANCEL</Button>
			</FormActions>
		</Form>
	</div>
)

export const SignIn = () => (
	<div style={{ maxWidth: 380 }}>
		<Form wide={false}>
			<Field label="Email" htmlFor="form-email">
				<FieldShell>
					<TextInput id="form-email" type="email" value="mette@example.dk"
						aria-label="Email" autoComplete="email" onChange={noop} />
				</FieldShell>
			</Field>
			<Field label="Password" htmlFor="form-password">
				<FieldShell>
					<TextInput id="form-password" type="password" value="hyggeligt42"
						aria-label="Password" autoComplete="current-password" onChange={noop} />
				</FieldShell>
			</Field>
			<FormActions>
				<Button variant="primary" type="submit">SIGN IN</Button>
			</FormActions>
		</Form>
	</div>
)

export const SectionedSettings = () => (
	<div style={{ maxWidth: 520 }}>
		<Form>
			<FilterSection>
				<Field label="Rows per page" group
					help="How many rows the order, vendor and category lists show before the pager.">
					<Segmented options={['5', '10', '15', '20', '25']} value="15"
						onChange={noop} label="Rows per page" />
				</Field>
			</FilterSection>
			<FilterSection>
				<CheckRow id="form-scan-card" checked onChange={noop}
					label="Show the scan card on Home"
					help="Pressing LATER on that card also turns this off." />
				<CheckRow id="form-confirm-delete" checked={false} onChange={noop}
					label="Ask before deleting anything"
					help="An order, a category, a vendor, a line item, an attachment." />
			</FilterSection>
		</Form>
	</div>
)
