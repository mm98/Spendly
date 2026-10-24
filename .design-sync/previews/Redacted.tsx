import { Card, Pill, Redacted, Stat } from 'spendly-react';

export const InAFigure = () => (
	<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 220px)', gap: 16 }}>
		<Card><Stat label="Left over" figure={<Redacted />} /></Card>
		<Card><Stat label="Income" figure={<Redacted />} /></Card>
	</div>
);

export const InTextAndPill = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
		<span className="sp-data">Salary <Redacted /></span>
		<Pill>Left <Redacted /></Pill>
	</div>
);
