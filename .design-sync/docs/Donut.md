---
category: Charts
---
The 132px ring on Home, Orders and Categories: a spending split drawn as arcs, with the total
and its caption in the hole. Use it as the summary above a list of the same records.

## The rule that keeps it honest

The ring and the rows near it are built from **one array**. Map that array to `segments` and map
the same array to the rows, so a slice and its name can never disagree. Never slice the ring
shorter than the list, or the arcs stop adding up to the figure in the middle.

Where a list is too long to draw, fold its tail into one extra entry whose `share` is the sum of
everything inside it, coloured a neutral grey no real entry is using. That keeps the circle
closed. The fold's row opens the whole list, not a filter for an id it has not got.

## Composing it

Two placements, both real:

```jsx
{/* centred over its rows - Home, Orders */}
<CardBody>
	<DonutBox>
		<Donut segments={split.map(c => ({ share: c.share, colour: c.colour }))}
			value="12.474 kr." label="Spent this month"
			ariaLabel="Category split of 12.474 kr. this month" />
	</DonutBox>
	<div className="category-rows">
		{split.map(c => <CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
	</div>
</CardBody>

{/* beside its key - a ring-row body stacks the two below 900px on its own */}
<CardBody variant="ring-row">
	<Donut segments={segments} value="12.474 kr." label="April 2024" ariaLabel="..." />
	<div className="chart-legend chart-legend-fill">{rows}</div>
</CardBody>
```

Always wrap it in `DonutBox` when it sits above a list — a card body is a stacked block, so a
bare ring lands against the left edge and stops lining up with anything.

## What it decides for you

- **The hairline between segments.** One gap width for every ring in the app. One segment gets
  no gap at all, because a gap separates two segments and a lone slice has nothing to separate
  from.
- **The size of the figure in the hole.** It is measured against the circle and stepped down
  until it fits, so a seven-digit total needs no shortening by the caller.
- **The empty case.** Without `segments` it draws a flat grey track with the figure still in it.
  That is a fallback, not a state to design a card around: a month with nothing in it should get
  an `EmptyState` instead, because a grey circle is a split of nothing.

## What you decide

`share` in percent and `colour` per segment, and the two strings in the middle. The colour is
the category's or vendor's own, from the record — not a colour picked here, or the ring and the
swatch beside it stop matching.

## Props

- `segments` — `[{ share, colour }]`, clockwise from twelve o'clock
- `value` — the figure in the hole, already formatted
- `label` — the caption under it, naming the stretch of time
- `ariaLabel` — the whole ring's accessible name; the SVG itself is hidden
