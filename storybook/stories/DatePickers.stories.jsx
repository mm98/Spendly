import { expect, fn, userEvent } from 'storybook/test'
import { RangePicker, RangeSheet, PeriodPicker, PeriodWindow, DateField } from '../../react/src/components/DatePickers.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { knownAccessibilityFaults, useHeld } from './controls.js'

const LOCALES = { control: 'inline-radio', options: ['da-DK', 'en-GB', 'de-DE'] }
const day = description => ({ control: 'text', description: `${description}, as yyyy-mm-dd` })

export default {
	title: 'Fields/Dates',
	component: DateField,
	subcomponents: { RangePicker, RangeSheet, PeriodPicker, PeriodWindow },
	decorators: [Story => <div style={{ minHeight: 480 }}><Story /></div>],
	args: { locale: 'da-DK', onChange: fn() },
	argTypes: { locale: LOCALES }
}

const dateField = ({ label, message, onChange, ...args }) => {
	const [value, setValue] = useHeld(args, 'value')
	return (
		<div style={{ maxWidth: 280 }}>
			<Field label={label} message={message}>
				<DateField {...args} value={value} onChange={next => { setValue(next); onChange(next) }} />
			</Field>
		</div>
	)
}

export const Date = {
	args: { label: 'Date', value: '2026-08-14', danger: false, showWeeks: true, shortcuts: true },
	argTypes: { value: day('The day'), label: { control: 'text', description: 'The Field\'s label' } },
	render: dateField
}

export const DateWithClosedDays = {
	args: {
		label: 'Delivery', message: 'Deliveries run Monday to Friday, and two days are already full.',
		value: '2026-08-14', native: false, min: '2026-08-01', max: '2026-09-30', full: ['2026-08-12', '2026-08-19']
	},
	argTypes: { value: day('The day'), min: day('The first day'), max: day('The last day'), full: { description: 'Days the story closes, besides weekends' } },
	render: ({ full, ...args }) => dateField({
		...args,
		unavailable: date => [0, 6].includes(new window.Date(date + 'T00:00').getDay()) || full.includes(date)
	})
}

const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }

const range = ({ onChange, ...args }, wrap = picker => picker) => {
	const [from, setFrom] = useHeld(args, 'from')
	const [to, setTo] = useHeld(args, 'to')
	return wrap(<RangePicker {...args} from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); onChange(a, b) }} />)
}

// a phone draws the range as a sheet instead (RangeOnAPhone)
export const Range = {
	globals: DESKTOP,
	args: { from: '2026-08-03', to: '2026-08-16', showWeeks: true },
	argTypes: { from: day('The first day'), to: day('The last day') },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: RangePicker },
	render: args => range(args),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getAllByRole('gridcell', { name: /20/ })[0])
		await expect(args.onChange).toHaveBeenCalled()
	}
}

export const RangeOfAtLeastThreeDays = {
	globals: DESKTOP,
	args: { from: '2026-08-10', to: '2026-08-14', minDays: 3, min: '2026-08-01', max: '2026-09-30' },
	argTypes: { from: day('The first day'), to: day('The last day'), min: day('The first day that can be picked'), max: day('The last day that can be picked') },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: RangePicker },
	render: args => range(args)
}

export const RangeOnAPhone = {
	globals: { viewport: { value: 'phone', isRotated: false } },
	args: { from: '2026-08-03', to: '2026-08-16', onApply: fn(), onClose: fn() },
	argTypes: { from: day('The first day'), to: day('The last day') },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: RangePicker },
	render: ({ onClose, ...args }) => range({ ...args, single: true }, picker => <RangeSheet onClose={onClose}>{picker}</RangeSheet>)
}

const PRESETS = [{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }, { value: 'year', label: 'Year' }]

export const Period = {
	args: { name: 'period', value: 'month' },
	argTypes: { value: { control: 'inline-radio', options: PRESETS.map(p => p.value) } },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: PeriodPicker },
	render: ({ onChange, ...args }) => {
		const [period, setPeriod] = useHeld(args, 'value')
		return <PeriodPicker {...args} presets={PRESETS} value={period} onChange={p => { setPeriod(p.period); onChange(p) }} />
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Year'))
		await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ period: 'year' }))
	}
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const MonthStepper = {
	args: { unit: 'month', at: 7, previousLabel: 'Earlier month', nextLabel: 'Later month', touch: false, onPrevious: fn(), onNext: fn() },
	argTypes: { at: { control: { type: 'range', min: 0, max: 11 }, description: 'The month the story starts at, January being 0' }, locale: { control: false } },
	parameters: { variantsOf: PeriodWindow },
	render: ({ at: start, onPrevious, onNext, locale, onChange, ...args }) => {
		const [at, setAt] = useHeld({ at: start }, 'at')
		return (
			<PeriodWindow {...args} label={`${MONTHS[at]} 2026`}
				onPrevious={at > 0 ? () => { setAt(at - 1); onPrevious() } : undefined}
				onNext={at < 11 ? () => { setAt(at + 1); onNext() } : undefined} />
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Later month' }))
		await expect(args.onNext).toHaveBeenCalledOnce()
		await expect(canvas.getByText('September 2026')).toBeInTheDocument()
	}
}
