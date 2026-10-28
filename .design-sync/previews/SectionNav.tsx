import { Card, CardBody, CardHeader, MenuSeparator, NavItem, SectionNav } from 'spendly-react';

const column = { display: 'flex', height: 520 } as const;
const page = { display: 'flex', height: 360, gap: 24 } as const;

export const Settings = () => (
	<div style={column}>
		<SectionNav label="Settings">
			<NavItem variant="light" to="/settings/account" current>Account and profile</NavItem>
			<NavItem variant="light" to="/settings/appearance">Appearance</NavItem>
			<NavItem variant="light" to="/settings/money">Money, dates and times</NavItem>
			<NavItem variant="light" to="/settings/defaults">Defaults</NavItem>
			<NavItem variant="light" to="/settings/lists">Lists</NavItem>
			<NavItem variant="light" to="/settings/alerts">Limit alerts</NavItem>
			<MenuSeparator variant="divider" />
			<NavItem variant="light" to="/settings/import">Import</NavItem>
			<NavItem variant="light" to="/settings/demo">Demo data</NavItem>
			<NavItem variant="light" to="/settings/build">This build</NavItem>
		</SectionNav>
	</div>
);

export const BesideThePane = () => (
	<div style={page}>
		<SectionNav label="Settings">
			<NavItem variant="light" to="/settings/account">Account and profile</NavItem>
			<NavItem variant="light" to="/settings/appearance" current>Appearance</NavItem>
			<NavItem variant="light" to="/settings/money">Money, dates and times</NavItem>
			<MenuSeparator variant="divider" />
			<NavItem variant="light" to="/settings/import">Import</NavItem>
		</SectionNav>
		<div style={{ flex: 1, minWidth: 0 }}>
			<Card>
				<CardHeader name="Appearance" />
				<CardBody><span className="sp-meta">How dense the lists are, and which month the figures compare with.</span></CardBody>
			</Card>
		</div>
	</div>
);
