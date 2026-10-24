import { Field, Icon, Picker } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 380 } as const;
const noop = () => {};
const glyphs = ['armchair', 'lamp', 'flower', 'bookmark', 'shopping-bag', 'receipt', 'tag', 'diamond'];

export const Swatches = () => (
	<div style={col}>
		<Field label="Colour">
			<Picker aria-label="Colour" swatches={['green', 'green-2', 'green-3', 'green-4', 'green-5', 'amber-ink', 'amber-2', 'red-ink', 'ink-6']}
				value="green-3" onChange={noop} custom customIcon={<Icon name="plus" />} />
		</Field>
		<Field label="A colour of its own">
			<Picker aria-label="A colour of its own" swatches={['green', 'amber-ink', 'red-ink']} value="#3f5d6b" onChange={noop} custom customIcon={<Icon name="plus" />} />
		</Field>
	</div>
);

export const Icons = () => (
	<div style={col}>
		<Field label="Icon">
			<Picker aria-label="Icon" icons={glyphs.map(name => ({ name, icon: <Icon name={name} /> }))} value="lamp" onChange={noop} />
		</Field>
	</div>
);

export const Searched = () => (
	<div style={col}>
		<Picker icons={[...glyphs.slice(0, 5).map(name => ({ name, icon: <Icon name={name} /> })), { name: 'loading-1', loading: true }, { name: 'loading-2', loading: true }]}
			value="armchair" onChange={noop} search="" onSearch={noop} searchLabel="Find an icon" noun="icons" more="+42" onMore={noop} />
	</div>
);

export const NothingFound = () => (
	<div style={col}>
		<Picker icons={[]} value="" onChange={noop} search="sofa bed" onSearch={noop} searchLabel="Find an icon" noun="icons" empty="No icon by that name." />
	</div>
);
