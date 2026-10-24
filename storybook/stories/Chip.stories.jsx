import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { Chip } from '../../react/src/components/Chip.jsx'
import { Pill } from '../../react/src/components/Pill.jsx'
import { knownAccessibilityFaults } from './controls.js'

export default {
	title: 'Controls/Chip and Pill',
	component: Chip,
	subcomponents: { Pill },
	args: { children: 'Indbo Møbler' },
	argTypes: { trail: { control: false } }
}

export const Outline = {}
export const Solid = { args: { variant: 'solid' } }
export const Dashed = { parameters: { a11y: knownAccessibilityFaults }, args: { variant: 'dashed', children: 'No category' } }
export const Danger = { args: { color: 'danger', children: 'Over the limit' } }
export const Clickable = {
	args: { onClick: fn() },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Indbo Møbler' }))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}
export const Facet = { args: { variant: 'facet', children: 'Delivered', count: 12, defaultSelected: true, disabled: false, onSelect: fn() } }

export const Facets = {
	args: { onSelect: fn() },
	render: ({ onSelect }) => {
		const [picked, setPicked] = useState(['Delivered'])
		const toggle = (on, value) => { setPicked(on ? [...picked, value] : picked.filter(v => v !== value)); onSelect(on, value) }
		return (
			<div className="sp-row-flex sp-gap-8">
				{['Delivered', 'Ordered', 'Draft'].map((status, i) => (
					<Chip key={status} variant="facet" count={[12, 4, 2][i]} selected={picked.includes(status)} onSelect={toggle}>{status}</Chip>
				))}
				<Chip variant="facet" count={0} disabled>Returned</Chip>
			</div>
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Ordered'))
		await expect(args.onSelect).toHaveBeenCalledWith(true, 'Ordered')
		await expect(canvas.getByRole('checkbox', { name: /Ordered/ })).toBeChecked()
		await expect(canvas.getByRole('checkbox', { name: /Returned/ })).toBeDisabled()
	}
}

export const OnePill = {
	args: { color: 'default', state: undefined, truncate: false, children: 'Approved' },
	argTypes: { color: { control: 'inline-radio', options: ['default', 'success', 'danger'] }, state: { control: 'inline-radio', options: [undefined, 'progress'] } },
	render: args => <Pill {...args} />
}

export const Pills = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			<Pill>Default</Pill>
			<Pill color="success">Approved</Pill>
			<Pill color="danger">Failed</Pill>
			<Pill state="progress">Scanning</Pill>
		</div>
	)
}
