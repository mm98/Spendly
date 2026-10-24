import { Card, Sum, Well } from 'spendly-react';

const box = { maxWidth: 380 } as const;

export const OrderTotal = () => (
	<div style={box}>
		<Card>
			<Sum value="3.640,00 kr.">Items</Sum>
			<Sum value="340,00 kr.">Shipping</Sum>
			<Sum variant="total" value="3.980,00 kr.">Total</Sum>
		</Card>
	</div>
);

export const Details = () => (
	<div style={box}>
		<Card>
			<Sum value="Indbo Møbler">Vendor</Sum>
			<Sum value="19 Aug 2026">Date</Sum>
			<Sum value="Delivered">Status</Sum>
			<Sum variant="stacked" value={<Well>Two chairs arrive in week 36. The table came with the first delivery.</Well>}>Note</Sum>
		</Card>
	</div>
);

export const Tones = () => (
	<div style={box}>
		<Card>
			<Sum edits value="12.000,00 kr." meta="Every month">Havemøbler</Sum>
			<Sum edits tone="expected" value="5.000,00 kr." meta="Planned only">Belysning</Sum>
			<Sum named value="2.400,00 kr.">Garden cushions and covers for the terrace sofa</Sum>
			<Sum variant="total" tone="success" value="4.600,00 kr.">Left over</Sum>
		</Card>
	</div>
);

export const OverBudget = () => (
	<div style={box}>
		<Card>
			<Sum value="22.000,00 kr.">Limit</Sum>
			<Sum value="24.100,00 kr.">Spent</Sum>
			<Sum variant="total" tone="danger" value="-2.100,00 kr.">Left over</Sum>
		</Card>
	</div>
);
