import { DateField, Field } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 260 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Field label="Order date">
			<DateField value="2026-08-14" onChange={noop} native={false} locale="da-DK" />
		</Field>
		<Field label="To">
			<DateField value="" placeholder="Today" onChange={noop} native={false} locale="da-DK" />
		</Field>
	</div>
);

export const Locales = () => (
	<div style={col}>
		<Field label="Delivered, Danish">
			<DateField value="2026-09-18" onChange={noop} native={false} locale="da-DK" />
		</Field>
		<Field label="Delivered, British">
			<DateField value="2026-09-18" onChange={noop} native={false} locale="en-GB" />
		</Field>
		<Field label="Delivered, American">
			<DateField value="" onChange={noop} native={false} locale="en-US" />
		</Field>
	</div>
);

export const Danger = () => (
	<div style={col}>
		<Field label="Order date" messageType="danger" message="An order needs a date.">
			<DateField value="" onChange={noop} native={false} locale="da-DK" />
		</Field>
		<Field label="Delivered" messageType="warning" message="Later than the usual date.">
			<DateField value="2026-12-24" onChange={noop} native={false} locale="da-DK" />
		</Field>
	</div>
);

export const Native = () => (
	<div style={col}>
		<Field label="Order date, on a phone">
			<DateField value="2026-08-14" onChange={noop} native locale="da-DK" />
		</Field>
	</div>
);
