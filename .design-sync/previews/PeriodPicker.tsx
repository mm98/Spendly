import { PeriodPicker, PeriodWindow, Choice, Switch, Button } from 'spendly-react';

const noop = () => {};

export const Month = () => (
	<PeriodPicker
		name="period-month"
		value="month"
		at="2026-08-14"
		locale="da-DK"
		onChange={noop}
		stepper={<PeriodWindow unit="month" label="August 2026" previousLabel="Previous month" nextLabel="Next month" onPrevious={noop} onNext={noop} />}
	/>
);

export const BackToPresent = () => (
	<PeriodPicker
		name="period-back"
		value="quarter"
		at="2026-05-02"
		locale="da-DK"
		onChange={noop}
		onPresent={noop}
		stepper={<PeriodWindow unit="quarter" label="Q2 2026" previousLabel="Previous quarter" nextLabel="Next quarter" onPrevious={noop} onNext={noop} />}
	/>
);

export const WithExtras = () => (
	<PeriodPicker
		name="period-extra"
		value="year"
		at="2025-06-01"
		locale="da-DK"
		onChange={noop}
		stepper={<PeriodWindow unit="year" label="2025" previousLabel="Previous year" nextLabel="Next year" onPrevious={noop} onNext={noop} />}
		extra={<Choice control={<Switch checked onChange={noop} />}>Include 2 left-out orders</Choice>}
		actions={<Button variant="outline" size="small" iconStart="download">Export</Button>}
	/>
);

export const Custom = () => (
	<PeriodPicker name="period-custom" value="custom" from="2026-08-03" to="2026-08-16" locale="da-DK" onChange={noop} />
);
