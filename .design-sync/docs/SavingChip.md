---
category: Chips
---
States a number against retail: what an order or a month saved. Green wash, upward arrow
and no options — one look, because it only ever says one kind of thing.

There is no tone and no trend. The arrow always points up and the ink is always the positive
green, so only send it a figure that really is a gain. A loss goes somewhere else — `KpiCard`
has `trend` and `tone` for that.

It formats nothing. Pass the text already written out, in the account's own format:
`"13,6% under retail"`, `"31,4%"`, `"412 kr. under retail"`.

## Where it goes

- Under a figure, with a caption between them — Home's "Saved vs retail" card.
- At the end of a caption line, opposite the label and value — the savings-growth card.

## Props

- `children` — the already-formatted saving; anything else is spread onto the span

## Example

```jsx
<CardBody>
	<div className="figure-card tabular-figures">{currency(period.saved)}</div>
	<span className="card-caption">saved this month</span>
	<SavingChip>{percent(period.savedPercent)} under retail</SavingChip>
</CardBody>
```

## Related

`StatusChip` for where an order got to; `KpiCard` when the number can go either way.
