---
category: Charts
---
Statistics' 170px ring. The same contract as `Donut` — `segments`, a figure and a caption for
the hole — drawn larger, because on Statistics the split is the card's subject rather than a
summary above a list.

## Which of the two rings to use

- **`SpendGauge`** where the ring is what the card is for, and it sits beside its key.
- **`Donut`** where the ring introduces a list underneath it, on a dashboard card.

Nothing else differs. Both take the same shapes, both draw the same hairline between segments,
and both shrink their centre figure to fit the hole.

## Composing it

It goes in a `ring-row` body with a `chart-legend chart-legend-fill` block beside it. Below
900px that body stacks the two, ring centred on top.

```jsx
<Card aria-label="Where it went">
	<CardHeader title="Where it went • April 2024">
		<span className="field-help">monthly budgets</span>
	</CardHeader>
	<CardDivider />
	<CardBody variant="ring-row">
		<SpendGauge segments={split.map(e => ({ share: e.share, colour: e.colour }))}
			value="12.474 kr." label="April 2024"
			ariaLabel="Category split of 12.474 kr. in April 2024" />
		<div className="chart-legend chart-legend-fill">
			{split.map(e => (
				<LegendRow key={e.id} colour={e.colour} title={e.name} meta={e.meta}
					amount={e.amount} to={`/orders/all?category=${e.id}&from=2024-04-01&to=2024-04-30`} />
			))}
		</div>
	</CardBody>
</Card>
```

## The rules it shares with Donut

- **One array behind both** the arcs and the rows, so they cannot disagree.
- **Fold a long tail** into one extra entry whose `share` is the sum of what it holds, in a
  neutral grey no real entry is using. Dropping the tail instead leaves a circle that does not
  close. That row opens the whole list rather than filtering by an id it has not got.
- **A qualifier that is true of every row** — "monthly budgets", "monthly average over 3
  months" — is said once in the card header, not repeated down the rows.
- **No `segments`** draws a flat track with the figure still in it. Prefer an `EmptyState` for a
  window with nothing spent in it.

## Props

- `segments` — `[{ share, colour }]`, clockwise from twelve o'clock
- `value` — the figure in the hole, already formatted
- `label` — the caption under it, usually the window's name
- `ariaLabel` — the whole ring's accessible name; the SVG itself is hidden
