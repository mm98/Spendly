import { useState } from 'react'
import { Chip } from '../../react/src/components/Chip.jsx'
import { Pill } from '../../react/src/components/Pill.jsx'

export default {
	title: 'Controls/Chip and Pill',
	component: Chip,
	args: { children: 'Indbo Møbler' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['outline', 'solid', 'dashed', 'pill'] },
		color: { control: 'inline-radio', options: ['default', 'danger', 'success'] }
	}
}

export const Outline = {}
export const Solid = { args: { variant: 'solid' } }
export const Dashed = { args: { variant: 'dashed', children: 'No category' } }
export const Danger = { args: { color: 'danger', children: 'Over the limit' } }
export const Clickable = { args: { onClick: () => {} } }

export const Facets = {
	render: () => {
		const [picked, setPicked] = useState(['Delivered'])
		const toggle = (on, value) => setPicked(on ? [...picked, value] : picked.filter(v => v !== value))
		return (
			<div className="sp-row-flex sp-gap-8">
				{['Delivered', 'Ordered', 'Draft'].map((status, i) => (
					<Chip key={status} variant="facet" count={[12, 4, 2][i]} selected={picked.includes(status)} onSelect={toggle}>{status}</Chip>
				))}
				<Chip variant="facet" count={0} disabled>Returned</Chip>
			</div>
		)
	}
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
