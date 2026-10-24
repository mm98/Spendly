import { Pill } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const;

export const Colors = () => (
	<div style={row}>
		<Pill>Draft</Pill>
		<Pill color="success">Approved</Pill>
		<Pill color="danger">Failed</Pill>
	</div>
);

export const Progress = () => (
	<div style={row}>
		<Pill state="progress">Scanning</Pill>
		<Pill color="danger">2.100 over</Pill>
		<Pill color="success">Left 1.480 kr.</Pill>
	</div>
);

export const Truncated = () => (
	<div style={{ width: 160 }}>
		<Pill truncate>Waiting for the receipt from Indbo Møbler</Pill>
	</div>
);
