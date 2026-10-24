import { Field, TokensField, IconButton } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 380 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Field label="Other names for this vendor" message="Press Enter after each name.">
			<TokensField value={['Indbo', 'Indbo Møbler ApS', 'INDBO.DK']} onChange={noop} placeholder="Add…" />
		</Field>
		<Field label="Vendors this rule covers">
			<TokensField value={[]} onChange={noop} placeholder="Add a vendor" />
		</Field>
	</div>
);

export const Marked = () => (
	<div style={col}>
		<Field label="Other names" note="matched existing vendor" noteType="success">
			<TokensField value={['IKEA', 'IKEA Taastrup', 'IKEA A/S']} marked="IKEA Taastrup" onChange={noop} placeholder="Add…" />
		</Field>
		<Field label="Categories">
			<TokensField value={['Decor', 'Lighting', 'Garden']} trails={{ Decor: <span className="sp-combobox__dot" data-dot="returned" /> }}
				onChange={noop} placeholder="Add…" />
		</Field>
	</div>
);

export const States = () => (
	<div style={col}>
		<Field label="Other names" messageType="danger" message="Bilka already uses the name Føtex.">
			<TokensField value={['Bilka', 'Føtex']} onChange={noop} placeholder="Add…" />
		</Field>
		<Field label="Tags">
			<TokensField value={['Living room', 'Gift']} onChange={noop} placeholder="Add…" end={<IconButton icon="plus" aria-label="Add from the list" size="field" />} />
		</Field>
	</div>
);
