import { Gauge, GaugeKey, Bars, ChartTip, Donut, Shares, ShareRow, Legend, LegendItem, Plot, Stat, SumHead, Sum } from '../../react/src/components/Data.jsx'
import { Card, CardHeader, Cards } from '../../react/src/components/Card.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { expect, fn, userEvent } from 'storybook/test'
import { useHeld } from './controls.js'

const percent = { control: { type: 'range', min: 0, max: 100, step: 1 } }

export default {
	title: 'Data/Charts and figures',
	component: Gauge,
	subcomponents: { GaugeKey, Bars, ChartTip, Donut, Shares, ShareRow, Legend, LegendItem, Plot, Stat, SumHead, Sum }
}

export const OneGauge = {
	args: { value: 72, over: 0, marker: undefined, untargeted: false, thin: false, negative: false, passed: false, remainder: false, 'aria-label': 'Decor, August' },
	argTypes: { value: percent, over: percent, marker: percent },
	render: args => (
		<Card>
			<CardHeader name={args['aria-label']} />
			<Gauge {...args} over={args.over || undefined} />
		</Card>
	)
}

export const Gauges = {
		render: () => (
		<Cards>
			<Card>
				<CardHeader name="Decor, August" />
				<Gauge value={72} aria-label="Decor, August" />
				<span className="sp-meta">15.800 of 22.000 kr.</span>
			</Card>
			<Card>
				<CardHeader name="Furniture, August" />
				<Gauge value={91} over={9} marker={68} aria-label="Furniture, August" />
				<span className="sp-row-flex sp-gap-6"><GaugeKey /><span className="sp-meta sp-meta--over">24.100 of 22.000 kr., 2.100 over</span></span>
			</Card>
			<Card>
				<CardHeader name="Lighting, August" />
				<Gauge value={40} untargeted aria-label="Lighting, August" />
				<span className="sp-meta">No limit set</span>
			</Card>
		</Cards>
	)
}

const MONTHS = [
	{ key: 'may', height: 45, tick: 'May', from: '2026-05-01', to: '2026-05-31' },
	{ key: 'jun', height: 60, tick: 'Jun', from: '2026-06-01', to: '2026-06-30' },
	{ key: 'jul', height: 51, tick: 'Jul', from: '2026-07-01', to: '2026-07-31' },
	{ key: 'aug', height: 81, tick: 'Aug', from: '2026-08-01', to: '2026-08-31', segments: [{ key: '1', share: 39 }, { key: '2', share: 28 }, { key: '3', share: 21 }, { key: '4', share: 12 }] },
	{ key: 'sep', height: 33, tick: 'Sep', from: '2026-09-01', to: '2026-09-30', muted: true }
]

export const SpendByMonth = {
	args: { selected: 'aug', limit: 34, onSelect: fn() },
	argTypes: { selected: { control: 'inline-radio', options: MONTHS.map(m => m.key) }, limit: { ...percent, description: 'Where Plot draws its limit line' } },
	parameters: { variantsOf: Bars },
	render: ({ limit, onSelect, ...args }) => {
		const [month, setMonth] = useHeld(args, 'selected')
		return (
			<Card>
				<CardHeader name="Spend by month" />
				<Plot axis={['30k', '20k', '10k', '0']} limit={{ at: limit, label: 'Limit' }}>
					<Bars variant="plot" selected={month} onSelect={key => { setMonth(key); onSelect(key) }} columns={MONTHS} />
				</Plot>
				<Legend>
					<LegendItem series={1}>Furniture</LegendItem>
					<LegendItem series={2}>Decor</LegendItem>
					<LegendItem series={3}>Lighting</LegendItem>
					<LegendItem series="limit">Limit</LegendItem>
				</Legend>
			</Card>
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getAllByRole('button')[1])
		await expect(args.onSelect).toHaveBeenCalledWith('jun')
	}
}

