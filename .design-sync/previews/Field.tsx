import { Button, Check, Field, Icon, IconButton, Kbd, NumberField, Picker, Switch, TextField } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 360 } as const;
const noop = () => {};

export const Slots = () => (
	<div style={col}>
		<Field label="Vendor" required>
			<TextField value="Indbo Møbler" onChange={noop} />
		</Field>
		<Field label="Search" lead={<Icon name="search" />} kbd={<Kbd>S</Kbd>}>
			<TextField value="" onChange={noop} placeholder="Search orders" />
		</Field>
		<Field label="Amount" unit="kr.">
			<NumberField value={1320} onChange={noop} locale="da-DK" />
		</Field>
		<Field label="Item" trail={<IconButton icon="x" aria-label="Clear" size="field" />}>
			<TextField value="Lounge chair" onChange={noop} />
		</Field>
	</div>
);

export const Messages = () => (
	<div style={col}>
		<Field label="Reference" message="Yours, if you use one.">
			<TextField value="" onChange={noop} placeholder="Optional" />
		</Field>
		<Field label="Currency" messageType="quiet" message="Used for every new order.">
			<TextField value="Danish krone" onChange={noop} readOnly />
		</Field>
		<Field label="Order date" messageType="warning" message="Later than the usual date.">
			<TextField value="24.12.2026" onChange={noop} />
		</Field>
		<Field label="Delivery" unit="kr." messageType="danger" message="An amount is required.">
			<NumberField value={null} onChange={noop} locale="da-DK" />
		</Field>
	</div>
);

export const LabelExtras = () => (
	<div style={col}>
		<Field label="Password" labelAction={<Button variant="text" size="xsmall">Forgot it?</Button>}>
			<TextField type="text" value="" onChange={noop} placeholder="Your password" />
		</Field>
		<Field label="Vendor" note="matched existing vendor" noteType="success">
			<TextField value="Bilka" onChange={noop} />
		</Field>
		<Field label="Name" messageType="danger" message="HAY already uses the name Hay ApS."
			after={<Button variant="outline" size="small">Move the name to this vendor</Button>}>
			<TextField value="Hay ApS" onChange={noop} />
		</Field>
	</div>
);

export const Roles = () => (
	<div style={col}>
		<Field label="Send me a monthly summary" message="On the first day of each month.">
			<Switch defaultChecked />
		</Field>
		<Field label="Keep the receipt with the order">
			<Check defaultChecked />
		</Field>
		<Field label="Colour">
			<Picker aria-label="Colour" swatches={['green', 'green-3', 'green-5', 'amber-ink', 'red-ink', 'ink-6']} value="green-3" onChange={noop} />
		</Field>
	</div>
);
