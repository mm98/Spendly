import { Segmented } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;

export const Default = () => (
	<div style={col}>
		<Segmented name="preview-view" options={[{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }]} value="list" onChange={() => {}} />
		<Segmented name="preview-period" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value="month" onChange={() => {}} />
	</div>
);

export const Variants = () => (
	<div style={col}>
		<Segmented name="preview-facet" variant="facet" options={[{ value: 'any', label: 'Any' }, { value: 'open', label: 'Open' }, { value: 'archived', label: 'Archived' }]} value="any" onChange={() => {}} />
		<Segmented name="preview-narrow" variant="narrow" options={[{ value: 's', label: 'Stacked' }, { value: 't', label: 'Total' }]} value="s" onChange={() => {}} />
	</div>
);

export const Fill = () => (
	<div style={{ width: 360 }}>
		<Segmented name="preview-fill" variant="fill" options={[{ value: 'all', label: 'Every change' }, { value: 'done', label: 'When done' }, { value: 'never', label: 'Never' }]} value="done" onChange={() => {}} />
	</div>
);

export const DisabledOption = () => (
	<Segmented name="preview-disabled" options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'Mine' }, { value: 'flagged', label: 'Flagged', disabled: true }]} value="all" onChange={() => {}} />
);

export const FixedMonths = () => (
	<Segmented
		name="preview-months"
		fixed
		options={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => ({ value: m.toLowerCase(), label: m }))}
		value="mar"
		onChange={() => {}}
	/>
);
