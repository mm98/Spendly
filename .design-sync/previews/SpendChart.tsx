import { Card, CardBody, CardDivider, CardHeader, SpendChart } from 'spendly-react'

/* The line/area chart every window in the app draws. It plots points on a *day-numbered* x
   axis, not on an array index: `x` is the day offset from `from`, `days` is the window's own
   span, and `marks` are the axis labels with the day each one belongs to. That is what keeps a
   label sitting over its own point when a year is drawn as twelve months of unequal length.

   The chart draws no numbers of its own beyond the axis -- the figure above it is the card's,
   and the tooltip is the chart's. */

/** The axis's own shorthand: 60000 -> "60k", 2500 -> "2,5k", 500 -> "500". */
const compact = (n: number) => {
	if (Math.abs(n) < 1000) return String(Math.round(n))
	const k = n / 1000
	return (Number.isInteger(k) ? String(k) : k.toFixed(1).replace('.', ',')) + 'k'
}

const cumulate = (values: number[]) => { let total = 0; return values.map(v => (total += v)) }

/** One mark per day of a window short enough to be drawn a day at a time. */
const dayMarks = (days: number) =>
	Array.from({ length: days }, (_, i) => {
		const label = String(i + 1).padStart(2, '0')
		return { label, fullLabel: label, day: i }
	})

/* April 2024, a window that has ended: thirty days of spend, and March behind it to compare. */
const aprilDaily = [0, 412, 0, 289, 1180, 0, 96, 0, 638, 0, 0, 754, 2490, 118, 0,
	341, 0, 0, 905, 1620, 0, 0, 268, 512, 0, 1345, 0, 88, 0, 730]
const marchDaily = [0, 0, 620, 940, 0, 175, 0, 0, 1420, 306, 0, 0, 588, 0, 2150,
	0, 224, 810, 0, 0, 1090, 0, 145, 0, 476, 1265, 0, 0, 332, 690]

/* May 2024, the window still being written: fifteen days of records and today on the last. */
const mayDaily = [0, 388, 0, 1240, 0, 96, 745, 0, 0, 1890, 212, 0, 634, 0, 1120]
const maySaved = [0, 62, 0, 210, 0, 12, 118, 0, 0, 305, 34, 0, 96, 0, 178]

/* Statistics' Overview card. One running total per day, the window before it dashed behind,
   and no "you are here" dot -- April has ended, so none of its days is today. */
export const CumulativeMonth = () => {
	const current = cumulate(aprilDaily)
	const previous = cumulate(marchDaily)
	return (
		<Card aria-label="Overview">
			<CardHeader title="Overview • April 2024">
				<span className="field-help">vs March 2024</span>
			</CardHeader>
			<CardDivider />
			<CardBody variant="card-body-tight">
				<SpendChart data={current.map((y1, i) => ({ x: i, y1, y2: previous[i] }))}
					days={current.length} from="2024-04-01" marks={dayMarks(current.length)}
					height={210} todayIndex={null} yFormat={compact}
					label="Cumulative spend across April 2024, March 2024 dashed behind it, y-axis in kr."
					series={[
						{ key: 'current', dataKey: 'y1', name: 'April 2024', color: 'var(--green)',
							area: true, strokeWidth: 2.4, today: true },
						{ key: 'previous', dataKey: 'y2', name: 'March 2024', color: 'var(--green-light)',
							dash: '4 4', strokeWidth: 1.6 }
					]} />
			</CardBody>
		</Card>
	)
}

/* Home's hero. Two series on one scale -- what a day cost and what it saved -- both marked
   with today's dot, because both are facts about the same days. */
