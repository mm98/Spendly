import { Chip, IconButton } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const;

export const Variants = () => (
	<div style={row}>
		<Chip>Decor</Chip>
		<Chip variant="solid">Lighting</Chip>
		<Chip variant="dashed">No category</Chip>
		<Chip variant="pill">Kitchen</Chip>
		<Chip color="danger">Over limit</Chip>
		<Chip color="success">Within budget</Chip>
	</div>
);

export const Clickable = () => (
	<div style={row}>
		<Chip onClick={() => {}}>Decor</Chip>
		<Chip variant="dashed" onClick={() => {}}>+ New: Garden</Chip>
		<Chip variant="pill" onClick={() => {}}>Bilka</Chip>
	</div>
);

export const WithTrail = () => (
	<div style={row}>
		<Chip variant="solid" trail={<IconButton icon="x" size="small" aria-label="Clear the vendor filter" />}>Vendor: IKEA</Chip>
		<Chip variant="solid" trail={<IconButton icon="x" size="small" aria-label="Clear the date filter" />}>August 2026</Chip>
	</div>
);

export const Facets = () => (
	<div style={row}>
		<Chip variant="facet" defaultSelected count="12">Decor</Chip>
		<Chip variant="facet" count="4">Lighting</Chip>
		<Chip variant="facet" defaultSelected count="7">Kitchen</Chip>
		<Chip variant="facet" disabled count="0">Garden</Chip>
	</div>
);

export const FacetRadios = () => (
	<div style={row}>
		<Chip variant="facet" inputType="radio" name="preview-status" value="done" selected onSelect={() => {}}>Approved</Chip>
		<Chip variant="facet" inputType="radio" name="preview-status" value="progress" selected={false} onSelect={() => {}}>In progress</Chip>
		<Chip variant="facet" inputType="radio" name="preview-status" value="cancelled" selected={false} onSelect={() => {}}>Failed</Chip>
	</div>
);
