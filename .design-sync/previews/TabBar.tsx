import { Card, TabBar, TabBarItem, TopBar } from 'spendly-react';

export const InAPhone = () => (
	<div className="sp-phone sp-touch">
		<TopBar touch>
			<span className="sp-title sp-grow">Orders</span>
		</TopBar>
		<Card>
			<span className="sp-title">Indbo Møbler</span>
			<span className="sp-subtitle">SPENDLY-447 · 24.310,00 kr.</span>
		</Card>
		<Card>
			<span className="sp-title">Bilka</span>
			<span className="sp-subtitle">SPENDLY-441 · 3.980,00 kr.</span>
		</Card>
		<TabBar aria-label="Sections">
			<TabBarItem icon="home" to="/">Home</TabBarItem>
			<TabBarItem icon="receipt" current to="/orders">Orders</TabBarItem>
			<TabBarItem icon="building-store" to="/vendors">Vendors</TabBarItem>
			<TabBarItem icon="dots-vertical">More</TabBarItem>
		</TabBar>
	</div>
);

export const Bar = () => (
	<div style={{ width: 390 }}>
		<TabBar aria-label="Sections">
			<TabBarItem icon="home" current to="/">Home</TabBarItem>
			<TabBarItem icon="receipt" to="/orders">Orders</TabBarItem>
			<TabBarItem icon="building-store" to="/vendors">Vendors</TabBarItem>
			<TabBarItem icon="settings" to="/settings">Settings</TabBarItem>
		</TabBar>
	</div>
);
