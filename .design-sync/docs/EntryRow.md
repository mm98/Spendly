---
category: Rows
---
The compact list row Home and the Orders overview are built from: a coloured mark, a name
with a quiet second line, and a figure with a smaller figure under it. Reach for it in a
card that lists records — latest orders, top vendors, favourite vendors, returns.

## Composing it

The row must sit inside an `entry-list` container, because that is where its type sizes,
its meta line and its right-hand figure column are declared. In practice that means a
`CardBody` carrying the variant:

```jsx
<Card aria-label="Latest orders">
	<CardHeader title="Latest orders" />
	<CardDivider />
	<CardBody variant="entry-list card-body-tight">
		<EntryRow avatar={order.vendor} name={order.vendor.name} meta="2 Sep"
			amount="742,45 kr." sub="saved 38,50 kr." to={`/orders/${order.id}`} />
		<Button variant="block" to="/orders/all">SEE ALL</Button>
	</CardBody>
</Card>
```

Three to five rows is the usual length, closed by a `Button variant="block"` that opens
the full list.

## The mark

`avatar` takes the record itself — an object with `initials` and `colour`. The row fills
the tile with `colour` and picks the ink from it, so any colour a user chooses stays
legible. Use `glyph` instead where the row stands for something with no colour of its own;
it takes an Icon name and draws it on the neutral grey tile. Never pass both.

## What the row decides, and what you decide

The row decides the tile, the ink on it, the ellipsis on long names and where the chevron
goes. You decide the strings: `amount` and `sub` are already-formatted text, so format
money before passing it (`742,45 kr.` for a total someone could check against a receipt,
`18.420 kr.` for a summary).

`to` is what makes the row a link, and a link is what draws the chevron. A row with no
destination is a plain block that announces nothing — which is the honest rendering. Keep
linked and unlinked rows in separate lists: a list holding both leaves a chevron-width gap
on the rows without one, so the names stay in one column.

## Props

- `avatar` — `{ initials, colour }`, the record's own tile
- `glyph` — an Icon name on the neutral tile, instead of `avatar`
- `name` — the first line
- `meta` — the quiet second line: a date, a count, a note
- `amount` — the figure, formatted
- `sub` — the smaller figure under it, e.g. `saved 38,50 kr.`
- `to` — an in-app route; makes the whole row a link and draws the chevron
- `children` — extra content between the figure and the chevron

Draw `sub` on every row of a list or on none. A row missing the second line where its
neighbours have one reads as data missing, not as nothing saved.
