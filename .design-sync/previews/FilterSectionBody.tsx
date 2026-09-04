import {
	CheckRow, DateInput, Field, FieldPair, FieldShell, FieldUnit, FilterSection,
	FilterSectionBody, TextInput
} from 'spendly-react'

/* The half of a FilterSection that a control above it shows and hides. It exists so the
   optional fields keep the section's own 14px stacking: wrapping them in a plain div takes
   them out of the section's grid and they end up with nothing between them. */

const noop = () => {}

/* Open: the checkbox is on, so the fields it owns are drawn under it and stacked with the
   same gap as the rest of the section. */
export const Open = () => (
	<FilterSection>
		<span className="panel-heading">Delivery</span>
		<CheckRow id="order-was-delivered" checked onChange={noop} label="It has arrived"
			help="Turn this on to record when the order was delivered and what the delivery cost." />
		<FilterSectionBody id="order-delivery-fields">
			<FieldPair variant="field-pair-keep">
				<Field label="Delivered date" htmlFor="order-delivered-date">
					<DateInput id="order-delivered-date" label="Delivered date" value="2024-05-02"
						onChange={noop} />
				</Field>
				<Field label="Delivery cost" optional htmlFor="order-delivery-cost">
					<FieldShell>
						<TextInput id="order-delivery-cost" inputMode="decimal" value="39,00"
							aria-label="Delivery cost" onChange={noop} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
			</FieldPair>
		</FilterSectionBody>
	</FilterSection>
)

/* Closed: the same section with `hidden` on the body. The fields keep their values and take
   no height, so nothing above them moves when the checkbox is turned back on. */
export const Closed = () => (
	<FilterSection>
		<span className="panel-heading">Delivery</span>
		<CheckRow id="order-was-delivered-off" checked={false} onChange={noop} label="It has arrived"
			help="Turn this on to record when the order was delivered and what the delivery cost." />
		<FilterSectionBody id="order-delivery-fields-off" hidden>
			<FieldPair variant="field-pair-keep">
				<Field label="Delivered date" htmlFor="order-delivered-date-off">
					<DateInput id="order-delivered-date-off" label="Delivered date" value="2024-05-02"
						onChange={noop} />
				</Field>
				<Field label="Delivery cost" optional htmlFor="order-delivery-cost-off">
					<FieldShell>
						<TextInput id="order-delivery-cost-off" inputMode="decimal" value="39,00"
							aria-label="Delivery cost" onChange={noop} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
			</FieldPair>
		</FilterSectionBody>
	</FilterSection>
)
