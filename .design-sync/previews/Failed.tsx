import { Failed } from 'spendly-react';

const box = { maxWidth: 480 } as const;

export const Page = () => (
	<div style={box}>
		<Failed what="Your orders" error={{ status: 500 }} onRetry={() => {}} />
	</div>
);

export const NoConnection = () => (
	<div style={box}>
		<Failed what="Your categories" error={{ status: 0 }} onRetry={() => {}} />
	</div>
);

export const InACard = () => (
	<div style={{ maxWidth: 360 }}>
		<Failed variant="card" label="This month" what="This month" error={{ status: 503 }} onRetry={() => {}} />
	</div>
);

export const Gone = () => (
	<div style={box}>
		<Failed what="The order" error={{ status: 404 }} back={{ to: '/orders', label: 'Back to the orders' }} onRetry={() => {}} />
	</div>
);
