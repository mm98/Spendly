import { Crumbs, Crumb } from 'spendly-react';

export const DrillPath = () => (
	<Crumbs root="All spend">
		<Crumb key="c" onOpen={() => {}} onRemove={() => {}}>Furniture</Crumb>
		<Crumb key="v" name="Indbo Møbler" onRemove={() => {}}>Indbo Møbler</Crumb>
	</Crumbs>
);

export const OneLevel = () => (
	<Crumbs root="August 2026">
		<Crumb key="c" name="Lighting" onRemove={() => {}}>Lighting</Crumb>
	</Crumbs>
);

export const RootOnly = () => (
	<Crumbs root="All spend" />
);
