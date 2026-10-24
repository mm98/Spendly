import { Field, Stepper } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' } as const;

export const Default = () => (
	<div style={{ width: 140 }}>
		<Stepper aria-label="Quantity" value={2} min={1} max={99} onChange={() => {}} />
	</div>
);

export const InAField = () => (
	<div style={{ width: 200 }}>
		<Field label="Quantity">
			<Stepper value={4} min={1} max={20} onChange={() => {}} />
		</Field>
	</div>
);

export const AtTheBounds = () => (
	<div style={row}>
		<Stepper aria-label="Quantity" value={1} min={1} max={4} onChange={() => {}} />
		<Stepper aria-label="Chairs" value={4} min={1} max={4} onChange={() => {}} />
	</div>
);

export const Decimals = () => (
	<div style={{ width: 140 }}>
		<Stepper aria-label="Metres" value={2.75} min={0} max={10} step={0.25} locale="da-DK" onChange={() => {}} />
	</div>
);
