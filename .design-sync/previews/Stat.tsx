import { Card, Cards, Stat } from 'spendly-react';

export const InCards = () => (
	<Cards>
		<Card><Stat label="August" figure="61.480,00 kr." delta="Saved 8.240,00 kr." /></Card>
		<Card><Stat label="Orders" figure="18" delta="Saved 1.320,00 kr." /></Card>
		<Card><Stat label="Same amount" figure="42" meta="Found in the budget" /></Card>
	</Cards>
);

export const Large = () => (
	<div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
		<Stat large label="Orders" figure="40" />
		<Stat large label="Item lines" figure="126" />
		<Stat large label="Total" figure="52.560 kr." />
	</div>
);

export const Colors = () => (
	<Cards>
		<Card><Stat label="Saved in August" figure="8.240,00 kr." color="success" /></Card>
		<Card><Stat label="Saved in September" figure="0,00 kr." color="zero" meta="No discounts yet" /></Card>
		<Card><Stat label="Havemøbler" figure="9.480 kr." help="39% of all spend in August" /></Card>
		<Card><Stat label="Belysning" figure="6.300 kr." help="1.300 kr. over its limit" helpColor="danger" /></Card>
	</Cards>
);

export const Bare = () => (
	<div style={{ maxWidth: 320 }}>
		<Card>
			<div className="sp-stack sp-gap-6">
				<Stat bare large label="Spend, August" figure="24.100 kr." meta="Of a 22.000 kr. limit" />
			</div>
		</Card>
	</div>
);
