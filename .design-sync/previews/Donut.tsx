import { Donut, Shares, ShareRow } from 'spendly-react';

const shares = [
	{ name: 'Indbo Møbler', amount: '24.310 kr.', share: 46, series: 1 as const },
	{ name: 'IKEA', amount: '14.120 kr.', share: 27, series: 2 as const },
	{ name: 'Bilka', amount: '8.900 kr.', share: 17, series: 3 as const },
	{ name: 'Other', amount: '5.230 kr.', share: 10, series: 4 as const }
];

export const WithShares = () => (
	<div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', maxWidth: 560 }}>
		<Donut shares={shares.map(s => ({ series: s.series, value: s.share }))} figure="52.560" label="kr. in August" aria-label="Indbo Møbler 46%, IKEA 27%, Bilka 17%, Other 10%" />
		<div style={{ flex: 1, minWidth: 240 }}>
			<Shares>
				{shares.map(s => <ShareRow key={s.name} series={s.series} amount={s.amount} value={`${s.share}%`}>{s.name}</ShareRow>)}
			</Shares>
		</div>
	</div>
);

export const States = () => (
	<div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
		<Donut shares={[{ series: 1, value: 62 }, { series: 2, value: 38 }]} figure="18" label="orders" aria-label="Delivered 62%, In progress 38%" />
		<Donut shares={[{ series: 1, value: 100 }]} figure="100%" label="Havemøbler" aria-label="Havemøbler 100%" />
		<Donut loading />
	</div>
);
