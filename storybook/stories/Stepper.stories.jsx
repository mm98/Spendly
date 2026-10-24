import { useState } from 'react'
import { Stepper } from '../../react/src/components/Stepper.jsx'
import { Field } from '../../react/src/components/Field.jsx'

export default {
	title: 'Fields/Stepper',
	component: Stepper,
	render: args => {
		const [value, setValue] = useState(args.value)
		return <Field label={args.label}><Stepper {...args} label={undefined} value={value} onChange={setValue} /></Field>
	}
}

export const Quantity = { args: { label: 'Quantity', value: 1, min: 1 } }
export const AtTheTop = { args: { label: 'Quantity', value: 5, min: 1, max: 5 } }
export const Fractions = { args: { label: 'Metres', value: 2.5, step: 0.25, min: 0, locale: 'da-DK' } }
