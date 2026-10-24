import { Card, Cards, Kbd, Mark, NavItem, SearchInput, Shell, ShellContent, Sidebar, SidebarAccount, SidebarBrand, SidebarDivider, SidebarGrip, SidebarGroup, TopBar } from 'spendly-react';

// Shell sorts its children by type, so Sidebar, TopBar and ShellContent are written as its direct children.

export const Expanded = () => (
	<Shell>
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
			<span className="sp-grow" />
			<SidebarDivider />
			<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" onClick={() => {}} />
			<SidebarGrip expanded onClick={() => {}} />
		</Sidebar>
		<TopBar>
			<SearchInput value="" onChange={() => {}} placeholder="Search orders, vendors, items…" aria-label="Search orders" kbd={<Kbd>⌘K</Kbd>} />
		</TopBar>
		<ShellContent>
			<Cards>
				<Card>
					<span className="sp-section-label">August</span>
					<span className="sp-stat__figure">61.480,00 kr.</span>
				</Card>
				<Card>
					<span className="sp-section-label">July</span>
					<span className="sp-stat__figure">54.120,00 kr.</span>
				</Card>
			</Cards>
		</ShellContent>
	</Shell>
);

export const Collapsed = () => (
	<Shell collapsed>
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
		<TopBar>
			<SearchInput value="" onChange={() => {}} placeholder="Search orders, vendors, items…" aria-label="Search orders" kbd={<Kbd>⌘K</Kbd>} />
		</TopBar>
		<ShellContent layout="split">
			<Card>
				<span className="sp-title">Indbo Møbler</span>
				<span className="sp-subtitle">SPENDLY-447 · 24.310,00 kr.</span>
			</Card>
			<Card>
				<span className="sp-section-label">Total</span>
				<span className="sp-stat__figure">24.310,00 kr.</span>
			</Card>
		</ShellContent>
	</Shell>
);
