import { RangePicker, Sheet } from 'spendly-react';

const noop = () => {};

export const Default = () => (
	<RangePicker from="2026-08-03" to="2026-08-16" onChange={noop} onApply={noop} onCancel={noop} locale="da-DK" />
);

export const OwnRanges = () => (
	<RangePicker
		from="2026-07-01"
		to="2026-09-30"
		onChange={noop}
		locale="da-DK"
		max="2026-10-24"
		quick={[
			{ label: 'Last quarter', value: ['2026-07-01', '2026-09-30'] },
			{ label: 'Since first order', value: ['2025-03-12', '2026-10-24'] }
		]}
	/>
);

export const MinimumDays = () => (
	<RangePicker from="2026-08-10" to="2026-08-12" onChange={noop} minDays={3} min="2026-08-01" max="2026-09-30" showWeeks={false} locale="da-DK" />
);

export const OnAPhone = () => (
	<div style={{ maxWidth: 390 }}>
		<Sheet>
			<RangePicker single from="2026-08-03" to="2026-08-16" max="2026-08-31" onChange={noop} onApply={noop} locale="da-DK" />
		</Sheet>
	</div>
);
