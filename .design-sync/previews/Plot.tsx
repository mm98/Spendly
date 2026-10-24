import { Bars, Card, CardHeader, Legend, LegendItem, Plot } from 'spendly-react';

const cols = [
	{ key: 'may', height: 45, tick: 'May', segments: [{ key: '1', share: 40 }, { key: '2', share: 30 }, { key: '3', share: 20 }, { key: '4', share: 10 }] },
	{ key: 'jun', height: 60, tick: 'Jun', segments: [{ key: '1', share: 35 }, { key: '2', share: 35 }, { key: '3', share: 18 }, { key: '4', share: 12 }] },
	{ key: 'jul', height: 51, tick: 'Jul', segments: [{ key: '1', share: 44 }, { key: '2', share: 26 }, { key: '3', share: 20 }, { key: '4', share: 10 }] },
	{ key: 'aug', height: 81, tick: 'Aug', segments: [{ key: '1', share: 39 }, { key: '2', share: 28 }, { key: '3', share: 21 }, { key: '4', share: 12 }] },
	{ key: 'sep', height: 33, tick: 'Sep', segments: [{ key: '1', share: 50 }, { key: '2', share: 20 }, { key: '3', share: 20 }, { key: '4', share: 10 }] }
];

export const WithLimit = () => (
	<Card>
		<CardHeader name="Spend by month" aside="May to Sep 2026" />
		<Plot axis={['30k', '20k', '10k', '0']} limit={{ at: '27%', label: 'Monthly limit 22.000 kr.' }}>
			<Bars variant="plot" columns={cols} />
		</Plot>
		<Legend>
			<LegendItem series={1}>Havemøbler</LegendItem>
			<LegendItem series={2}>Boligtilbehør</LegendItem>
			<LegendItem series={3}>Belysning</LegendItem>
			<LegendItem series={4}>Other</LegendItem>
			<LegendItem series="limit">Monthly limit 22.000 kr.</LegendItem>
		</Legend>
	</Card>
);

export const Gridlines = () => (
	<Card>
		<CardHeader name="Spend by week" aside="August 2026" />
		<Plot axis={['8k', '6k', '4k', '2k', '0']} gridlines={5}>
			<Bars variant="plot" columns={[['w31', 'W31', 42], ['w32', 'W32', 66], ['w33', 'W33', 55], ['w34', 'W34', 88], ['w35', 'W35', 30]].map(([key, tick, height]) => ({ key: String(key), tick: String(tick), height: Number(height) }))} />
		</Plot>
	</Card>
);
