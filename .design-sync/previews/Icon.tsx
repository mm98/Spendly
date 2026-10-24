import { Icon } from 'spendly-react';

const NAMES = [
	'plus', 'minus', 'x', 'check', 'pencil', 'trash',
	'search', 'filter', 'calendar', 'clock', 'receipt', 'wallet',
	'chevron-left', 'chevron-right', 'chevron-down', 'dots-vertical', 'external-link', 'download',
	'upload', 'paperclip', 'photo', 'file-text', 'tag', 'building-store',
	'alert-circle', 'alert-triangle', 'info-circle', 'help-circle', 'settings', 'user'
];

export const Register = () => (
	<div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12 }}>
		{NAMES.map(name => (
			<div key={name} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
				<Icon name={name} />
				<span className="sp-meta">{name}</span>
			</div>
		))}
	</div>
);

export const Sizes = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'end' }}>
		<Icon name="receipt" size={13} />
		<Icon name="receipt" />
		<Icon name="receipt" size={20} />
		<Icon name="receipt" size={24} />
	</div>
);

export const TakesTheInk = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
		<span className="sp-data" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="check" /> Saved</span>
		<span className="sp-ink-danger" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="alert-circle" /> 2.100 kr. over</span>
		<span className="sp-meta" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="clock" /> 19/08</span>
	</div>
);
