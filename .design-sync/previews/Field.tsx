import { Field, FieldShell, FieldUnit, Segmented, TextInput } from 'spendly-react'

const noop = () => {}
const col: React.CSSProperties = { display: 'grid', gap: 18, maxWidth: 420 }

export const Labelled = () => (
	<div style={col}>
		<Field label="Name" htmlFor="field-name">
			<FieldShell>
				<TextInput id="field-name" value="Groceries" aria-label="Category name"
					aria-required="true" onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)

export const OptionalWithHelp = () => (
	<div style={col}>
		<Field label="Monthly budget" optional htmlFor="field-budget"
			help="Leave it empty for no budget.">
			<FieldShell>
				<TextInput id="field-budget" inputMode="decimal" value="4.500"
					aria-label="Monthly budget" onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const Rejected = () => (
	<div style={col}>
		<Field label="Vendor" htmlFor="field-vendor"
			error="Who did you buy from?" errorId="field-vendor-error">
			<FieldShell>
				<TextInput id="field-vendor" value="" aria-label="Vendor" aria-required="true"
					invalid describedBy="field-vendor-error" onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)

export const AGroup = () => (
	<div style={col}>
		<Field label="Status" group help="Which segment a new order opens with.">
			<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
				onChange={noop} label="Status" />
		</Field>
	</div>
)
