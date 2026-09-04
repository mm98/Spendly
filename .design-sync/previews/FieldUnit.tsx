import { DateInput, Field, FieldPair, FieldShell, FieldUnit, TextInput } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

export const Currency = () => (
	<div style={box}>
		<Field label="Price paid" htmlFor="unit-price" help="What one piece cost.">
			<FieldShell>
				<TextInput id="unit-price" inputMode="decimal" value="129,95"
					aria-label="Price paid" onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const Pieces = () => (
	<div style={box}>
		<FieldPair>
			<Field label="Quantity" htmlFor="unit-quantity">
				<FieldShell>
					<TextInput id="unit-quantity" inputMode="numeric" value="3"
						aria-label="Quantity" onChange={noop} />
					<FieldUnit>pcs</FieldUnit>
				</FieldShell>
			</Field>
			<Field label="Retail price" optional htmlFor="unit-retail">
				<FieldShell>
					<TextInput id="unit-retail" inputMode="decimal" value="179,00"
						aria-label="Retail price" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
		</FieldPair>
	</div>
)

export const OnADateField = () => (
	<div style={box}>
		<Field label="Date" htmlFor="unit-date">
			<DateInput id="unit-date" label="Order date" value="2026-09-04" trail="today"
				onChange={noop} />
		</Field>
	</div>
)
