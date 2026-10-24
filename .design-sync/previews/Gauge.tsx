import { Gauge, GaugeKey } from 'spendly-react';

const col = { display: 'grid', gap: 20, maxWidth: 320 } as const;
const item = { display: 'grid', gap: 8 } as const;

export const Limits = () => (
	<div style={col}>
		<div style={item}>
			<Gauge value={72} aria-label="Decor, August" />
			<span className="sp-meta">15.800 of 22.000 kr.</span>
		</div>
		<div style={item}>
			<Gauge value={91} over={9} marker={68} aria-label="Furniture, August" />
			<span className="sp-row-flex sp-gap-6">
				<GaugeKey />
				<span className="sp-meta sp-meta--over">24.100 of 22.000 kr., 2.100 over</span>
			</span>
		</div>
		<div style={item}>
			<Gauge value={40} untargeted aria-label="Lighting, August" />
			<span className="sp-meta">No limit set</span>
		</div>
	</div>
);

const rows = [
	{ name: 'Havemøbler', meta: '8.200 of 12.000 kr.', gauge: <Gauge thin value={68} marker={77} aria-label="Share of the limit used" /> },
	{ name: 'Boligtilbehør', meta: '9.400 of 9.000 kr.', gauge: <Gauge thin value={86} over={14} marker={77} aria-label="Share of the limit used" /> },
	{ name: 'Belysning', meta: '6.300 of 5.000 kr.', gauge: <Gauge thin passed value={100} marker={77} aria-label="Share of the limit used" /> },
	{ name: 'Køkken', meta: 'No limit set', gauge: <Gauge thin untargeted value={0} aria-label="No limit set" /> }
];

export const ThinRows = () => (
	<div style={{ display: 'grid', gap: 14, maxWidth: 360 }}>
		{rows.map(r => (
			<div key={r.name} style={{ display: 'grid', gap: 6 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
					<span className="sp-data">{r.name}</span>
					<span className="sp-meta">{r.meta}</span>
				</div>
				{r.gauge}
			</div>
		))}
	</div>
);

export const Progress = () => (
	<div style={col}>
		<div style={item}>
			<span className="sp-data">Importing orders</span>
			<Gauge thin value={45} aria-label="Import progress" />
			<span className="sp-meta">18 of 40 orders</span>
		</div>
		<div style={item}>
			<span className="sp-data">Refunds against spend</span>
			<Gauge value={30} negative aria-label="Refunds, August" />
			<span className="sp-meta">-1.240 kr. returned</span>
		</div>
	</div>
);
