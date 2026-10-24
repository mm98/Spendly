import { useState } from 'react'
import { RangePicker, RangeSheet, PeriodPicker, PeriodWindow, DateField } from '../../react/src/components/DatePickers.jsx'
import { Field } from '../../react/src/components/Field.jsx'

export default {
	title: 'Fields/Dates',
	decorators: [Story => <div style={{ minHeight: 480 }}><Story /></div>]
}

export const Date = {
	render: () => {
		const [day, setDay] = useState('2026-08-14')
		return <div style={{ maxWidth: 280 }}><Field label="Date"><DateField value={day} onChange={setDay} locale="da-DK" /></Field></div>
	}
}

export const DateWithClosedDays = {
	render: () => {
		const [day, setDay] = useState('2026-08-14')
		return (
			<div style={{ maxWidth: 280 }}>
				<Field label="Delivery" message="Deliveries run Monday to Friday, and two days are already full.">
					<DateField value={day} onChange={setDay} native={false} locale="da-DK" min="2026-08-01" max="2026-09-30"
						unavailable={date => [0, 6].includes(new window.Date(date + 'T00:00').getDay()) || ['2026-08-12', '2026-08-19'].includes(date)} />
				</Field>
			</div>
		)
	}
}

const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }

// a phone draws the range as a sheet instead (RangeOnAPhone)
export const Range = {
	globals: DESKTOP,
	render: () => {
		const [range, setRange] = useState(['2026-08-03', '2026-08-16'])
		return <RangePicker from={range[0]} to={range[1]} onChange={(from, to) => setRange([from, to])} locale="da-DK" />
	}
}

export const RangeOfAtLeastThreeDays = {
	globals: DESKTOP,
	render: () => {
		const [range, setRange] = useState(['2026-08-10', '2026-08-14'])
		return <RangePicker from={range[0]} to={range[1]} onChange={(from, to) => setRange([from, to])} minDays={3} min="2026-08-01" max="2026-09-30" locale="da-DK" />
	}
}

export const RangeOnAPhone = {
	globals: { viewport: { value: 'phone', isRotated: false } },
	render: () => {
		const [range, setRange] = useState(['2026-08-03', '2026-08-16'])
		return (
			<RangeSheet onClose={() => {}}>
				<RangePicker single from={range[0]} to={range[1]} onChange={(from, to) => setRange([from, to])} onApply={() => {}} locale="da-DK" />
			</RangeSheet>
		)
	}
}

export const Period = {
	render: () => {
		const [period, setPeriod] = useState('month')
		return (
			<PeriodPicker name="period" value={period} onChange={p => setPeriod(p.period)} locale="da-DK"
				presets={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }, { value: 'year', label: 'Year' }]} />
		)
	}
}

export const MonthStepper = {
	render: () => {
		const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		const [at, setAt] = useState(7)
		return (
			<PeriodWindow unit="month" label={`${MONTHS[at]} 2026`} previousLabel="Earlier month" nextLabel="Later month"
				onPrevious={at > 0 ? () => setAt(at - 1) : undefined} onNext={at < 11 ? () => setAt(at + 1) : undefined} />
		)
	}
}
