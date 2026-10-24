import { List, Caption, ListHead, ListRow, ListCell, Foot, Mark, Stacked, Pill, IconButton, Button } from 'spendly-react';

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
