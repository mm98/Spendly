---
category: Charts
---
The line/area chart every spending window in the app draws: a real value axis, a real date
axis, and one tooltip listing every series plotted under the pointer. Reach for it whenever a
card has to show how a figure moved across a stretch of time.

## The one thing that is easy to get wrong

`x` is a **day offset from `from`**, not an array index, and `days` is the window's real span.
Those two together are what put an axis mark over its own point.

- A week, a month or a quarter is drawn one point per day, so `x` is 0, 1, 2, ... and `days` is
  7, 31, 90.
- A year or "all time" is too wide for that and is cut into its own **months**. Twelve points,
  each carrying the day its month starts on (0, 31, 59, 90, ...), and `days` is 365. An index
  0..11 here would put December eleven days into January.
- `marks` carries the same day numbers. One mark per label, `{ label, day }`.

A single point is held at both ends of the domain, so a window with one day of records still
draws a flat line across itself rather than a blank box.

## Composing it

It goes in a `CardBody`. Where a figure introduces the chart, put that figure in a
`chart-caption` block above it and give the chart `className="chart-under-caption"`.

```jsx
<CardBody>
	<div className="chart-caption">
		<div className="chart-caption-label">Spent this month</div>
		<span className="chart-caption-value tabular-figures">6.325,00 kr.</span>
	</div>
	<SpendChart data={total.map((y1, i) => ({ x: i, y1 }))} days={total.length}
		from="2024-05-01" marks={dayMarks} height={110} className="chart-under-caption"
		todayIndex={total.length - 1} yFormat={compact}
		label="Cumulative spend through May"
		series={[{ key: 'spend', dataKey: 'y1', name: 'Spent', color: 'var(--green)',
			strokeGradient: ['var(--green)', 'var(--green-light)'], strokeWidth: 2.4, today: true }]} />
</CardBody>
```

## The three line treatments

Every series is a `{ key, dataKey, name, color, strokeWidth }` entry. Beyond that:

- **plain line** — nothing extra. Two plain lines on one scale is Home's hero: what a day cost
  and what it saved.
- **`area: true`** — a gradient fill under the line, from `color` at 20% down to nothing. Use
  it for the one series a card is about.
- **`strokeGradient: [from, to]`** — the line itself painted left to right. `color` is still
  read, for the tooltip swatch and the today dot, so keep it set.
- **`dash: '4 4'`** — the comparison series. Draw it in `var(--green-light)` and thinner than
  the line it sits behind.

Draw the thinner line **second** so it sits over the thicker one where they cross.

## Today

`todayIndex` is which point of `data` is today, and `null` where the window has none. Pass
`null` for any window that has ended, and never set `today: true` on a comparison series — its
days are not today's.

## Heights in use

`height` is the plot only; the axis tick row is added on top. Home's hero is 130, its two small
cards 110 and 90, Statistics' Overview 210.

## Props

- `data`, `days`, `from`, `marks` — the window and its points, described above
- `series` — one entry per line
- `todayIndex` — the point that is today, or `null`
- `yFormat` — label formatter for the value axis; give it the chart shorthand (60000 → "60k")
- `height` — plot height in pixels
- `label` — the chart's accessible name; say what is plotted, over what stretch, in what unit
- `className` — extra class on the chart's container
