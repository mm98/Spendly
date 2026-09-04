import { Chip, Field, FieldShell, FieldUnit, TextInput } from 'spendly-react'

const noop = () => {}
const col: React.CSSProperties = { display: 'grid', gap: 18, maxWidth: 420 }

export const AroundAnInput = () => (
	<div style={col}>
		<Field label="Order reference" optional htmlFor="shell-reference">
			<FieldShell>
				<TextInput id="shell-reference" value="BLK-4471902" aria-label="Order reference"
					onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)

export const WithAUnit = () => (
	<div style={col}>
		<Field label="Price paid" htmlFor="shell-price" help="What one piece cost.">
			<FieldShell>
				<TextInput id="shell-price" inputMode="decimal" value="129,95"
					aria-label="Price paid" onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const Rejected = () => (
	<div style={col}>
		<Field label="Shipping fee" optional htmlFor="shell-shipping"
			error="Amounts take a comma, such as 49,00." errorId="shell-shipping-error">
			<FieldShell>
				<TextInput id="shell-shipping" inputMode="decimal" value="49.00 kroner"
					aria-label="Shipping fee" invalid describedBy="shell-shipping-error"
					onChange={noop} />
				<FieldUnit>kr.</FieldUnit>
			</FieldShell>
		</Field>
	</div>
)

export const HoldingChips = () => (
	<div style={col}>
		<Field label="Aliases" optional htmlFor="shell-aliases"
			help="Other names for this vendor. Type a name and press Enter.">
			<FieldShell className="field-shell-chips field-shell-no-chevron">
				<Chip label="Remove alias Bilka Lavpris" onRemove={noop}>Bilka Lavpris</Chip>
				<Chip label="Remove alias Bilka.dk" onRemove={noop}>Bilka.dk</Chip>
				<TextInput id="shell-aliases" value="" aria-label="Add alias"
					placeholder="Add alias..." onChange={noop} />
			</FieldShell>
		</Field>
	</div>
)
