import { ChartTip } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start' } as const;

export const Readouts = () => (
	<div style={row}>
		<ChartTip title="August 2026" value="24.310 kr." note="18 orders · click to open" />
		<ChartTip
			title="August 2026"
			value="24.310 kr."
			rows={[
				{ key: 'a', series: 1, name: 'Havemøbler', value: '9.480 kr.' },
				{ key: 'b', series: 2, name: 'Boligtilbehør', value: '6.810 kr.' },
				{ key: 'c', series: 3, name: 'Belysning', value: '5.100 kr.' },
				{ key: 'd', series: 4, name: 'Other', value: '2.920 kr.' }
			]}
			note="18 orders · click to narrow down"
		/>
	</div>
);

export const SeriesOnly = () => (
	<div style={row}>
		<ChartTip
			title="Week 34"
			rows={[
				{ key: 'p', series: 1, name: 'Paid', value: '4.120 kr.' },
				{ key: 'o', series: 4, name: 'Not yet complete', value: '1.380 kr.' },
				{ key: 'n', name: 'Orders', value: '6' }
			]}
		/>
		<ChartTip title="A very long category name for garden furniture and cushions" value="12.940 kr." note="9 orders" />
	</div>
);
