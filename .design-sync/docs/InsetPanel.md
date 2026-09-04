---
category: Cards
---
A tinted well inside a card body, holding a short group of rows so they read as one block
rather than as the card's own list. Reach for it when a card carries a set of related lines
that is not the card's main list — recent scans, a list of checks, tips.

It draws the grey fill, the rounding and the padding. The rows inside are `ItemRow`s; the
panel adds nothing to them.

## What the caller decides

- **The rows.** `ItemRow` with `icon` for a glyph tile, `title` and `meta`, plus `amount` and
  `to` where the row goes somewhere.
- **Whether the rows group visually.** Add `className="item-row-group"` on the rows when they
  are a run of linked records.
- **Anything after it.** A closing `<Button variant="block">` goes after the panel, inside the
  same `CardBody` — and only when there are rows above it.

Keep the metas short: a row's meta truncates with an ellipsis rather than wrapping.

## Props

- `children` — the rows
- anything else is spread onto the `<div>`; the component also forwards a ref to it

## Example

```jsx
<CardBody variant="card-body-tight">
	<InsetPanel>
		<ItemRow className="item-row-group" icon="check" title="Bilka-kvittering.pdf"
			meta="12 August • 14 items" amount="1.284 kr." to="/orders/1" />
	</InsetPanel>
	<Button variant="block" to="/orders/all">SEE ALL ORDERS</Button>
</CardBody>
```
