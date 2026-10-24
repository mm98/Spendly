import { Card, CardHeader, Cards, Stat } from 'spendly-react';

export const Grid = () => (
	<Cards>
		<Card><Stat label="August" figure="61.480,00 kr." delta="Saved 8.240,00 kr." /></Card>
		<Card><Stat label="Orders" figure="18" delta="Saved 1.320,00 kr." /></Card>
		<Card><Stat label="This week" figure="7.310,00 kr." /></Card>
	</Cards>
);

export const Fluid = () => (
	<Cards fluid>
		{['Indbo Møbler', 'Bilka', 'IKEA', 'Ferm Living', 'HAY'].map((name, i) => (
			<Card key={name}>
				<CardHeader name={name} />
				<span className="sp-data">{['24.310 kr.', '8.920 kr.', '6.480 kr.', '3.150 kr.', '2.890 kr.'][i]}</span>
			</Card>
		))}
	</Cards>
);
