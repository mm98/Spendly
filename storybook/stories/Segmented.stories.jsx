import { expect, fn, userEvent } from 'storybook/test'
import { Segmented } from '../../react/src/components/Segmented.jsx'
import { useHeld } from './controls.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const THREE = [{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }, { value: 'table', label: 'Table' }]

export default {
	title: 'Controls/Segmented',
	component: Segmented,
	args: { onChange: fn() },
	render: ({ onChange, ...args }) => {
		const [value, setValue] = useHeld(args, 'value')
		return <Segmented {...args} value={value} onChange={next => { setValue(next); onChange(next) }} />
	}
}

export const TwoOptions = {
	args: { name: 'chart', value: 'stacked', options: [{ value: 'stacked', label: 'Stacked' }, { value: 'total', label: 'Total' }] },
	argTypes: { value: { control: 'inline-radio', options: ['stacked', 'total'] } },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Total'))
		await expect(args.onChange).toHaveBeenCalledWith('total')
		await expect(canvas.getByRole('radio', { name: 'Total' })).toBeChecked()
	}
}
export const Three = {
	args: { name: 'view', value: 'list', options: THREE },
	argTypes: { value: { control: 'inline-radio', options: THREE.map(o => o.value) } }
}
export const Small = {
	args: { ...TwoOptions.args, name: 'small', size: 'small' },
	argTypes: TwoOptions.argTypes,
	play: async ({ canvas }) => {
		const group = canvas.getByRole('radio', { name: 'Total' }).closest('.sp-segmented')
		const small = getComputedStyle(document.documentElement).getPropertyValue('--btn-h-small').trim()
		await expect(`${group.getBoundingClientRect().height}px`).toBe(small)
	}
}
export const Fill = { ...Three, args: { ...Three.args, name: 'fill', variant: 'fill' } }
export const Months = {
	args: { name: 'month', value: 'Aug', fixed: true, options: MONTHS.map(m => ({ value: m, label: m })) },
	argTypes: { value: { control: 'select', options: MONTHS } }
}
