import { IconButton, Kbd, SearchInput, Stacked, TopBar } from 'spendly-react';

const frame = { border: '1px solid var(--line-3)', borderRadius: 'var(--r-card)', overflow: 'hidden', background: 'var(--bg)' } as const;
const phone = { ...frame, width: 390 } as const;

export const Desktop = () => (
	<div style={{ ...frame, width: 860, paddingBottom: 48 }}>
	<TopBar>
		<SearchInput value="" onChange={() => {}} placeholder="Search orders, vendors, items…" aria-label="Search orders" kbd={<Kbd>⌘K</Kbd>} />
	</TopBar>
	</div>
);

export const TouchWithBack = () => (
	<div style={phone}>
		<TopBar touch>
			<IconButton icon="chevron-left" aria-label="Back to the orders" />
			<Stacked>
				<span className="sp-title">Indbo Møbler</span>
				<span className="sp-subtitle">SPENDLY-441</span>
			</Stacked>
			<IconButton icon="dots-vertical" aria-label="This order" />
		</TopBar>
	</div>
);

export const TouchTitle = () => (
	<div style={phone}>
		<TopBar touch>
			<span className="sp-title sp-grow">Orders</span>
		</TopBar>
	</div>
);
