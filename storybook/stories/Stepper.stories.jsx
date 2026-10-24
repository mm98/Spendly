import { expect, fn, userEvent } from 'storybook/test'
import { Stepper } from '../../react/src/components/Stepper.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { useHeld } from './controls.js'

export default {
	title: 'Fields/Stepper',
	component: Stepper,
	args: { onChange: fn() },
	argTypes: { label: { control: 'text', description: 'The Field\'s label, which names the value and its buttons' } },
	render: ({ label, onChange, ...args }) => {
		const [value, setValue] = useHeld(args, 'value')
		return <Field label={label}><Stepper {...args} value={value} onChange={next => { setValue(next); onChange(next) }} /></Field>
	}
}

export const Quantity = {
	args: { label: 'Quantity', value: 1, min: 1 },
	play: async ({ args, canvas }) => {
		const buttons = canvas.getAllByRole('button')
		await userEvent.click(buttons[buttons.length - 1])
		await expect(args.onChange).toHaveBeenLastCalledWith(2)
		await expect(buttons[0]).toBeEnabled()
	}
}
export const AtTheTop = { args: { label: 'Quantity', value: 5, min: 1, max: 5 } }
export const Fractions = { args: { label: 'Metres', value: 2.5, step: 0.25, min: 0, locale: 'da-DK' } }
