import { Legend, LegendItem } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 520 } as const;

export const Series = () => (
	<div style={col}>
		<Legend>
			<LegendItem series={1}>Havemøbler</LegendItem>
			<LegendItem series={2}>Boligtilbehør</LegendItem>
			<LegendItem series={3}>Belysning</LegendItem>
			<LegendItem series={4}>Other</LegendItem>
		</Legend>
	</div>
);

export const WithLimit = () => (
	<div style={col}>
		<Legend>
			<LegendItem series={1}>Spend</LegendItem>
			<LegendItem series={4}>Not yet complete</LegendItem>
			<LegendItem series="limit">Monthly limit 22.000 kr.</LegendItem>
		</Legend>
		<Legend>
			<LegendItem series={1}>Paid</LegendItem>
			<LegendItem series="limit">Limit per week 5.000 kr.</LegendItem>
		</Legend>
	</div>
);
