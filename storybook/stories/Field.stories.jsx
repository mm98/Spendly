import { useState } from 'react'
import { Field } from '../../react/src/components/Field.jsx'
import { TextField, NumberField } from '../../react/src/components/Inputs.jsx'
import { IconButton } from '../../react/src/components/Button.jsx'
import { expect } from 'storybook/test'

const Text = ({ initial = '', ...rest }) => {
	const [value, setValue] = useState(initial)
	return <TextField value={value} onChange={setValue} {...rest} />
}

export default {
	title: 'Fields/Field',
	component: Field,
	argTypes: { children: { control: false }, trail: { control: false } },
	args: { label: 'Vendor', message: '', children: <Text initial="Indbo Møbler" /> },
	decorators: [Story => <div style={{ maxWidth: 360 }}><Story /></div>]
}

export const Plain = {}
export const Required = { args: { required: true } }
export const Hint = { args: { label: 'Reference', message: 'Yours, if you use one.', children: <Text placeholder="Optional" /> } }
export const Warning = { args: { label: 'Date', messageType: 'warning', message: 'Later than the usual date.', children: <Text initial="24.12.2026" /> } }
export const Danger = { args: { label: 'Amount', messageType: 'danger', message: 'An amount is required.', children: <NumberField value={null} onChange={() => {}} locale="da-DK" /> } }
export const WithUnit = { args: { label: 'Amount', unit: 'kr.', children: <NumberField value={1320} onChange={() => {}} locale="da-DK" /> } }
export const WithLead = {
	args: { label: 'Search', lead: 'search', children: <Text placeholder="Search" /> },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.sp-field__lead svg')).toBeInTheDocument()
		await expect(canvasElement.querySelector('.sp-field__lead').textContent).toBe('')
	}
}
export const WithTrail = { args: { label: 'Name', trail: <IconButton icon="x" aria-label="Clear" size="field" />, children: <Text initial="Value" /> } }
export const WithKey = {
	args: { label: 'Search', kbd: 'S', children: <Text placeholder="Search" /> },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.sp-field__kbd kbd.sp-kbd')).toHaveTextContent('S')
	}
}
export const Note = { args: { label: 'Vendor', note: 'matched existing vendor', noteType: 'success' } }

export const States = {
	argTypes: { label: { control: false }, message: { control: false } },
	render: ({ messageType, required }) => (
		<div className="sp-stack sp-gap-12">
			<Field label="Disabled" required={required} messageType={messageType}><TextField value="Value" onChange={() => {}} disabled /></Field>
			<Field label="Read-only"><TextField value="Value" onChange={() => {}} readOnly /></Field>
			<Field label="Empty"><Text variant="empty" placeholder="Nothing yet" /></Field>
			<Field label="Note"><Text multiline rows={3} initial="A note on the order." /></Field>
		</div>
	)
}
