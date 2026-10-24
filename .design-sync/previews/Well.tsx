import { Card, Well } from 'spendly-react';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, alignItems: 'start' } as const;

export const Variants = () => (
	<div style={grid}>
		<Card>
			<Well>
				<span className="sp-title">Decor</span>
				<span className="sp-subtitle">12.400 of 22.000 kr. for August.</span>
			</Well>
		</Card>
		<Card>
			<Well variant="quiet">
				<span className="sp-data">18 records</span>
				<span className="sp-subtitle">Read from the August statement.</span>
			</Well>
		</Card>
		<Card>
			<Well variant="snippet">
				<span className="sp-data">https://spendly.lomwas.dk/mcp</span>
			</Well>
		</Card>
	</div>
);

export const Colors = () => (
	<div style={grid}>
		<Card>
			<Well color="warning">
				<span className="sp-title">Decor is close to its limit</span>
				<span className="sp-subtitle">20.900 of 22.000 kr. for August.</span>
			</Well>
		</Card>
		<Card>
			<Well color="danger">
				<span className="sp-title">Two rows were not imported</span>
				<span className="sp-subtitle">Rows 14 and 22 have no price.</span>
			</Well>
		</Card>
	</div>
);
