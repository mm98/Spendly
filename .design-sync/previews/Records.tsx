import { Records, Record, ListToolbar, ListMore, Pill } from 'spendly-react';

const photo = (ground: string, ink: string) =>
	`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="${ground}"/><rect x="34" y="44" width="92" height="40" rx="8" fill="${ink}"/></svg>`)}`;

const ORDERS = [
	{ ref: 'SPENDLY-447', name: 'Indbo Møbler', when: '08/08/2026 · 4 items', amount: '24.310,00', pill: 'Approved', color: 'success', src: photo('#e7ece4', '#5f7d5a') },
	{ ref: 'SPENDLY-448', name: 'Bilka', when: '12/08/2026 · 9 items', amount: '1.896,50', pill: 'Ordered', color: 'default', src: photo('#f1ebe0', '#c9a46a') },
	{ ref: 'SPENDLY-450', name: 'HAY', when: '19/08/2026 · 1 item', amount: '890,00', pill: 'Approved', color: 'success', src: '' }
];

export const OrderGrid = () => (
	<Records
		head={
			<ListToolbar loose selectAll={{ selectedCount: 0, total: 3, noun: 'orders', onToggleAll: () => {} }}>
				<strong className="sp-data">3 orders</strong>
				<span className="sp-subtitle">· 27.096,50 kr.</span>
			</ListToolbar>
		}
		footer={<ListMore loose shown={3} total={18} pageSize={3} onMore={() => {}} />}
	>
		{ORDERS.map(o => (
			<Record
				key={o.ref}
				photos={o.src ? [<img key="p" src={o.src} alt="" />] : []}
				empty="No photo yet"
				title={o.name}
				subtitle={o.ref}
				status={<Pill color={o.color}>{o.pill}</Pill>}
				meta={<span className="sp-subtitle">{o.when}</span>}
				amount={o.amount}
				onClick={() => {}}
			/>
		))}
	</Records>
);
