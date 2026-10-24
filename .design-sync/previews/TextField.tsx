import { Field, TextField, IconButton } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 360 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Field label="Vendor" required>
			<TextField value="Indbo Møbler" onChange={noop} />
		</Field>
		<Field label="Reference" message="Yours, if you use one.">
			<TextField value="" onChange={noop} placeholder="Optional" />
		</Field>
		<Field label="Note">
			<TextField multiline rows={3} value="Delivered to the back door." onChange={noop} />
		</Field>
	</div>
);

export const Messages = () => (
	<div style={col}>
		<Field label="Order date" messageType="warning" message="Later than the usual date.">
			<TextField value="24.12.2026" onChange={noop} />
		</Field>
		<Field label="Email" messageType="danger" message="An email needs an @.">
			<TextField type="email" value="anna.lomwas.com" onChange={noop} />
		</Field>
	</div>
);

export const States = () => (
	<div style={col}>
		<Field label="Disabled"><TextField value="Indbo Møbler" onChange={noop} disabled /></Field>
		<Field label="Read-only"><TextField value="SPENDLY-447" onChange={noop} readOnly /></Field>
		<Field label="Empty"><TextField variant="empty" value="" onChange={noop} placeholder="Nothing yet" /></Field>
		<Field label="With a clear button" trail={<IconButton icon="x" aria-label="Clear" size="field" />}>
			<TextField value="Lounge chair" onChange={noop} />
		</Field>
	</div>
);
