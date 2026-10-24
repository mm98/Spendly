import { useState } from 'react'
import { Segmented } from '../../react/src/components/Segmented.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default {
	title: 'Controls/Segmented',
	component: Segmented,
	argTypes: { variant: { control: 'inline-radio', options: ['default', 'facet', 'narrow', 'fill'] } },
	render: args => {
		const [value, setValue] = useState(args.options[0].value)
		return <Segmented {...args} value={value} onChange={setValue} />
	}
}

export const TwoOptions = { args: { name: 'chart', options: [{ value: 'stacked', label: 'Stacked' }, { value: 'total', label: 'Total' }] } }
export const Three = { args: { name: 'view', options: [{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }, { value: 'table', label: 'Table' }] } }
export const Fill = { args: { ...Three.args, name: 'fill', variant: 'fill' } }
export const Months = { args: { name: 'month', fixed: true, options: MONTHS.map(m => ({ value: m, label: m })) } }
