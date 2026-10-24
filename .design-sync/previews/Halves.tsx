import { Card, CardHeader, Field, Halves, TextField, Well } from 'spendly-react';

export const TwoWells = () => (
	<div style={{ maxWidth: 560 }}>
		<Card>
			<CardHeader name="August" />
			<Halves>
				<Well>
					<span className="sp-section-label">Income</span>
					<span className="sp-stat__figure">42.000 kr.</span>
				</Well>
				<Well>
					<span className="sp-section-label">Spent</span>
					<span className="sp-stat__figure">24.310 kr.</span>
					<span className="sp-meta">Across 18 orders</span>
				</Well>
			</Halves>
		</Card>
	</div>
);

export const TwoFields = () => (
	<div style={{ maxWidth: 560 }}>
		<Halves>
			<Field label="First name"><TextField value="Mikkel" onChange={() => {}} /></Field>
			<Field label="Last name"><TextField value="Munk" onChange={() => {}} /></Field>
		</Halves>
	</div>
);
