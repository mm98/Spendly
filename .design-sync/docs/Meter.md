---
category: Charts
---
A 10px track with a green fill and one optional marker line: spend against a projection, with
the marker where the window before this one ended. It is the app's "how far through are you"
bar, on Home's Monthly pace card and Statistics' Pace card.

## Both props are percentages of the track

`fill` and `marker` are plain numbers 0-100, not fractions and not kroner. The caller does the
division, and two guards come with that:

```jsx
<Meter className="meter-under-caption"
	/* projected is 0 exactly when spent is, and 0/0 is NaN - an invalid width the browser
	   drops silently, so the bar shows no fill instead of an honest 0%. */
	fill={projected ? Math.round(spent / projected * 100) : 0}
	/* clamped, or a previous window that outspent this one's whole projection puts the
	   marker past the right-hand edge of the track. */
	marker={previousTotal != null ? Math.min(100, Math.round(previousTotal / projected * 100)) : undefined}
	ariaLabel={`Spent ${spentText} of a projected ${projectedText}; the marker is where ${previousLabel} ended`} />
```

Leave `marker` out and no line is drawn — which is what the oldest window on record gets, since
there is nothing before it to mark.

## The track carries no scale, so the card has to

Always print the figure the fill is a percentage **of**, and say what the marker stands for.
Both patterns in the app do:

```jsx
{/* Home - the marker's figure in an inline key under the bar */}
<div className="figure-card tabular-figures">13.070 kr.</div>
<span className="card-caption">projected for May • 15 days into the month</span>
<Meter className="meter-under-caption" fill={48} marker={90} ariaLabel="..." />
<div className="chart-legend-inline">
	<span className="chart-swatch" /><span>April ended at</span>
	<span className="amount tabular-figures">11.786 kr.</span>
</div>

{/* Statistics - the same thing as a sentence */}
<span className="field-help field-help-below">
	The marker is where April 2024 ended: 11.786 kr.</span>
```

`meter-under-caption` is the class to add when the meter follows a caption line.

## Where not to use it

Not for a total against the sum of every budget. A budget is a ceiling on one category, so the
only ratio it supports is that category against its own — a window measured against the summed
allowance reads calm while one category is far past its ceiling. Draw budgets as rows, one
meter's worth of ratio each, and no meter over the total.

## Props

- `fill` — the green fill, 0-100
- `marker` — the line, 0-100; omitted, no line
- `ariaLabel` — the meter is one `role="img"`: state both figures and what the marker means
- `className` — `meter-under-caption` under a caption line
- `style`
