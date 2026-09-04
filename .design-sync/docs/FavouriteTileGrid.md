---
category: Rows
---
The grid the favourite tiles sit in: three across a wide panel, two at tablet width, one per
row on a phone.

## How to use it

It takes nothing but its tiles. The column count belongs to the grid, not to the caller, so
both overview pages lay their spotlight out the same way whatever they pin.

```jsx
<CardBody>
	<FavouriteTileGrid>
		{favourites.map(record => <FavouriteTile key={record.id} {...} />)}
	</FavouriteTileGrid>
</CardBody>
```

Put it in a plain `CardBody` under a `CardHeader` reading "Favourites" — the header opens
the full list, which is where a favourite is turned on and off.

Fewer than three tiles keep their column width instead of stretching; more than three wrap
onto another row of the same columns. Do not cap the list yourself unless the page has a
reason to.

## Props

- `children` — the `FavouriteTile`s

With no favourites at all, render an `EmptyState` in place of the grid rather than an empty
one. An empty grid says nothing; the empty state says what fills it.
