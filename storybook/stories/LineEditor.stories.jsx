import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { LineEditor, Totals } from '../../react/src/components/LineEditor.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { TextField, NumberField } from '../../react/src/components/Inputs.jsx'
import { Card } from '../../react/src/components/Card.jsx'

export default {
	title: 'Lists/Line editor',
	component: LineEditor,
	subcomponents: { Totals },
	decorators: [Story => <div style={{ maxWidth: 640 }}><Card variant="flush"><Story /></Card></div>],
	args: {
		title: 'Line 2 of 4', what: 'line', commit: 'Save line', first: false, last: false, saving: false, handle: false, sheet: false,
		onMoveUp: fn(), onMoveDown: fn(), onDelete: fn(), onCommit: fn(), onCancel: fn()
	},
	argTypes: { photo: { control: false }, children: { control: false } }
}

export const EditALine = {
		render: args => {
		const [name, setName] = useState('Lounge chair')
		const [price, setPrice] = useState(4129)
		return (
			<LineEditor {...args}>
				<Field label="What was bought"><TextField value={name} onChange={setName} /></Field>
				<Field label="Price" unit="kr."><NumberField value={price} onChange={setPrice} locale="da-DK" /></Field>
			</LineEditor>
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Save line' }))
		await expect(args.onCommit).toHaveBeenCalledOnce()
		await userEvent.click(canvas.getByRole('textbox', { name: 'What was bought' }))
		await userEvent.keyboard('{Escape}')
		await expect(args.onCancel).toHaveBeenCalledOnce()
	}
}

export const Saving = {
		args: { title: 'Line 1 of 1', first: true, last: true, saving: true, onMoveUp: undefined, onMoveDown: undefined, onDelete: undefined },
	render: args => (
		<LineEditor {...args}>
			<Field label="What was bought"><TextField value="Lounge chair" onChange={() => {}} /></Field>
		</LineEditor>
	)
}

export const TotalsLine = {
	args: { summary: '4 items · 3.980,00 kr. paid', saved: 'Saved 1.320,00 kr.' },
	argTypes: { summary: { control: 'text', description: 'The line\'s first words' }, saved: { control: 'text', description: 'The amount at its end' } },
	render: ({ summary, saved }) => (
		<Totals>
			<span className="sp-strong">{summary}</span>
			<span className="sp-grow" />
			<span className="sp-amount-secondary" data-color="success">{saved}</span>
		</Totals>
	)
}
