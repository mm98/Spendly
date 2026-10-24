import { PeriodWindow } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;
const noop = () => {};

export const Default = () => (
	<PeriodWindow unit="month" label="August 2026" previousLabel="Previous month" nextLabel="Next month" onPrevious={noop} onNext={noop} />
);

export const Units = () => (
	<div style={col}>
		<PeriodWindow unit="week" label="Week 33" previousLabel="Previous week" nextLabel="Next week" onPrevious={noop} onNext={noop} />
		<PeriodWindow unit="month" label="August 2026" onPrevious={noop} onNext={noop} />
		<PeriodWindow unit="quarter" label="Q3 2026" onPrevious={noop} onNext={noop} />
		<PeriodWindow unit="year" label="2026" onPrevious={noop} onNext={noop} />
		<PeriodWindow unit="days30" label="15.07 - 13.08.2026" previousLabel="The 30 days before" nextLabel="The 30 days after" onPrevious={noop} onNext={noop} />
	</div>
);

export const AtTheEnds = () => (
	<div style={col}>
		<PeriodWindow unit="month" label="October 2026" nextLabel="Next month" onPrevious={noop} />
		<PeriodWindow unit="year" label="2025" previousLabel="Previous year" onNext={noop} />
	</div>
);

export const Touch = () => (
	<PeriodWindow unit="month" label="August 2026" onPrevious={noop} onNext={noop} touch />
);
