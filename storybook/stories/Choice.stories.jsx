import { useState } from 'react'
import { Check, Radio, Switch, Choice, FieldGroup, FieldGroupValues, FieldGroupMore, Picker } from '../../react/src/components/Choice.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'

export default {
	title: 'Fields/Choice',
	component: Choice
}

export const Boxes = {
	render: () => (
		<div className="sp-stack sp-gap-8">
			<Choice control={<Check defaultChecked />}>Checkbox</Choice>
			<Choice control={<Check indeterminate />}>Some of the set</Choice>
			<Choice control={<Check disabled />}>Disabled</Choice>
			<Choice control={<Radio name="one" defaultChecked />}>Radio</Choice>
			<Choice control={<Switch defaultChecked />}>Applies at once</Choice>
		</div>
	)
}

export const Groups = {
	render: () => (
		<div className="sp-stack sp-gap-16" style={{ maxWidth: 420 }}>
			<FieldGroup legend="Where the amount comes from">
				<Choice variant="row" control={<Radio name="amount" defaultChecked />}>The receipt total</Choice>
				<Choice variant="row" control={<Radio name="amount" />}>The sum of the lines</Choice>
			</FieldGroup>
			<FieldGroup legend="What happens on import">
				<Choice variant="described" control={<Radio name="import" defaultChecked />} description="Rows that match an existing order are skipped.">Skip duplicates</Choice>
				<Choice variant="described" control={<Radio name="import" />} description="Every row is kept, and duplicates are flagged for review.">Keep everything</Choice>
			</FieldGroup>
		</div>
	)
}

export const Facet = {
	render: () => (
		<div style={{ maxWidth: 260 }}>
			<FieldGroup legend="Vendor" facet count={2}>
				<FieldGroupValues>
					{['Indbo Møbler', 'HAY', 'Muuto', 'Bilka'].map((name, i) => (
						<Choice key={name} variant="row" control={<Check defaultChecked={i < 2} />}>{name}</Choice>
					))}
				</FieldGroupValues>
				<FieldGroupMore onClick={() => {}}>Show 6 more</FieldGroupMore>
			</FieldGroup>
		</div>
	)
}

export const Colours = {
	render: () => {
		const [swatch, setSwatch] = useState('green-2')
		return (
			<Field label="Colour">
				<Picker aria-label="Colour" swatches={['green', 'green-2', 'green-3', 'green-4', 'green-5', 'amber-ink', 'amber-2', 'red-ink', 'ink-6']}
					value={swatch} onChange={setSwatch} custom customIcon={<Icon name="plus" />} />
			</Field>
		)
	}
}

export const Icons = {
	render: () => {
		const [glyph, setGlyph] = useState('armchair')
		return (
			<Field label="Icon">
				<Picker aria-label="Icon" value={glyph} onChange={setGlyph}
					icons={['armchair', 'lamp', 'flower', 'bookmark', 'shopping-bag', 'receipt', 'tag', 'diamond'].map(name => ({ name, icon: <Icon name={name} /> }))} />
			</Field>
		)
	}
}
