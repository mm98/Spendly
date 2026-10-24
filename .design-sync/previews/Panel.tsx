import { Card, CardHeader, Panel, Sum } from 'spendly-react';

const details = (
	<Card>
		<CardHeader name="Details" />
		<span className="sp-data">Indbo Møbler</span>
		<span className="sp-meta">SPENDLY-447 · 08/08/2026</span>
	</Card>
);
const totals = (
	<Card>
		<Sum value="3.640,00 kr.">Items</Sum>
		<Sum value="340,00 kr.">Shipping</Sum>
		<Sum variant="total" value="3.980,00 kr.">Total</Sum>
	</Card>
);

export const Rail = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
		<Panel>{details}{totals}</Panel>
	</div>
);

export const Wide = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
		<Panel wide>{details}{totals}</Panel>
	</div>
);
