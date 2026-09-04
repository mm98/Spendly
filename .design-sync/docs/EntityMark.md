---
category: Rows
---
The small star that says a record is a favourite. It wraps the record's own tile on the All
vendors and All categories lists.

## How to use it

It is never used alone: it goes into an `EntityRow`'s `mark`, around the tile that row would
have carried anyway.

```jsx
<EntityRow
	mark={<EntityMark favourite={vendor.favourite}>
		<span className="entry-avatar" style={{ background: vendor.colour, color: ink }}>
			{vendor.initials}
		</span>
	</EntityMark>}
	name={vendor.name} meta="34 orders" editTo={`/vendors/${vendor.id}/edit`} />
```

The child is the tile at its own size — a vendor's initials avatar or a category's coloured
glyph. The mark overlaps its corner rather than growing it, so a favourite row and a plain
row keep one left column and no name shifts sideways.

## What it is not

It is not a control. Nothing here turns a favourite on or off — that is a choice on the
record's own edit page, turned off the same way it is turned on. Rendering it as something
clickable would offer an action this component does not perform.

With `favourite` false the mark draws nothing at all, so it is safe to wrap every row.

## Props

- `favourite` — draws the star
- `children` — the record's own tile
