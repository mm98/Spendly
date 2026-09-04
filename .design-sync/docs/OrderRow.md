---
category: Rows
---
The All orders row. It takes an order record whole and lays it out in four columns: vendor
identity, status, the total with what it saved under it, and the chevron into the order.

## Composing it

```jsx
<Card aria-label="Orders">
	<CardHeader title={`Orders • ${matched} matches`} />
	<CardDivider />
	<CardBody variant="card-body-tight">
		{orders.map(o => (
			<OrderRow key={o.id} to={`/orders/${o.id}`}
				order={{ ...o, dateLabel: dayMonth(o.date) }} />
		))}
		<Pager from={from} to={to} matched={matched} page={page} pages={pages} onPage={setPage} />
	</CardBody>
</Card>
```

## The record it takes

```js
{
	id, dateLabel,                 // dateLabel is formatted by the page, not the API
	status,                        // "Ordered" | "Delivered" | "Returned"
	vendor: { id, name, initials, colour },
	categories: [{ id, name, colour, icon }],   // [] where the order has none
	itemCount, total, saved        // numbers; the row formats them
}
```

`dateLabel` is the only field the page adds — the API sends `date` as an ISO day. A field
left out renders an empty cell and no error, so build the object from the list endpoint's
row rather than by hand.

The meta line is assembled by the row: date, item count, and the category names joined with
commas where there are any.

## What it always draws

The saved line under the total is drawn on every row, "saved 0,00 kr." included. It is not
an optional flourish: leaving it off where nothing was saved makes the total column change
shape down the list, and an absent line reads as data missing rather than as no saving.

The chevron is drawn unconditionally too — this row is a list of orders, and every one of
them opens. Give it `to`.

## Props

- `order` — the record above
- `to` — the order's own page

This row is wide by design: four columns, one of them a fixed 150px figure column. Use it
in a full-width list card, not in a rail or a half-width panel.
