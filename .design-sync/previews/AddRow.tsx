import { AddRow, Card, CardHeader, ListItem } from 'spendly-react';

export const Default = () => (
	<div style={{ width: 360 }}>
		<AddRow onClick={() => {}}>Add a row to Home</AddRow>
	</div>
);

export const UnderRows = () => (
	<div style={{ width: 400 }}>
		<Card>
			<CardHeader name="Home" aside="3 rows" />
			<ListItem><span className="sp-data">Rent</span><span className="sp-grow" /><span className="sp-amount">9.800,00</span></ListItem>
			<ListItem><span className="sp-data">Electricity</span><span className="sp-grow" /><span className="sp-amount">640,00</span></ListItem>
			<ListItem><span className="sp-data">Internet</span><span className="sp-grow" /><span className="sp-amount">249,00</span></ListItem>
			<AddRow onClick={() => {}}>Add a row to Home</AddRow>
		</Card>
	</div>
);
