import { EmailLine } from 'spendly-react';

export const Tones = () => (
	<div style={{ display: 'grid', gap: 10, maxWidth: 320 }}>
		<EmailLine email="mikkel.munk@lomwas.dk" />
		<EmailLine email="mikkel.munk@lomwas.dk" tone="meta" />
		<EmailLine email="mikkel.munk@lomwas.dk" tone="nav" />
	</div>
);

export const Narrow = () => (
	<div style={{ display: 'grid', gap: 10, width: 230 }}>
		<EmailLine email="karen.christiansen.indkob@indbo-mobler.dk" />
		<EmailLine email="karen.christiansen.indkob@indbo-mobler.dk" tone="meta" />
	</div>
);
