import { Check, Choice, FieldGroup, Radio, Switch } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Choice control={<Check checked onChange={noop} />}>Keep the receipt with the order</Choice>
		<Choice control={<Radio name="choice-kind" checked onChange={noop} />}>Pay by card</Choice>
		<Choice control={<Switch checked={false} onChange={noop} />}>Compare with July</Choice>
	</div>
);

export const Row = () => (
	<div style={{ maxWidth: 360 }}>
		<FieldGroup legend="Status">
			<Choice variant="row" control={<Radio name="choice-row" checked onChange={noop} />}>Approved</Choice>
			<Choice variant="row" control={<Radio name="choice-row" checked={false} onChange={noop} />}>In progress</Choice>
			<Choice variant="row" control={<Radio name="choice-row" checked={false} onChange={noop} />}>Returned</Choice>
		</FieldGroup>
	</div>
);

export const Described = () => (
	<div style={{ display: 'grid', gap: 12, maxWidth: 380 }}>
		<Choice variant="described" control={<Radio name="choice-described" checked onChange={noop} />}
			description="Rows that match an existing order are skipped.">Skip duplicates</Choice>
		<Choice variant="described" control={<Radio name="choice-described" checked={false} onChange={noop} />}
			description="Every row is kept, and duplicates are flagged for review." descriptionTone="help">Keep everything</Choice>
	</div>
);
