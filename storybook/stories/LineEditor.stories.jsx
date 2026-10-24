import { useState } from 'react'
import { LineEditor, Totals } from '../../react/src/components/LineEditor.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { TextField, NumberField } from '../../react/src/components/Inputs.jsx'
import { Card } from '../../react/src/components/Card.jsx'

export default {
	title: 'Lists/Line editor',
	component: LineEditor,
	decorators: [Story => <div style={{ maxWidth: 640 }}><Card variant="flush"><Story /></Card></div>]
}

export const EditALine = {
	render: () => {
		const [name, setName] = useState('Lounge chair')
		const [price, setPrice] = useState(4129)
		return (
			<LineEditor title="Line 2 of 4" what="line" commit="Save line" onMoveUp={() => {}} onMoveDown={() => {}} onDelete={() => {}} onCommit={() => {}} onCancel={() => {}}>
				<Field label="What was bought"><TextField value={name} onChange={setName} /></Field>
				<Field label="Price" unit="kr."><NumberField value={price} onChange={setPrice} locale="da-DK" /></Field>
			</LineEditor>
		)
	}
}

export const Saving = {
	render: () => (
		<LineEditor title="Line 1 of 1" what="line" commit="Save line" first last saving onCommit={() => {}} onCancel={() => {}}>
			<Field label="What was bought"><TextField value="Lounge chair" onChange={() => {}} /></Field>
		</LineEditor>
	)
}

export const TotalsLine = {
	render: () => (
		<Totals>
			<span className="sp-strong">4 items · 3.980,00 kr. paid</span>
			<span className="sp-grow" />
			<span className="sp-amount-secondary" data-color="success">Saved 1.320,00 kr.</span>
		</Totals>
	)
}
