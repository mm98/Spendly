import { Field, FieldPair, NumberInput } from 'spendly-react'

const noop = () => {}
const form: React.CSSProperties = { maxWidth: 460 }

export const AnAmount = () => (
	<div style={form}>
		<Field label="Total" htmlFor="preview-total">
			<NumberInput id="preview-total" value="402,17" unit="kr." onChange={noop} />
		</Field>
	</div>
)

// A quantity has no currency on it, so the field is the figure alone.
export const AQuantityAndAPrice = () => (
	<div style={form}>
		<FieldPair>
			<Field label="Quantity" htmlFor="preview-qty">
				<NumberInput id="preview-qty" value="3" unit="pcs" onChange={noop} />
			</Field>
			<Field label="Price" htmlFor="preview-price">
				<NumberInput id="preview-price" value="24,95" unit="kr." onChange={noop} />
			</Field>
		</FieldPair>
	</div>
)

export const Rejected = () => (
	<div style={form}>
		<Field label="Budget" htmlFor="preview-budget"
			error="A budget cannot be negative." errorId="preview-budget-error">
			<NumberInput id="preview-budget" value="-250,00" unit="kr." invalid
				describedBy="preview-budget-error" onChange={noop} />
		</Field>
	</div>
)

export const Empty = () => (
	<div style={form}>
		<Field label="Discount" htmlFor="preview-discount" optional>
			<NumberInput id="preview-discount" value="" unit="kr."
				placeholder="0,00" onChange={noop} />
		</Field>
	</div>
)
