import { Mark, Spinner } from 'spendly-react';

export const OnALine = () => (
	<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
		<Spinner />
		<span className="sp-subtitle">Reading the receipt</span>
	</div>
);

export const InAMark = () => (
	<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
		<Mark size="xlarge" fill="photo" aria-label="Uploading the receipt from Bilka"><Spinner /></Mark>
		<span className="sp-subtitle">Uploading the receipt from Bilka</span>
	</div>
);
