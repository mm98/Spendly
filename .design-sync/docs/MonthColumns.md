---
category: Charts
---
A column per window — the last six months, weeks or quarters — with the window on screen filled
green and the rest in the track grey. Statistics draws it beside the category split.

## The data shape

`months` is one entry per column, oldest first:

```jsx
const most = Math.max(...rows.map(r => r.spend))
const columns = rows.map(r => ({
	label: r.short, labelFull: r.long, spend: r.spend,
	height: most ? Math.round((r.spend / most) * 100) : 0,
	current: r.id === onScreen
}))
```

- **`height` is a percentage of the tallest column**, on a fixed 0-100 scale — not a pixel
  figure. The chart then fills whatever card it is given and still means the same thing.
- **`spend` is drawn only in the tooltip.** The card header carries the one sentence worth
  reading ("December is the highest").
- **`current` picks the green column**, and it is the window on screen, not the biggest one. A
  short green column is a window still being written, not a quiet one.

## Both labels, always

Send `label` and `labelFull` on every entry. Both travel on every tick and the chart prints one
by its own width: "Dec" when it is narrow, "December" when there is room. Where a window's name
has no short form — "Week 19", "Q1 2024" — send the same string twice.

## Composing it

```jsx
<Card aria-label="Last six months">
	<CardHeader title="Last six months">
		<span className="field-help">December is the highest</span>
	</CardHeader>
	<CardDivider />
	<CardBody variant="card-body-fill">
		<MonthColumns months={columns} />
	</CardBody>
</Card>
```

`card-body-fill` matters: this card shares a row with the category breakdown, which is as long
as the account has categories, so the columns take the leftover height rather than sitting
150px tall in a much taller card.

## Props

- `months` — the entries above, oldest first
