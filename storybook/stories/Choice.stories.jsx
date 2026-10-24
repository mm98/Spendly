import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Check, Radio, Switch, Choice, FieldGroup, FieldGroupValues, FieldGroupMore, Picker } from '../../react/src/components/Choice.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { knownAccessibilityFaults, useHeld } from './controls.js'

const SWATCHES = ['green', 'green-2', 'green-3', 'green-4', 'green-5', 'amber-ink', 'amber-2', 'red-ink', 'ink-6']
const GLYPHS = ['armchair', 'lamp', 'flower', 'bookmark', 'shopping-bag', 'receipt', 'tag', 'diamond']

// The box beside the words: which kind it is, and its own state, are the story's controls.
const BOXES = { check: Check, radio: Radio, switch: Switch }

export default {
	title: 'Fields/Choice',
	component: Choice,
	subcomponents: { Check, Radio, Switch, FieldGroup, FieldGroupValues, FieldGroupMore, Picker }
}

const box = ({ args, ...story } = {}) => ({
	args: { children: 'Skip duplicates', box: 'check', checked: true, disabled: false, indeterminate: false, onChange: fn(), ...args },
	argTypes: {
		box: { control: 'inline-radio', options: Object.keys(BOXES), description: 'Which box the story puts in `control`' },
		checked: { description: 'The box\'s own `checked`' },
		disabled: { description: 'The box\'s own `disabled`' },
		indeterminate: { description: 'A checkbox standing for some of a set', if: { arg: 'box', eq: 'check' } },
		description: { if: { arg: 'variant', eq: 'described' } },
		control: { control: false }
	},
	render: args => {
		const [checked, setChecked] = useHeld(args, 'checked')
		const { box, checked: _, disabled, indeterminate, onChange, ...rest } = args
		const Box = BOXES[box]
		const change = e => { setChecked(e.target.checked); onChange(e) }
		return (
			<Choice {...rest} control={
				<Box name="choice" checked={checked} disabled={disabled} onChange={change} {...(box === 'check' ? { indeterminate } : {})} />
			} />
		)
	},
	...story
})

export const Checkbox = box({
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Skip duplicates'))
		await expect(args.onChange).toHaveBeenCalledOnce()
		await waitFor(() => expect(canvas.getByRole('checkbox')).not.toBeChecked())
	}
})
export const SomeOfTheSet = box({ args: { indeterminate: true, checked: false, children: 'Some of the set' } })
export const RadioButton = box({ args: { box: 'radio', children: 'The receipt total' } })
export const AppliesAtOnce = box({
	args: { box: 'switch', children: 'Applies at once' },
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('switch'))
		await waitFor(() => expect(canvas.getByRole('switch')).not.toBeChecked())
	}
})
export const Disabled = box({ args: { disabled: true, children: 'Disabled' } })
export const Described = box({
	parameters: { a11y: knownAccessibilityFaults },
	args: { box: 'radio', variant: 'described', children: 'Skip duplicates', description: 'Rows that match an existing order are skipped.' }
})

export const Groups = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { legend: 'Where the amount comes from', variant: 'row' },
	argTypes: { legend: { control: 'text', description: 'The group\'s `legend`' } },
	render: ({ legend, variant }) => (
		<div className="sp-stack sp-gap-16" style={{ maxWidth: 420 }}>
			<FieldGroup legend={legend}>
				<Choice variant={variant} control={<Radio name="amount" defaultChecked />}>The receipt total</Choice>
				<Choice variant={variant} control={<Radio name="amount" />}>The sum of the lines</Choice>
			</FieldGroup>
			<FieldGroup legend="What happens on import">
				<Choice variant="described" control={<Radio name="import" defaultChecked />} description="Rows that match an existing order are skipped.">Skip duplicates</Choice>
				<Choice variant="described" control={<Radio name="import" />} description="Every row is kept, and duplicates are flagged for review.">Keep everything</Choice>
			</FieldGroup>
		</div>
	)
}

export const Facet = {
	args: { legend: 'Vendor', count: 2, onMore: fn() },
	render: ({ legend, count, onMore }) => (
		<div style={{ maxWidth: 260 }}>
			<FieldGroup legend={legend} facet count={count}>
				<FieldGroupValues>
					{['Indbo Møbler', 'HAY', 'Muuto', 'Bilka'].map((name, i) => (
						<Choice key={name} variant="row" control={<Check defaultChecked={i < 2} />}>{name}</Choice>
					))}
				</FieldGroupValues>
				<FieldGroupMore onClick={onMore}>Show 6 more</FieldGroupMore>
			</FieldGroup>
		</div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Show 6 more'))
		await expect(args.onMore).toHaveBeenCalledOnce()
		const fold = canvas.getByRole('button', { name: /Vendor/ })
		await userEvent.click(fold)
		await expect(fold).toHaveAttribute('aria-expanded', 'false')
		await userEvent.click(fold)
	}
}

const pickerStory = extra => ({
	render: ({ onChange, ...args }) => {
		const [value, setValue] = useHeld(args, 'value')
		return (
			<Field label={args['aria-label']}>
				<Picker {...args} {...extra} value={value} onChange={next => { setValue(next); onChange(next) }} />
			</Field>
		)
	}
})

export const Colours = {
	parameters: { a11y: knownAccessibilityFaults, variantsOf: Picker },
	...pickerStory({ swatches: SWATCHES, customIcon: <Icon name="plus" /> }),
	args: { 'aria-label': 'Colour', value: 'green-2', custom: true, onChange: fn() },
	argTypes: { value: { control: 'select', options: SWATCHES } },
	play: async ({ args, canvas }) => {
		const mid = canvas.getByRole('button', { name: 'Mid green' })
		await userEvent.click(mid)
		await expect(args.onChange).toHaveBeenCalledWith('green-3')
		await waitFor(() => expect(mid).toHaveAttribute('aria-pressed', 'true'))
	}
}

export const Icons = {
	parameters: { variantsOf: Picker },
	...pickerStory({ icons: GLYPHS.map(name => ({ name, icon: <Icon name={name} /> })) }),
	args: { 'aria-label': 'Icon', value: 'armchair', onChange: fn() },
	argTypes: { value: { control: 'select', options: GLYPHS } }
}
