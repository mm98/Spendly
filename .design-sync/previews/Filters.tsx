import { Filters, Crumb, Chip } from 'spendly-react';

export const Crumbs = () => (
	<Filters onClear={() => {}}>
		<Crumb name="the date range" onRemove={() => {}}>1 Aug - 31 Aug 2026</Crumb>
		<Crumb onRemove={() => {}}>Indbo Møbler</Crumb>
		<Crumb onRemove={() => {}}>Approved</Crumb>
		<Crumb name="the search text" onRemove={() => {}}>"sofa"</Crumb>
	</Filters>
);

export const OneCrumb = () => (
	<Filters>
		<Crumb onRemove={() => {}}>Over the limit</Crumb>
	</Filters>
);

export const FacetChips = () => (
	<div style={{ maxWidth: 280 }}>
		<Filters>
			<Chip variant="facet" value="furniture" selected onSelect={() => {}} count="12">Furniture</Chip>
			<Chip variant="facet" value="lighting" selected={false} onSelect={() => {}} count="4">Lighting</Chip>
			<Chip variant="facet" value="garden" selected={false} onSelect={() => {}} count="7">Garden</Chip>
			<Chip variant="facet" value="kitchen" selected={false} disabled onSelect={() => {}} count="0">Kitchen</Chip>
		</Filters>
	</div>
);
