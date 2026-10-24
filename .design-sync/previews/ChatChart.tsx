import { ChatChart, ChatShares, Bars, Donut, Shares, ShareRow, ChartTip, Legend, LegendItem } from 'spendly-react';

const box = { maxWidth: 560, paddingTop: 48 } as const;

const months: [string, string, number, string][] = [['apr', 'Apr', 50, '5.010,00'], ['may', 'May', 65, '6.240,00'], ['jun', 'Jun', 70, '6.880,00'], ['jul', 'Jul', 60, '5.660,00'], ['aug', 'Aug', 100, '9.840,00'], ['sep', 'Sep', 80, '8.080,00']];

export const BarsOverTime = () => (
	<div style={box}>
		<ChatChart name="Spending per month" meta="Apr - Sep 2026">
			<Bars open="jul" columns={months.map(([key, tick, height, amt]) => ({
				key, tick, height, label: `${tick} 2026, ${amt} kr.`,
				readout: <ChartTip title={`${tick} 2026`} value={`${amt} kr.`} />
			}))} />
		</ChatChart>
	</div>
);

export const TwoSeries = () => (
	<div style={{ maxWidth: 560 }}>
		<ChatChart name="Groceries, this year and last" meta="Jan - Jun">
			<Bars columns={[['Jan', 70, 60], ['Feb', 55, 62], ['Mar', 80, 66], ['Apr', 64, 58], ['May', 90, 72], ['Jun', 76, 80]].map(([tick, a, b]) => ({
				key: String(tick), tick: String(tick), pair: [Number(a), Number(b)], label: `${tick}`
			}))} />
			<Legend>
				<LegendItem series={1}>2026</LegendItem>
				<LegendItem series={4}>2025</LegendItem>
			</Legend>
		</ChatChart>
	</div>
);

export const SharesOfAWhole = () => (
	<div style={{ maxWidth: 560 }}>
		<ChatChart name="Biggest categories" meta="August 2026 · 33.820 kr.">
			<ChatShares>
				<Donut shares={[{ series: 1, value: 72 }, { series: 2, value: 16 }, { series: 3, value: 8 }, { series: 4, value: 4 }]} aria-label="Furniture 72%, Groceries 16%, Decor 8%, Other 4%" />
				<Shares>
					<ShareRow series={1} amount="24.310,00 kr." value="72%" href="#">Furniture</ShareRow>
					<ShareRow series={2} amount="5.420,00 kr." value="16%" href="#">Groceries</ShareRow>
					<ShareRow series={3} amount="2.740,00 kr." value="8%" href="#">Decor</ShareRow>
					<ShareRow series={4} amount="1.350,00 kr." value="4%" href="#">Other</ShareRow>
				</Shares>
			</ChatShares>
		</ChatChart>
	</div>
);

export const Failed = () => (
	<div style={{ maxWidth: 560 }}>
		<ChatChart name="Spending per day" meta="2026" failed="This chart could not be made: it has too many steps to draw. Ask for at most 12, for example one a month." />
	</div>
);
