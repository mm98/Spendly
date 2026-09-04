import { Field, FieldPair, FieldShell, FieldUnit, TextInput } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

export const Named = () => (
	<div style={box}>
		<Field label="Name" htmlFor="text-name">
			<FieldShell>
				<TextInput id="text-name" value="Elgiganten" aria-label="Vendor name"
					aria-required="true" onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)

export const WithPlaceholder = () => (
	<div style={box}>
		<Field label="Monthly budget" optional htmlFor="text-budget"
			help="Leave it empty for no budget.">
			<FieldShell>
				<TextInput id="text-budget" inputMode="decimal" value=""
					placeholder="No budget" aria-label="Monthly budget" onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const Amounts = () => (
	<div style={box}>
		<FieldPair>
			<Field label="Quantity" htmlFor="text-quantity">
				<FieldShell>
					<TextInput id="text-quantity" inputMode="numeric" value="2"
						aria-label="Quantity" onChange={noop} />
					<FieldUnit>pcs</FieldUnit>
				</FieldShell>
			</Field>
			<Field label="Price paid" htmlFor="text-price">
				<FieldShell>
					<TextInput id="text-price" inputMode="decimal" value="1.249,00"
						aria-label="Price paid" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
		</FieldPair>
	</div>
)

export const Rejected = () => (
	<div style={box}>
		<Field label="Quantity" htmlFor="text-quantity-bad"
			error="Whole pieces only, such as 2." errorId="text-quantity-bad-error">
			<FieldShell>
				<TextInput id="text-quantity-bad" inputMode="numeric" value="2,5"
					aria-label="Quantity" invalid describedBy="text-quantity-bad-error"
					onChange={noop} />
				<FieldUnit>pcs</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const Password = () => (
	<div style={box}>
		<Field label="Password" htmlFor="text-password" help="At least 8 characters.">
			<FieldShell>
				<TextInput id="text-password" type="password" value="hyggeligt42"
					aria-label="Password" autoComplete="current-password" onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)
