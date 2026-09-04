import { DateInput, Field, FieldPair, FieldShell, FieldUnit, Segmented, TextInput } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 560 }

export const DateAndStatus = () => (
	<div style={box}>
		<FieldPair>
			<Field label="Date" htmlFor="pair-date">
				<DateInput id="pair-date" label="Order date" value="2026-08-14" onChange={noop} />
			</Field>
			<Field label="Status" group>
				<Segmented options={['Ordered', 'Delivered', 'Returned']} value="Delivered"
					onChange={noop} label="Status" />
			</Field>
		</FieldPair>
	</div>
)

export const TwoAmounts = () => (
	<div style={box}>
		<FieldPair>
			<Field label="Discount" optional htmlFor="pair-discount"
				help="The amount subtracted from the order.">
				<FieldShell>
					<TextInput id="pair-discount" inputMode="decimal" value="25,00"
						aria-label="Discount" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
			<Field label="Shipping fee" optional htmlFor="pair-shipping">
				<FieldShell>
					<TextInput id="pair-shipping" inputMode="decimal" value="49,00"
						aria-label="Shipping fee" onChange={noop} />
					<FieldUnit>kr.</FieldUnit>
				</FieldShell>
			</Field>
		</FieldPair>
	</div>
)

export const KeptOnPhones = () => (
	<div style={box}>
		<FieldPair variant="field-pair-keep">
			<Field label="From" htmlFor="pair-from">
				<DateInput id="pair-from" label="From date" value="2026-08-01" onChange={noop} />
			</Field>
			<Field label="To" htmlFor="pair-to">
				<DateInput id="pair-to" label="To date" value="2026-08-31" onChange={noop} />
			</Field>
		</FieldPair>
	</div>
)

export const OneRejected = () => (
	<div style={box}>
		<FieldPair>
			<Field label="Delivered date" htmlFor="pair-delivered"
				error="When did it arrive?" errorId="pair-delivered-error">
				<DateInput id="pair-delivered" label="Delivered date" value=""
					invalid describedBy="pair-delivered-error" onChange={noop} />
			</Field>
			<Field label="Returned date" htmlFor="pair-returned">
				<DateInput id="pair-returned" label="Returned date" value="2026-08-22" onChange={noop} />
			</Field>
		</FieldPair>
	</div>
)