export const ColumnsWithReadout = {
	args: { open: 'aug', variant: 'default' },
	argTypes: { open: { control: 'inline-radio', options: ['apr', 'may', 'jun', 'jul', 'aug', 'sep'] } },
	parameters: { variantsOf: Bars },
	render: ({ open, variant }) => (
		<Card>
			<Bars open={open} variant={variant} columns={[['apr', 'Apr', 50, '5.010,00'], ['may', 'May', 65, '6.240,00'], ['jun', 'Jun', 70, '6.880,00'], ['jul', 'Jul', 60, '5.660,00'], ['aug', 'Aug', 100, '9.840,00'], ['sep', 'Sep', 80, '8.080,00']].map(([key, tick, height, amount]) => ({
				key, tick, height, label: `${tick} 2026, ${amount} kr.`,
				readout: <ChartTip title={`${tick} 2026`} value={`${amount} kr.`} rows={[{ key: 'orders', name: 'Orders', value: '4' }]} />
			}))} />
		</Card>
	)
}

export const SharesOfAWhole = {
	args: { figure: '61.480 kr.', label: 'August', loading: false, onPick: fn() },
	parameters: { variantsOf: Donut },
	render: ({ figure, label, loading, onPick }) => (
		<Card>
			<CardHeader name="By category" aside={label} />
			<div className="sp-row-flex sp-gap-16">
				<Donut shares={[{ series: 1, value: 48 }, { series: 2, value: 27 }, { series: 3, value: 17 }, { series: 4, value: 8 }]} figure={figure} label={label} loading={loading} aria-label="Furniture 48%, Decor 27%, Lighting 17%, Other 8%" />
				<Shares>
					<ShareRow series={1} amount="29.510 kr." value="48%" onClick={() => onPick('Furniture')}>Furniture</ShareRow>
					<ShareRow series={2} amount="16.600 kr." value="27%" onClick={() => onPick('Decor')}>Decor</ShareRow>
					<ShareRow series={3} amount="10.450 kr." value="17%" onClick={() => onPick('Lighting')}>Lighting</ShareRow>
					<ShareRow series={4} amount="4.920 kr." value="8%" onClick={() => onPick('Other')}>Other</ShareRow>
				</Shares>
			</div>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Decor'))
		await expect(args.onPick).toHaveBeenCalledWith('Decor')
	}
}

export const Loading = {
	render: () => (
		<Cards>
			<Card><Bars loading columns={MONTHS} /></Card>
			<Card><Donut loading /></Card>
		</Cards>
	)
}

export const OneFigure = {
	args: { label: 'August', figure: '61.480,00 kr.', delta: 'Saved 8.240,00 kr.', meta: '', help: '', helpColor: 'default', color: 'default', large: false, bare: false },
	parameters: { variantsOf: Stat },
	render: args => <Card><Stat {...args} /></Card>
}

export const Figures = {
	render: () => (
		<Cards>
			<Card><Stat label="August" figure="61.480,00 kr." delta="Saved 8.240,00 kr." /></Card>
			<Card><Stat label="Orders" figure="18" delta="Saved 1.320,00 kr." /></Card>
			<Card>
				<div className="sp-stack sp-gap-8">
					<Stat label="This week" figure="7.310,00 kr." />
					<Bars variant="spark" columns={[45, 60, 51, 81, 33, 54, 71].map((height, i) => ({ key: String(i), height, muted: i !== 3 }))} />
				</div>
			</Card>
		</Cards>
	)
}

export const OneSum = {
	args: { children: 'Shipping', value: '340,00 kr.', meta: '', variant: 'default', tone: 'default', named: false },
	parameters: { variantsOf: Sum },
	render: args => <div style={{ maxWidth: 420 }}><Card><Sum {...args} /></Card></div>
}

export const Sums = {
	render: () => (
		<div style={{ maxWidth: 420 }}>
			<Card>
				<SumHead mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>} title="Indbo Møbler" subtitle="SPENDLY-441 · 8 August" />
				<div className="sp-stack">
					<Sum value="3.640,00 kr.">Items</Sum>
					<Sum value="340,00 kr.">Shipping</Sum>
					<Sum variant="total" value="3.980,00 kr.">Total</Sum>
				</div>
			</Card>
		</div>
	)
}

export const SumThatOpens = {
	render: () => (
		<div style={{ maxWidth: 420 }}>
			<Card to="/orders" chevron={<Icon name="chevron-right" />}>
				<SumHead mark={<Mark size="medium" fill="solid">HAY</Mark>} title="HAY" subtitle="Matched an existing vendor" />
			</Card>
		</div>
	)
}
