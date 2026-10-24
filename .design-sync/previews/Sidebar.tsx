import { Mark, NavItem, Sidebar, SidebarAccount, SidebarBrand, SidebarDivider, SidebarGrip, SidebarGroup } from 'spendly-react';

const frame = { display: 'flex', height: 560 } as const;

export const Expanded = () => (
	<div style={{ ...frame, width: 248 }}>
		<Sidebar>
			<SidebarBrand>
				<Mark size="small" fill="solid">S</Mark>
				<span className="sp-strong">Spendly</span>
			</SidebarBrand>
			<NavItem icon="home" current>Home</NavItem>
			<SidebarGroup>Orders</SidebarGroup>
			<NavItem icon="receipt" count={18}>All orders</NavItem>
			<NavItem icon="building-store" count={24}>Vendors</NavItem>
			<NavItem icon="category" count={6}>Categories</NavItem>
			<SidebarDivider />
			<SidebarGroup>Needs attention</SidebarGroup>
			<NavItem icon="bookmark" count={4} countColor="warning">No receipt</NavItem>
			<NavItem icon="settings">Settings</NavItem>
			<span className="sp-grow" />
			<SidebarDivider />
			<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" onClick={() => {}} />
			<SidebarGrip expanded onClick={() => {}} />
		</Sidebar>
	</div>
);

export const Rail = () => (
	<div style={frame}>
		<Sidebar variant="rail">
			<SidebarBrand>
				<Mark size="small" fill="solid">S</Mark>
				<span className="sp-strong">Spendly</span>
			</SidebarBrand>
			<NavItem icon="home" current tip="Home">Home</NavItem>
			<SidebarGroup>Orders</SidebarGroup>
			<NavItem icon="receipt" count={18} tip="All orders">All orders</NavItem>
			<NavItem icon="building-store" count={24} tip="Vendors">Vendors</NavItem>
			<NavItem icon="category" count={6} tip="Categories">Categories</NavItem>
			<SidebarDivider />
			<NavItem icon="bookmark" count={4} countColor="warning" tip="No receipt">No receipt</NavItem>
			<span className="sp-grow" />
			<SidebarDivider />
			<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" tip="Camilla Lomholt" onClick={() => {}} />
			<SidebarGrip expanded={false} onClick={() => {}} />
		</Sidebar>
	</div>
);
