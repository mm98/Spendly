---
category: Charts
---
Seven bars, Monday first: which days of the week the money goes out on. The busiest day is the
only bar filled green; the rest are the track grey.

## The data shape

`days` is seven entries in Monday-first order. Build it from the account's own weekday totals:

```jsx
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const full = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const most = Math.max(...spend)
const weekdays = spend.map((value, i) => ({
	day: days[i], dayFull: full[i], spend: value,
	share: most ? Math.round((value / most) * 1000) / 10 : 0,
	peak: most > 0 && value === most
}))
```

- **`share` is a percentage of the busiest day, not a pixel height.** The chart's own scale is
  fixed at 0-100, so the bars mean the same thing in a tall card and a short one.
- **`spend` is drawn only in the tooltip.** The bars carry the relative story; the real figure
  is stated once, by the card.
- **`peak` picks the green bar.** With every day at 0 there is no peak, and every bar draws a
  3px sliver so the week still reads as seven days rather than an empty box.

## The two forms

```jsx
{/* Home's dashboard card - short day names, chart hidden from screen readers */}
<CardBody variant="card-body-fill">
	<div className="figure-card tabular-figures">367,00 kr.</div>
	<span className="card-caption">average order • April</span>
	<WeekdayBars days={weekdays} />
	<div className="chart-legend-inline">
		<span className="chart-swatch" />
		<span className="nowrap">Saturday peak</span>
		<span className="amount tabular-figures nowrap">3.980 kr.</span>
	</div>
</CardBody>

{/* Statistics' rhythm card - full day names where there is room, one labelled image */}
<WeekdayBars days={weekdays} className="rhythm-bars" ariaLabel="Busiest day: Saturday" />
```

- **`className="rhythm-bars"`** makes the chart its own container, so the ticks print full day
  names wherever the card is wide enough. Without it the three-letter form is always drawn.
- **`ariaLabel`** turns the whole chart into one labelled image. Leave it off only where the
  same facts are already stated in words beside the chart, as in Home's inline key above — the
  chart is then hidden, rather than saying everything twice.

`card-body-fill` lets the bars take the card's leftover height, which is what a card sharing a
grid row with a longer neighbour needs.

## Props

- `days` — the seven entries above
- `className` — `rhythm-bars` for the full-name form
- `style` — inline style on the chart's box, e.g. a height override
- `ariaLabel` — given, the chart is one labelled image; omitted, it is hidden
