import { List, ListMore, ListToolbar, Record, Caption, ListHead, ListRow, ListCell, Foot, Mark, Stacked, Pill, IconButton, Button } from 'spendly-react';

const ORDERS = [
	{ ref: 'SPENDLY-447', name: 'Indbo Møbler', date: '08/08/2026', pill: 'Approved', color: 'success', amount: '24.310,00', saved: 'Saved 1.240,00' },
	{ ref: 'SPENDLY-448', name: 'Bilka', date: '12/08/2026', pill: 'Ordered', color: 'default', amount: '1.896,50', saved: 'Saved 0,00' },
	{ ref: 'SPENDLY-449', name: 'IKEA', date: '15/08/2026', pill: 'Returned', color: 'danger', amount: '4.129,00', saved: 'Saved 310,00' },
	{ ref: 'SPENDLY-450', name: 'HAY', date: '19/08/2026', pill: 'Approved', color: 'success', amount: '890,00', saved: 'Saved 0,00' },
	{ ref: 'SPENDLY-451', name: 'Illums Bolighus', date: '22/08/2026', pill: 'Cancelled', color: 'default', amount: '3.980,00', saved: 'Saved 0,00' }
];
type Order = typeof ORDERS[number];

const head = (check: boolean) => (
	<ListHead>
		{check ? <ListCell cell="checkbox" /> : null}
		<ListCell width="title">Order</ListCell>
		<ListCell width="date">Date</ListCell>
		<ListCell width="status">Status</ListCell>
		<ListCell width="amount">Amount</ListCell>
		<ListCell width="menu" />
	</ListHead>
);

const row = (check: boolean) => (
	<ListRow>{(o: Order) => (
		<>
			{check ? <ListCell cell="checkbox" /> : null}
			<ListCell cell="flex">
				<Mark size="medium" fill="solid">{o.name}</Mark>
				<Stacked>
					<span className="sp-title sp-truncate">{o.name}</span>
					<span className="sp-subtitle">{o.ref}</span>
				</Stacked>
			</ListCell>
			<ListCell><span className="sp-data sp-number">{o.date}</span></ListCell>
			<ListCell><Pill color={o.color}>{o.pill}</Pill></ListCell>
			<ListCell cell="amount">
				<span className="sp-amount">{o.amount}</span>
				<span className="sp-amount-secondary" data-color={o.saved === 'Saved 0,00' ? undefined : 'success'}>{o.saved}</span>
			</ListCell>
			<ListCell cell="menu"><IconButton icon="dots-vertical" aria-label={`Order ${o.ref}`} /></ListCell>
		</>
	)}</ListRow>
);

export const Orders = () => (
	<List data={ORDERS.slice(0, 4)} recordKey={(o: Order) => o.ref} noun="orders" rowTo={(o: Order) => `/orders/${o.ref}`}>
		<Caption>
			<strong className="sp-data">4 orders</strong>
			<span className="sp-subtitle">· 31.225,50 kr.</span>
		</Caption>
		{head(true)}
		{row(true)}
	</List>
);

export const Picked = () => (
	<List data={ORDERS.slice(0, 4)} recordKey={(o: Order) => o.ref} noun="orders" picked={['SPENDLY-447', 'SPENDLY-449']} onPick={() => {}}
		bulkNote={<span className="sp-subtitle">2 of 48 matching orders are picked.</span>}>
		{head(true)}
		{row(true)}
	</List>
);

export const PagedWithVoid = () => (
	<List data={ORDERS} recordKey={(o: Order) => o.ref} noun="orders" pageSize={3} rowVoid={(o: Order) => o.pill === 'Cancelled'} onRowClick={() => {}}>
		{head(false)}
		{row(false)}
	</List>
);

export const CompactWithFoot = () => (
	<List data={ORDERS} recordKey={(o: Order) => o.ref} noun="orders" compact rowVoid={(o: Order) => o.pill === 'Cancelled'}>
		{head(false)}
		{row(false)}
		<Foot><Button variant="outline" size="small">Export 5 orders</Button></Foot>
	</List>
);

const photo = (ground: string, ink: string) =>
	`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="${ground}"/><rect x="34" y="44" width="92" height="40" rx="8" fill="${ink}"/></svg>`)}`;

const CARD_ORDERS = [
	{ ref: 'SPENDLY-447', name: 'Indbo Møbler', when: '08/08/2026 · 4 items', amount: '24.310,00', pill: 'Approved', color: 'success', src: photo('#e7ece4', '#5f7d5a') },
	{ ref: 'SPENDLY-448', name: 'Bilka', when: '12/08/2026 · 9 items', amount: '1.896,50', pill: 'Ordered', color: 'default', src: photo('#f1ebe0', '#c9a46a') },
	{ ref: 'SPENDLY-450', name: 'HAY', when: '19/08/2026 · 1 item', amount: '890,00', pill: 'Approved', color: 'success', src: '' }
];

export const Cards = () => (
	<List
		body="cards"
		head={
			<ListToolbar loose selectAll={{ selectedCount: 0, total: 3, noun: 'orders', onToggleAll: () => {} }}>
				<strong className="sp-data">3 orders</strong>
				<span className="sp-subtitle">· 27.096,50 kr.</span>
			</ListToolbar>
		}
		footer={<ListMore loose shown={3} total={18} pageSize={3} onMore={() => {}} />}
	>
		{CARD_ORDERS.map(o => (
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
	</List>
);
