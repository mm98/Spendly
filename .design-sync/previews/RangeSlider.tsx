import { Field, FieldGroup, RangeSlider } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 320 } as const;
const noop = () => {};
const kr = (n: number) => new Intl.NumberFormat('da-DK').format(n);

export const Default = () => (
	<div style={col}>
		<Field label="Amount between">
			<RangeSlider value={[800, 4200]} onChange={noop} min={0} max={6000} step={100} label="Amount" format={kr} />
		</Field>
	</div>
);

export const OpenTop = () => (
	<div style={col}>
		<Field label="Amount between" message="The top end means that amount and above.">
			<RangeSlider value={[500, 25000]} onChange={noop} stops={[0, 250, 500, 1000, 2500, 5000, 10000, 25000]} open label="Amount" format={kr} />
		</Field>
	</div>
);

export const InFacet = () => (
	<div style={{ maxWidth: 260 }}>
		<FieldGroup facet legend="Amount" meta="0 - 25.000">
			<RangeSlider value={[0, 25000]} onChange={noop} stops={[0, 250, 500, 1000, 2500, 5000, 10000, 25000]} open label="Amount" format={kr} />
		</FieldGroup>
	</div>
);

export const SingleValue = () => (
	<div style={col}>
		<Field label="Closest amount" message="An order this close to the payment counts as a match.">
			<RangeSlider value={150} onChange={noop} min={0} max={500} step={10} label="Difference" format={kr} />
		</Field>
		<Field label="Days apart">
			<RangeSlider value={4} onChange={noop} min={0} max={14} entry={false} label="Days apart" />
		</Field>
	</div>
);
