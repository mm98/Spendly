import { Field, NumberField } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 320 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Field label="Amount" unit="kr.">
			<NumberField value={24310} onChange={noop} locale="da-DK" />
		</Field>
		<Field label="Quantity">
			<NumberField value={2} onChange={noop} decimals={0} min={1} locale="da-DK" />
		</Field>
	</div>
);

export const Kinds = () => (
	<div style={col}>
		<Field label="Expected each month" unit="kr." message="Taken from last year's average.">
			<NumberField value={1650} onChange={noop} expected locale="da-DK" />
		</Field>
		<Field label="Delivery" unit="kr." messageType="danger" message="An amount is required.">
			<NumberField value={null} onChange={noop} locale="da-DK" />
		</Field>
		<Field label="Disabled" unit="kr.">
			<NumberField value={4129} onChange={noop} disabled locale="da-DK" />
		</Field>
	</div>
);

export const Cell = () => (
	<div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8, alignItems: 'center', maxWidth: 360 }}>
		<span className="sp-data">Electricity</span>
		<NumberField value={400} onChange={noop} cell aria-label="Electricity, August" locale="da-DK" />
		<span className="sp-data">Internet</span>
		<NumberField value={299} onChange={noop} cell aria-label="Internet, August" locale="da-DK" />
	</div>
);
