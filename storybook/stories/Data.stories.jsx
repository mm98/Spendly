import { Gauge, GaugeKey, Bars, CashFlow, ChartTip, Donut, Shares, ShareRow, Legend, LegendItem, Plot, Stat, SumHead, Sum } from '../../react/src/components/Data.jsx'
import { Card, CardHeader, Cards } from '../../react/src/components/Card.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { expect, fn, userEvent } from 'storybook/test'
import { useHeld } from './controls.js'

const percent = { control: { type: 'range', min: 0, max: 100, step: 1 } }

export default {
	title: 'Data/Charts and figures',
	component: Gauge,
	subcomponents: { GaugeKey, Bars, CashFlow, ChartTip, Donut, Shares, ShareRow, Legend, LegendItem, Plot, Stat, SumHead, Sum }
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

// August 2026, one column a day; the days from the 26th are still to come
const AUGUST_DAYS = Array.from({ length: 31 }, (_, i) => {
	const day = `2026-08-${String(i + 1).padStart(2, '0')}`
	return { key: day, tick: String(i + 1), label: `${i + 1} August 2026`, from: day, to: day, height: [40, 72, 18, 55, 90, 33, 61][i % 7], future: i >= 25 }
})

export const SpendByDay = {
	args: { onSelect: fn() },
	parameters: { variantsOf: Bars },
	render: ({ onSelect }) => (
		<Card>
			<CardHeader name="Spend by day" />
			<Plot axis={['3k', '2k', '1k', '0']}>
				<Bars variant="plot" days columns={AUGUST_DAYS} onSelect={onSelect} />
			</Plot>
		</Card>
	),
	// the odd ISO weeks of August 2026 are the 1st - 2nd, 10th - 16th and 24th - 30th
	play: async ({ args, canvas, canvasElement }) => {
		const odd = [...canvasElement.querySelectorAll('.sp-bars__col[data-week="odd"]')].map(c => c.getAttribute('aria-label'))
		await expect(odd).toEqual([1, 2, 10, 11, 12, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30].map(d => `${d} August 2026`))
		await userEvent.click(canvas.getByRole('button', { name: '10 August 2026' }))
		await expect(args.onSelect).toHaveBeenCalledWith('2026-08-10', '2026-08-10', '2026-08-10')
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

// one month's income, the two accounts the budget pays from, and the orders (Order statistics 4h)
const flowBar = (id, name, value, share) => ({ id, name, value, amount: `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`, share: `${share}%` })
const CASH_INCOME = [flowBar('income', 'Income', 34000, 100)]
const CASH_BRANCHES = [
	{ ...flowBar('budget', 'Budget', 18370, 54), groups: [
		{ ...flowBar('housing', 'Housing', 12346, 36), lines: [flowBar('mortgage', 'Mortgage', 8450, 25), flowBar('tax', 'Property tax', 1540, 5), flowBar('power', 'Electricity', 860, 3), flowBar('heat', 'Heating', 720, 2), flowBar('water', 'Wastewater', 390, 1), flowBar('housing-other', 'Other', 386, 1)] },
		{ ...flowBar('transport', 'Transport', 3660, 11), lines: [flowBar('car', 'Car loan', 3050, 9), flowBar('insurance-car', 'Car insurance', 610, 2)] },
		{ ...flowBar('insurance', 'Insurance', 1520, 4), lines: [flowBar('private', 'Private insurance', 980, 3), flowBar('a-kasse', 'Unemployment insurance', 540, 2)] },
		{ ...flowBar('subs', 'Subscriptions', 844, 2), lines: [flowBar('net', 'Internet', 299, 1), flowBar('phone', 'Phone', 298, 1), flowBar('stream', 'Streaming', 247, 1)] }
	] },
	{ ...flowBar('savings', 'Savings', 4000, 12), groups: [{ ...flowBar('saving', 'Savings', 4000, 12), lines: [flowBar('monthly', 'Monthly saving', 4000, 12)] }] },
	{ ...flowBar('spending', 'Spending', 9800, 29), spending: true, groups: [
		{ ...flowBar('groceries', 'Groceries', 4200, 12), lines: [flowBar('rema', 'Rema 1000', 1850, 5), flowBar('netto', 'Netto', 1400, 4), flowBar('fotex', 'Føtex', 950, 3)] },
		{ ...flowBar('home', 'Home', 2350, 7), lines: [flowBar('ikea', 'Ikea', 1600, 5), flowBar('jysk', 'Jysk', 750, 2)] },
		{ ...flowBar('eating', 'Eating out', 1250, 4), lines: [flowBar('sushi', 'Sticks\'n\'Sushi', 680, 2), flowBar('lagkage', 'Lagkagehuset', 570, 2)] },
		{ ...flowBar('clothes', 'Clothes', 2000, 6), lines: [flowBar('zalando', 'Zalando', 2000, 6)] }
	] }
]

export const WhereTheMoneyWent = {
	args: { income: CASH_INCOME, branches: CASH_BRANCHES, left: { value: 1830, amount: '1.830 kr.' }, over: undefined, down: false, label: 'Where the money went' },
	render: args => (
		<Card>
			<CardHeader name="Cash flow" />
			<CashFlow {...args} tip={bar => <ChartTip title={bar.name} value={bar.amount} rows={bar.share ? [{ key: 'share', name: 'Of income', value: bar.share }] : []} />} />
		</Card>
	),
	play: async ({ canvas, canvasElement }) => {
		const housing = await canvas.findByRole('img', { name: 'Housing 12.346 kr. 36%' })
		await userEvent.hover(housing)
		await expect(canvasElement.querySelector('.sp-cashflow__tip')).not.toBeNull()
		await expect(canvasElement.querySelector('.sp-cashflow').hasAttribute('data-focus')).toBe(true)
	}
}

export const WhereTheMoneyWentDownwards = {
	args: { ...WhereTheMoneyWent.args, down: true },
	render: WhereTheMoneyWent.render,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByText('Budget', { selector: '.sp-truncate' }))
		await expect(await canvas.findByRole('button', { name: 'Remove Budget' })).toBeVisible()
	}
}

export const WhereTheMoneyWentDownwardsOver = {
	args: { ...WhereTheMoneyWent.args, left: undefined, over: { value: 3229, amount: '3.229 kr.' }, down: true },
	render: WhereTheMoneyWent.render,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByText('Over')).toBeVisible()
		await expect(canvasElement.querySelector('.sp-cashflow__node[data-key="over"]')).not.toBeNull()
	}
}

// every bar with its amount left out, as the Cash flow page draws it until Show amounts is pressed
const withoutAmount = bar => ({ ...bar, amount: '', ...(bar.groups ? { groups: bar.groups.map(withoutAmount) } : {}), ...(bar.lines ? { lines: bar.lines.map(withoutAmount) } : {}) })

export const WhereTheMoneyWentWithoutAmounts = {
	args: { ...WhereTheMoneyWent.args, income: CASH_INCOME.map(withoutAmount), branches: CASH_BRANCHES.map(withoutAmount), left: { value: 1830, amount: '' } },
	render: WhereTheMoneyWent.render,
	play: async ({ canvas, canvasElement }) => {
		await expect(await canvas.findByRole('img', { name: 'Housing 36%' })).toBeVisible()
		await expect(canvasElement.querySelector('.sp-cashflow').textContent).not.toMatch(/kr\./)
	}
}
