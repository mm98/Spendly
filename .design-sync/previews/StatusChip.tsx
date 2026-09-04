import { Card, CardBody, CardDivider, CardHeader, Chip, Combobox, Field, StatusChip } from 'spendly-react'

const noop = () => {}

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }

/* Two tones and no more: no tone is the settled, green reading, `warning` is the one that
   wants a second look. Both draw the dot. */
export const Tones = () => (
	<div style={row}>
		<StatusChip>Delivered</StatusChip>
		<StatusChip>Ordered</StatusChip>
		<StatusChip tone="warning">Returned</StatusChip>
	</div>
)

/* Where a status actually sits: at the top of an order, opposite the vendor and the date. */
export const OnAnOrder = () => (
	<Card>
		<CardBody>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
				<div>
					<div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>Bilka</div>
					<div className="field-help">4 September 2026 • 12 items</div>
				</div>
				<StatusChip>Delivered</StatusChip>
			</div>
			<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
				<Chip>Groceries</Chip>
				<Chip>Household</Chip>
			</div>
		</CardBody>
	</Card>
)

/* The scan form's "matched" flag, pinned inside the vendor field. `className="chip-matched"`
   is the smaller size the field has room for. Ported from Scan. */
export const InsideAField = () => (
	<Field label="Vendor" htmlFor="order-vendor">
		<Combobox id="order-vendor" label="Vendor" required leadingIcon="search"
			value="Bilka" onChange={noop} placeholder="Search vendors..."
			trail={<StatusChip className="chip-matched">matched</StatusChip>} />
	</Field>
)
