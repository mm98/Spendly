import { Bars, Card, CardHeader, ChartTip, ChatChart, Plot, Stat } from 'spendly-react';

const months = [
	{ key: 'may', height: 45, tick: 'May', from: '2026-05-01', to: '2026-05-31' },
	{ key: 'jun', height: 60, tick: 'Jun', from: '2026-06-01', to: '2026-06-30' },
	{ key: 'jul', height: 51, tick: 'Jul', from: '2026-07-01', to: '2026-07-31' },
	{ key: 'aug', height: 81, tick: 'Aug', from: '2026-08-01', to: '2026-08-31', segments: [{ key: '1', share: 39 }, { key: '2', share: 28 }, { key: '3', share: 21 }, { key: '4', share: 12 }] },
	{ key: 'sep', height: 33, tick: 'Sep', from: '2026-09-01', to: '2026-09-30', muted: true }
];

export const InPlot = () => (
	<Card>
		<CardHeader name="Spend by month" aside="May to Sep 2026" />
		<Plot axis={['30k', '20k', '10k', '0']} limit={{ at: '27%', label: 'Monthly limit 22.000 kr.' }}>
			<Bars variant="plot" selected="aug" onSelect={() => {}} columns={months} />
		</Plot>
	</Card>
);

const year = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const heights = [38, 52, 44, 61, 47, 70, 58, 90, 64, 41, 0, 0];

export const CardVariant = () => (
	<Card>
		<CardHeader name="Spend, 2026" aside="61.480 kr. so far" />
		<Bars
			variant="card"
			selected="oct"
			onSelect={() => {}}
			columns={year.map((tick, i) => ({ key: tick.toLowerCase(), tick, height: heights[i], future: i > 9, label: `${tick} 2026` }))}
		/>
	</Card>
);

export const Spark = () => (
	<div style={{ maxWidth: 320 }}>
		<Card>
			<div className="sp-stack sp-gap-8">
				<Stat label="This week" figure="7.310,00 kr." />
				<Bars variant="spark" columns={[45, 60, 51, 81, 33, 54, 71].map((h, i) => ({ key: String(i), height: h, muted: i !== 3 }))} />
			</div>
		</Card>
	</div>
);

const answer: [string, string, number, string][] = [['apr', 'Apr', 50, '5.010,00'], ['may', 'May', 65, '6.240,00'], ['jun', 'Jun', 70, '6.880,00'], ['jul', 'Jul', 60, '5.660,00'], ['aug', 'Aug', 100, '9.840,00'], ['sep', 'Sep', 80, '8.080,00']];

export const OpenReadout = () => (
	<div style={{ maxWidth: 520, paddingTop: 72 }}>
		<ChatChart name="Spending per month" meta="Apr - Sep 2026">
			<Bars
				open="aug"
				columns={answer.map(([key, tick, height, amt]) => ({
					key, tick, height, label: `${tick} 2026, ${amt} kr.`,
					readout: <ChartTip title={`${tick} 2026`} value={`${amt} kr.`} />
				}))}
			/>
		</ChatChart>
	</div>
);

export const Loading = () => (
	<Card>
		<CardHeader name="Spend by month" aside="Loading" />
		<Plot axis={['', '', '', '']}>
			<Bars variant="plot" loading />
		</Plot>
	</Card>
);
