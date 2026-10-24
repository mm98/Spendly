import { Button } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' } as const;

export const Variants = () => (
	<div style={row}>
		<Button>Save order</Button>
		<Button variant="outline">Duplicate</Button>
		<Button variant="text">Cancel</Button>
	</div>
);

export const Colors = () => (
	<div style={{ display: 'grid', gap: 12 }}>
		{(['solid', 'outline', 'text'] as const).map(variant => (
			<div key={variant} style={row}>
				<Button variant={variant}>Save</Button>
				<Button variant={variant} color="warning">Review limit</Button>
				<Button variant={variant} color="danger">Delete</Button>
			</div>
		))}
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<Button>Standard</Button>
		<Button size="small">Small</Button>
		<Button size="xsmall" variant="outline">Xsmall</Button>
	</div>
);

export const WithIcons = () => (
	<div style={row}>
		<Button iconStart="plus">Add line</Button>
		<Button variant="outline" iconEnd="chevron-right">Continue</Button>
		<Button color="danger" iconStart="trash">Delete order</Button>
	</div>
);

export const States = () => (
	<div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
		<div style={row}>
			<Button disabled>Save order</Button>
			<Button variant="outline" disabled>Duplicate</Button>
		</div>
		<Button fullWidth>Create order</Button>
	</div>
);