export const SpentAndSavedPerDay = () => (
	<Card aria-label="Spent, May 2024">
		<CardHeader title="Spent • May 2024" to="/stats" label="Spent, May 2024, open Statistics" />
		<CardDivider />
		<CardBody>
			<div>
				<div className="figure-headline tabular-figures">6.325,00 kr.</div>
				<div className="figure-delta tabular-figures">saved 1.015,00 kr. vs retail (13,8%)</div>
			</div>
			<div className="chart-wrap">
				<SpendChart data={mayDaily.map((y1, i) => ({ x: i, y1, y2: maySaved[i] }))}
					days={mayDaily.length} from="2024-05-01" marks={dayMarks(mayDaily.length)}
					height={130} todayIndex={mayDaily.length - 1} yFormat={compact}
					label="Spent and saved per day, May"
					series={[
						{ key: 'spend', dataKey: 'y1', name: 'Spent', color: 'var(--teal)', strokeWidth: 2, today: true },
						{ key: 'saved', dataKey: 'y2', name: 'Saved', color: 'var(--green)', strokeWidth: 1.6, today: true }
					]} />
			</div>
		</CardBody>
	</Card>
)

/* `area: true` fills under the line with the series' own colour, faded to nothing. Home's
   savings card draws it small, under the figure it is about. */
export const SavingsGrowth = () => {
	const growth = cumulate(maySaved)
	return (
		<Card aria-label="Saved vs retail">
			<CardHeader title="Saved vs retail" to="/stats" label="Saved vs retail, open Statistics" />
			<CardDivider />
			<CardBody>
				<div className="chart-caption">
					<div className="chart-caption-label">Total saved</div>
					<span className="chart-caption-value tabular-figures">1.015,00 kr.</span>
				</div>
				<SpendChart data={growth.map((y1, i) => ({ x: i, y1 }))} days={growth.length}
					from="2024-05-01" marks={dayMarks(growth.length)} height={90}
					className="chart-under-caption" label="Savings growth through May"
					todayIndex={growth.length - 1} yFormat={compact}
					series={[{ key: 'savings', dataKey: 'y1', name: 'Saved', color: 'var(--green)',
						area: true, strokeWidth: 2.2, today: true }]} />
			</CardBody>
		</Card>
	)
}

/* `strokeGradient` paints the line itself left to right instead of the flat `color`. The flat
   colour is still what the tooltip swatch and the today dot are drawn in, so it stays set. */
export const RunningTotal = () => {
	const total = cumulate(mayDaily)
	return (
		<Card aria-label="Orders">
			<CardHeader title="Orders" to="/orders" label="Orders, open Orders" />
			<CardDivider />
			<CardBody>
				<div className="chart-caption">
					<div className="chart-caption-label">Spent this month</div>
					<span className="chart-caption-value tabular-figures">6.325,00 kr.</span>
				</div>
				<SpendChart data={total.map((y1, i) => ({ x: i, y1 }))} days={total.length}
					from="2024-05-01" marks={dayMarks(total.length)} height={110}
					className="chart-under-caption" label="Cumulative spend through May"
					todayIndex={total.length - 1} yFormat={compact}
					series={[{ key: 'spend', dataKey: 'y1', name: 'Spent', color: 'var(--green)',
						strokeGradient: ['var(--green)', 'var(--green-light)'], strokeWidth: 2.4, today: true }]} />
			</CardBody>
		</Card>
	)
}

/* A year is too wide to draw a point per day, so it is cut into its own twelve months: twelve
   points, each carrying the day its month starts on, and twelve marks on those same days. The
   `x` values are what line the labels up with the points -- an index 0..11 would put December
   eleven days into January. */
const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December']
const monthlySpend = [9840, 8120, 11430, 10275, 12680, 9560, 14210, 11890, 10340, 12055, 15720, 18465]

export const YearInMonths = () => {
	const running = cumulate(monthlySpend)
	return (
		<Card aria-label="Overview">
			<CardHeader title="Overview • 2023" />
			<CardDivider />
			<CardBody variant="card-body-tight">
				<SpendChart data={running.map((y1, i) => ({ x: monthStarts[i], y1 }))} days={365}
					from="2023-01-01" height={180} todayIndex={null} yFormat={compact}
					marks={monthStarts.map((day, i) => ({ label: monthNames[i].slice(0, 3), fullLabel: monthNames[i], day }))}
					label="Cumulative spend across 2023, y-axis in kr."
					series={[{ key: 'current', dataKey: 'y1', name: '2023', color: 'var(--green)',
						area: true, strokeWidth: 2.4 }]} />
			</CardBody>
		</Card>
	)
}
