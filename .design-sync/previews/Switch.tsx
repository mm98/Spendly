import { Choice, Field, Switch } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Choice control={<Switch checked onChange={noop} />}>Compare with July</Choice>
		<Choice control={<Switch checked={false} onChange={noop} />}>Show cancelled orders</Choice>
	</div>
);

export const InField = () => (
	<div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
		<Field label="Send me a monthly summary" message="On the first day of each month.">
			<Switch checked onChange={noop} />
		</Field>
		<Choice variant="described" control={<Switch checked={false} onChange={noop} />}
			description="A warning when a category passes its limit.">Budget alerts</Choice>
	</div>
);

export const Disabled = () => (
	<div style={col}>
		<Choice control={<Switch disabled defaultChecked />}>Synced from your bank</Choice>
		<Choice control={<Switch disabled />}>Share with your household</Choice>
	</div>
);
