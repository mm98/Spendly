import { Card, CardBody, CardDivider, CardHeader, Meter } from 'spendly-react'

/* A 10px track with a green fill and an optional marker line. Both props are percentages of
   the track -- plain numbers 0-100, not fractions and not kroner -- so the caller does the
   division and decides what the track stands for.

   The app uses it for one thing: spend against a projection, with the marker where the
   previous window ended. The figure the fill is a percentage *of* is always printed beside
   the meter, because the track itself carries no scale. */

export const MonthlyPace = () => (
	<Card aria-label="Monthly pace">
		<CardHeader title="Monthly pace" />
		<CardDivider />
		<CardBody>
			<div className="figure-card tabular-figures">13.070 kr.</div>
			<span className="card-caption">projected for May • 15 days into the month</span>
			<Meter className="meter-under-caption" fill={48} marker={90}
				ariaLabel="Spent 6.325 kr. of a projected 13.070 kr.; the marker is where April ended" />
			<div className="chart-legend-inline">
				<span className="chart-swatch" /><span>April ended at</span>
				<span className="amount tabular-figures">11.786 kr.</span>
			</div>
		</CardBody>
	</Card>
)

/* Statistics' Pace card. The marker is clamped to 100 before it is passed: a previous window
   that outspent this one's whole projection would otherwise sit past the right-hand edge of
   the track. The figure it stands for is printed under the meter, where it can exceed the
   track without falling off it. */
export const AgainstProjection = () => (
	<Card aria-label="Pace">
		<CardHeader title="Pace • May 2024">
			<span className="field-help">15 days in</span>
		</CardHeader>
		<CardDivider />
		<CardBody>
			<div className="figure-large tabular-figures">13.070 kr.</div>
			<span className="field-help">projected for May 2024 • 6.325,00 kr. spent so far</span>
			<Meter className="meter-under-caption" fill={48} marker={90}
				ariaLabel="Spent 6.325 kr. of a projected 13.070 kr.; the marker is where April 2024 ended" />
			<span className="field-help field-help-below">
				The marker is where April 2024 ended: 11.786 kr.</span>
		</CardBody>
	</Card>
)

/* The four readings worth designing for, one window each. `marker` left out draws no line at
   all, which is what the oldest window on record gets -- there is nothing before it to mark.
   A window that has spent nothing is an honest 0, never a missing fill. */
const row: React.CSSProperties = { display: 'grid', gap: 6, marginBottom: 18 }

export const FillLevels = () => (
	<Card aria-label="Pace at four windows">
		<CardHeader title="Pace • four windows" />
		<CardDivider />
		<CardBody>
			<div style={row}>
				<span className="field-help">May 2024 — nothing spent yet</span>
				<Meter fill={0} marker={90} ariaLabel="Spent 0 kr. of a projected 12.400 kr." />
			</div>
			<div style={row}>
				<span className="field-help">May 2024 — half way to the projection</span>
				<Meter fill={48} marker={90} ariaLabel="Spent 6.325 kr. of a projected 13.070 kr." />
			</div>
			<div style={row}>
				<span className="field-help">April 2024 — already past what March ended at</span>
				<Meter fill={96} marker={62} ariaLabel="Spent 12.548 kr. of a projected 13.070 kr." />
			</div>
			<div style={{ ...row, marginBottom: 0 }}>
				<span className="field-help">January 2023 — the oldest month on record, nothing before it to mark</span>
				<Meter fill={74} ariaLabel="Spent 9.670 kr. of a projected 13.070 kr." />
			</div>
		</CardBody>
	</Card>
)
