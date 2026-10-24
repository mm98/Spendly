import { Check, Chip, Choice, Field, FieldGroup, FieldGroupMore, FieldGroupPanel, FieldGroupValues, Filters, Radio, RangeSlider, TextField } from 'spendly-react';

const noop = () => {};
const rail = { maxWidth: 260 } as const;
const kr = (n: number) => new Intl.NumberFormat('da-DK').format(n);

export const Default = () => (
	<div style={{ maxWidth: 360 }}>
		<FieldGroup legend="Where the amount comes from">
			<Choice variant="row" control={<Radio name="fg-source" checked onChange={noop} />}>The receipt total</Choice>
			<Choice variant="row" control={<Radio name="fg-source" checked={false} onChange={noop} />}>The sum of the lines</Choice>
		</FieldGroup>
	</div>
);

export const Facet = () => (
	<div style={rail}>
		<FieldGroup facet legend="Vendor" count="24 total">
			<FieldGroupValues>
				<Choice control={<Check checked onChange={noop} />}>Bilka · 9</Choice>
				<Choice control={<Check checked={false} onChange={noop} />}>IKEA · 6</Choice>
				<Choice control={<Check checked={false} onChange={noop} />}>Indbo Møbler · 7</Choice>
				<Choice control={<Check checked={false} onChange={noop} />}>HAY · 3</Choice>
			</FieldGroupValues>
			<FieldGroupMore onClick={noop}>Show 20 more</FieldGroupMore>
		</FieldGroup>
	</div>
);

export const WithMeta = () => (
	<div style={rail}>
		<FieldGroup facet legend="Amount" meta="0 - 6.000">
			<RangeSlider value={[800, 4200]} onChange={noop} min={0} max={6000} step={100} label="Amount" format={kr} />
		</FieldGroup>
	</div>
);

export const WithPanel = () => (
	<div style={rail}>
		<FieldGroup facet legend="Date">
			<Filters>
				<Chip variant="facet" inputType="radio" name="fg-date" value="month" selected={false} onSelect={noop}>This month</Chip>
				<Chip variant="facet" inputType="radio" name="fg-date" value="year" selected={false} onSelect={noop}>This year</Chip>
				<Chip variant="facet" inputType="radio" name="fg-date" value="custom" data-preset="custom" selected onSelect={noop}>Custom…</Chip>
			</Filters>
			<FieldGroupPanel>
				<Field label="From"><TextField value="01.08.2026" onChange={noop} /></Field>
				<Field label="To"><TextField value="31.08.2026" onChange={noop} /></Field>
			</FieldGroupPanel>
		</FieldGroup>
	</div>
);
