import { Icon, NavItem, Sidebar, Switch } from 'spendly-react';

const dark = { display: 'grid', width: 248 } as const;
const light = { display: 'grid', gap: 6, width: 280, padding: 16, background: 'var(--surface)', border: '1px solid var(--line-3)', borderRadius: 'var(--r-card)' } as const;

export const InTheSidebar = () => (
	<div style={dark}>
		<Sidebar>
			<NavItem icon="home" current>Home</NavItem>
			<NavItem icon="receipt" count={18} to="/orders">All orders</NavItem>
			<NavItem icon="bookmark" count={4} countColor="warning">No receipt</NavItem>
			<NavItem variant="action" icon="plus" to="/orders/new">New order</NavItem>
			<NavItem mark={<span className="sp-nav-item__icon" />} sub="3 more in Orders" />
		</Sidebar>
	</div>
);

export const Light = () => (
	<div style={light}>
		<NavItem variant="light" icon="receipt" current count={142}>All orders</NavItem>
		<NavItem variant="light" icon="shopping-bag" count={6}>Bilka deliveries</NavItem>
		<NavItem variant="edited" icon="filter" count={11}>IKEA this year</NavItem>
		<NavItem variant="light" icon="receipt" trail={<span className="sp-meta">locked</span>}>Returns</NavItem>
	</div>
);

export const Reordering = () => (
	<div style={light}>
		<NavItem variant="light" handle={<Icon name="grip-vertical" size={12} />} handleLabel="Move Bilka deliveries">Bilka deliveries</NavItem>
		<NavItem variant="picked" handle={<Icon name="grip-vertical" size={12} />} handleLabel="Move IKEA this year">IKEA this year</NavItem>
		<NavItem variant="carried" handle={<Icon name="grip-vertical" size={12} />} handleLabel="Move Indbo Møbler">Indbo Møbler</NavItem>
	</div>
);

export const WithSwitch = () => (
	<div style={light}>
		<NavItem variant="light" icon="bookmark" control={<Switch defaultChecked />}>Show No receipt</NavItem>
		<NavItem variant="light" icon="message-circle" control={<Switch />}>Show Ask</NavItem>
	</div>
);
