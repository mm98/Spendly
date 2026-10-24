import { Card, Fab, TabBar, TabBarItem, TopBar } from 'spendly-react';

export const AboveTheTabBar = () => (
	<div className="sp-phone sp-touch">
		<TopBar touch>
			<span className="sp-title sp-grow">Home</span>
		</TopBar>
		<Card>
			<span className="sp-section-label">August</span>
			<span className="sp-stat__figure">61.480,00 kr.</span>
		</Card>
		<Fab to="/orders/new" aria-label="New order" />
		<TabBar aria-label="Sections">
			<TabBarItem icon="home" current to="/">Home</TabBarItem>
			<TabBarItem icon="receipt" to="/orders">Orders</TabBarItem>
			<TabBarItem icon="building-store" to="/vendors">Vendors</TabBarItem>
			<TabBarItem icon="dots-vertical">More</TabBarItem>
		</TabBar>
	</div>
);

export const Alone = () => (
	<div style={{ display: 'flex', gap: 16 }}>
		<Fab aria-label="New order" onClick={() => {}} />
		<Fab icon="camera" aria-label="Scan a receipt" onClick={() => {}} />
	</div>
);
