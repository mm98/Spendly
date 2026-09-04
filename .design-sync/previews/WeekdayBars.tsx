import { Card, CardBody, CardDivider, CardHeader, WeekdayBars } from 'spendly-react'

/* Seven bars, Monday first. Each bar's height is its `share` -- a percentage of the busiest
   day, on a fixed 0-100 scale -- so the chart means the same thing whatever box it is given.
   The kr figure is not drawn: it lives in the tooltip, and the card states the one number
   worth reading beside it.

   The busiest day is the only bar filled green; every other one is the track grey. */

const spend = (values: number[]) => {
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
	const full = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
	const most = Math.max(...values)
	return values.map((value, i) => ({
		day: days[i], dayFull: full[i], spend: value,
		share: most ? Math.round((value / most) * 1000) / 10 : 0,
		peak: most > 0 && value === most
	}))
}

const april = spend([840, 305, 1190, 0, 2465, 3980, 1620])

/* Home's Spending rhythm card. No `ariaLabel`, so the chart is hidden from screen readers --
   the busiest day and its amount are stated in the row underneath, and saying them twice
   helps nobody. The body is `card-body-fill` so the bars stretch to whatever height the card
   beside it sets. */
export const SpendingRhythm = () => (
	<Card aria-label="Spending rhythm">
		<CardHeader title="Spending rhythm" />
		<CardDivider />
		<CardBody variant="card-body-fill">
			<div className="figure-card tabular-figures">367,00 kr.</div>
			<span className="card-caption">average order • April</span>
			<WeekdayBars days={april} />
			<div className="chart-legend-inline">
				<span className="chart-swatch" />
				<span className="nowrap">Saturday peak</span>
				<span className="amount tabular-figures nowrap">3.980 kr.</span>
			</div>
		</CardBody>
	</Card>
)

/* Statistics' Weekly rhythm card. `className="rhythm-bars"` makes the chart its own container:
   given room, the ticks print full day names instead of the three-letter form. `ariaLabel`
   turns the whole chart into one labelled image, which is what a card with no sentence
   underneath needs. */
export const RhythmCard = () => (
	<Card aria-label="Weekly rhythm">
		<CardHeader title="Weekly rhythm • April 2024" />
		<CardDivider />
		<CardBody>
			<div className="figure-large tabular-figures">54%{' '}
				<span className="figure-unit">of spend happens on weekends</span></div>
			<WeekdayBars days={april} className="rhythm-bars" ariaLabel="Busiest day: Saturday" />
		</CardBody>
	</Card>
)

/* A week with nothing bought in it. Every share is 0, and each bar still draws a 3px sliver so
   the seven days stay readable as a row rather than collapsing to an empty box. No bar is the
   peak, so none is green. */
export const QuietWeek = () => (
	<Card aria-label="Weekly rhythm">
		<CardHeader title="Weekly rhythm • week 19" />
		<CardDivider />
		<CardBody>
			<div className="figure-large tabular-figures">0%{' '}
				<span className="figure-unit">of spend happens on weekends</span></div>
			<WeekdayBars days={spend([0, 0, 0, 0, 0, 0, 0])} className="rhythm-bars"
				ariaLabel="Nothing spent this week" />
		</CardBody>
	</Card>
)
