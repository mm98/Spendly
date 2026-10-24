import { Choice, FieldGroup, Radio } from 'spendly-react';

const noop = () => {};

export const Default = () => (
	<div style={{ maxWidth: 360 }}>
		<FieldGroup legend="Where the amount comes from">
			<Choice variant="row" control={<Radio name="amount-source" checked onChange={noop} />}>The receipt total</Choice>
			<Choice variant="row" control={<Radio name="amount-source" checked={false} onChange={noop} />}>The sum of the lines</Choice>
		</FieldGroup>
	</div>
);

export const Described = () => (
	<div style={{ maxWidth: 360 }}>
		<FieldGroup legend="What happens on import">
			<Choice variant="described" control={<Radio name="import" checked onChange={noop} />}
				description="Rows that match an existing order are skipped.">Skip duplicates</Choice>
			<Choice variant="described" control={<Radio name="import" checked={false} onChange={noop} />}
				description="Every row is kept, and duplicates are flagged for review.">Keep everything</Choice>
		</FieldGroup>
	</div>
);

export const Disabled = () => (
	<div style={{ maxWidth: 360 }}>
		<FieldGroup legend="Status">
			<Choice variant="row" control={<Radio name="status" checked onChange={noop} />}>Approved</Choice>
			<Choice variant="row" control={<Radio name="status" checked={false} onChange={noop} />}>In progress</Choice>
			<Choice variant="row" control={<Radio name="status" checked={false} onChange={noop} disabled />}>Returned</Choice>
		</FieldGroup>
	</div>
);
