---
category: Rows
---
A chart key where each entry is also the way into the records behind it: a colour swatch, a
title, an optional second line, a figure, and a chevron into the filtered orders.

## Composing it

Rows go in a `chart-legend` block. Beside a ring, add `chart-legend-fill` and put both in a
`CardBody variant="ring-row"` — the ring and the key are then built from one array, which is
what keeps the arcs and the rows from disagreeing.

```jsx
<CardBody variant="ring-row">
	<Donut segments={split.map(c => ({ share: c.share, colour: c.colour }))}
		value="12.474 kr." label="Spent, this month" ariaLabel="Category split of 12.474 kr." />
	<div className="chart-legend chart-legend-fill">
		{split.map(c => (
			<LegendRow key={c.id} colour={c.colour} title={c.name} amount={c.amount}
				to={`/orders/all?category=${c.id}`} />
		))}
	</div>
</CardBody>
```

The key also stands on its own in a plain `CardBody`, without a ring.

## The second line

`meta` is drawn only where there is one to draw. Rows with nothing to add stay the
single-line row every other key is, rather than every legend in the app growing a blank
line so one of them can carry a sentence.

## Where a row links

The row names a slice and states a figure for it, so the link has to carry both — the
category and the window. An unfiltered list, or the category across all time, is a link
that does not go where the row says.

Two rows are special and cannot link to one record:

- **"Without category"** — the orders with no category at all. Filter it as `category=none`.
- **"Everything else"** — the folded tail, standing for several categories at once. Open the
  list they are all on (`/categories/all`), not a filter for an id it has not got.

## Props

- `colour` — the swatch, the same colour as the segment it names
- `title` — what the entry is
- `meta` — a second line, only where there is one
- `amount` — the figure, formatted
- `to` — the records behind the slice, filtered the way the row is named
