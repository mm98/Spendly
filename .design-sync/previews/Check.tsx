import { Check, Choice } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Choice control={<Check checked onChange={noop} />}>Attached</Choice>
		<Choice control={<Check checked={false} onChange={noop} />}>Missing</Choice>
		<Choice control={<Check indeterminate checked={false} onChange={noop} />}>Some of the orders</Choice>
	</div>
);

export const Disabled = () => (
	<div style={col}>
		<Choice control={<Check disabled />}>Returned · 0</Choice>
		<Choice control={<Check disabled defaultChecked />}>Approved</Choice>
	</div>
);

export const Bare = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
		<Check checked onChange={noop} aria-label="Pick SPENDLY-447" />
		<Check checked={false} onChange={noop} aria-label="Pick SPENDLY-448" />
		<Check indeterminate checked={false} onChange={noop} aria-label="Pick all orders" />
	</div>
);
