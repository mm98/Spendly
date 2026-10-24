import { Sidebar, SidebarAccount } from 'spendly-react';

const col = { display: 'grid', width: 248 } as const;

export const WithName = () => (
	<div style={col}>
		<Sidebar>
			<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" onClick={() => {}} />
		</Sidebar>
	</div>
);

export const EmailOnly = () => (
	<div style={col}>
		<Sidebar>
			<SidebarAccount email="indkob@bilka-partner.dk" onClick={() => {}} />
		</Sidebar>
	</div>
);

export const OnTheRail = () => (
	<div style={{ display: 'flex' }}>
		<Sidebar variant="rail">
			<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" tip="Camilla Lomholt" onClick={() => {}} />
		</Sidebar>
	</div>
);
