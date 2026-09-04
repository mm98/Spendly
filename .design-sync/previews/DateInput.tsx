import { DateInput, Field, FieldPair } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

export const OrderDate = () => (
	<div style={box}>
		<Field label="Date" htmlFor="date-order">
			<DateInput id="date-order" label="Order date" value="2026-08-14"
				aria-required="true" onChange={noop} />
		</Field>
	</div>
)

export const WithTrail = () => (
	<div style={box}>
		<Field label="Date" htmlFor="date-today">
			<DateInput id="date-today" label="Order date" value="2026-09-04" trail="today"
				aria-required="true" onChange={noop} />
		</Field>
	</div>
)

export const Empty = () => (
	<div style={box}>
		<Field label="Delivered date" optional htmlFor="date-empty"
			help="Left empty until the parcel arrives.">
			<DateInput id="date-empty" label="Delivered date" value="" onChange={noop} />
		</Field>
	</div>
)

export const Rejected = () => (
	<div style={box}>
		<Field label="Date" htmlFor="date-bad"
			error="An order cannot be dated in the future." errorId="date-bad-error">
			<DateInput id="date-bad" label="Order date" value="2027-01-09"
				invalid describedBy="date-bad-error" onChange={noop} />
		</Field>
	</div>
)

export const ARange = () => (
	<div style={{ maxWidth: 560 }}>
		<FieldPair variant="field-pair-keep">
			<Field label="From" htmlFor="date-from">
				<DateInput id="date-from" label="From date" value="2026-08-01" onChange={noop} />
			</Field>
			<Field label="To" htmlFor="date-to">
				<DateInput id="date-to" label="To date" value="2026-08-31" onChange={noop} />
			</Field>
		</FieldPair>
	</div>
)
