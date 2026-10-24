import { Kbd, ListItem } from 'spendly-react';

const line = { display: 'flex', gap: 8, alignItems: 'center' } as const;

export const Shortcuts = () => (
	<div style={{ display: 'grid', gap: 10 }}>
		<div style={line}><Kbd>S</Kbd><span className="sp-subtitle">focuses the search</span></div>
		<div style={line}><Kbd>N</Kbd><span className="sp-subtitle">starts an order</span></div>
		<div style={line}><Kbd>⌘K</Kbd><span className="sp-subtitle">opens the search everywhere</span></div>
	</div>
);

export const Accent = () => (
	<div style={{ width: 280 }}>
		<ListItem variant="primary">
			<span className="sp-data">Shortcuts</span>
			<span className="sp-grow" />
			<Kbd accent>?</Kbd>
		</ListItem>
	</div>
);
