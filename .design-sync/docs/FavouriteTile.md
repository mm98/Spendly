---
category: Rows
---
One pinned record in the favourites spotlight both overview pages share: the record's mark,
its name with a count under it, and its total with what it saved under that. The whole tile
is the way into that record's own filtered orders.

## Composing it

A tile is always inside a `FavouriteTileGrid`, inside the Favourites card:

```jsx
<Card aria-label="Favourites">
	<CardHeader title="Favourites" to="/vendors/all" label="Favourites, open all vendors" />
	<CardDivider />
	<CardBody>
		<FavouriteTileGrid>
			{favourites.map(v => (
				<FavouriteTile key={v.id}
					mark={<span className="entry-avatar" style={{ background: v.colour, color: ink }}>{v.initials}</span>}
					name={v.name} to={`/orders/all?vendor=${v.id}`}
					linkLabel={`${v.name}, open their orders`}
					meta="34 orders" amount="18.420 kr." saved="saved 1.965 kr." />
			))}
		</FavouriteTileGrid>
	</CardBody>
</Card>
```

Vendors and categories both feed it, which is the point: the same standing preference reads
the same way whichever kind of record it is pinned to. A vendor's `meta` is its order count,
a category's is its share of expenses.

## The link

The tile is one link over four pieces of text, so `linkLabel` is what it announces — write
it as the record plus where it goes: "Bilka, open their orders". `to` is not optional in
practice; a tile that goes nowhere is a card with a chevron's worth of promise and no
destination.

## What it does not carry

No star, no edit button, no second stat pair. A favourite is a form choice on the record's
own edit page, and that page is one click away from the All vendors / All categories list —
so the tile does not need its own way there.

## Props

- `mark` — the record's own tile
- `name` — the record's name
- `to` — its filtered orders
- `linkLabel` — what the whole tile announces
- `meta` — the line under the name: an order count, or a share of expenses
- `amount` — the figure
- `saved` — the smaller line under the figure

When there is nothing pinned, draw an `EmptyState` instead of an empty grid, and say how a
favourite is turned on.
