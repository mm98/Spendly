import { ListToolbar } from 'spendly-react';

export const Loose = () => (
	<ListToolbar loose selectAll={{ selectedCount: 0, total: 12, noun: 'orders', onToggleAll: () => {} }}>
		<strong className="sp-data">48 orders</strong>
		<span className="sp-subtitle">· 61.480,00 kr.</span>
	</ListToolbar>
);

export const SomePicked = () => (
	<ListToolbar loose selectAll={{ selectedCount: 5, total: 12, noun: 'orders', onToggleAll: () => {} }}>
		<strong className="sp-data">48 orders</strong>
	</ListToolbar>
);

export const Plain = () => (
	<ListToolbar>
		<strong className="sp-data">16 bookmarks</strong>
	</ListToolbar>
);
