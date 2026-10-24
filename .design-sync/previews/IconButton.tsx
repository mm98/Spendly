import { IconButton } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' } as const;

export const Variants = () => (
	<div style={row}>
		<IconButton icon="dots-vertical" aria-label="This order" />
		<IconButton icon="dots-vertical" variant="outline" aria-label="More for Indbo Møbler" />
		<IconButton icon="dots-vertical" variant="quiet" aria-label="More for SPENDLY-447" />
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<IconButton icon="pencil" aria-label="Edit the order" />
		<IconButton icon="x" size="small" aria-label="Clear the vendor filter" />
		<IconButton icon="x" size="field" aria-label="Clear the search" />
		<IconButton icon="x" size="xsmall" aria-label="Remove Bilka" />
	</div>
);

export const DangerAndLink = () => (
	<div style={row}>
		<IconButton icon="trash" danger aria-label="Remove line" />
		<IconButton icon="trash" variant="outline" danger aria-label="Delete the order" />
		<IconButton icon="chevron-left" to="/orders" aria-label="Back to the orders" />
		<IconButton icon="external-link" href="https://www.ikea.com/dk/" aria-label="Open IKEA's page" />
	</div>
);

export const Disabled = () => (
	<div style={row}>
		<IconButton icon="dots-vertical" disabled aria-label="More" />
		<IconButton icon="download" variant="outline" disabled aria-label="Download the receipt" />
	</div>
);
