---
category: Rows
---
The row a list of records is made of: All vendors, All categories and the wishlist. The
record's own mark, its name, one meta line, a figure with a second figure under it, and one
destination — the record's own page.

## Composing it

```jsx
<Card aria-label="All vendors">
	<CardHeader title={`Vendors • ${shown}`}>
		<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
	</CardHeader>
	<CardDivider />
	<CardBody variant="card-body-tight">
		{rows.map(v => (
			<EntityRow key={v.id}
				mark={<EntityMark favourite={v.favourite}>
					<span className="entry-avatar" style={{ background: v.colour, color: ink }}>{v.initials}</span>
				</EntityMark>}
				name={v.name} meta="34 orders" amount="18.420 kr." sub="saved 1.965 kr."
				editTo={`/vendors/${v.id}/edit`} />
		))}
		<Pager {...paged} onPage={setPage} />
	</CardBody>
</Card>
```

## One row, one destination

The whole band opens the record for editing, the way an order row opens the order. Do not
add a second unlabelled glyph at the end of the row for the record's orders — that
destination belongs on the record's own page, stated in words.

The exception is a record that lives somewhere outside the app. Then:

- `open` — `{ href, label }` sends the row itself out, in a new tab. A row that leaves the
  app draws no chevron.
- `action` — a control riding on top of the row, e.g. an edit `IconButton`, because one link
  cannot hold another.

With neither `open`, `action` nor `editTo`, the row is inert: no link, no chevron. That is
what an edit form's rail draws to preview a record that has not been saved yet.

## The mark

`mark` is the record's own tile, passed in whole — this row never decides what a record
looks like. Wrap it in `EntityMark` on the two lists that show favourites.

## Props

- `mark` — the record's tile, usually inside an `EntityMark`
- `name` — the record's name; it is the link where the row goes somewhere
- `meta` — one line: order count, share, budget, a matched alias
- `amount`, `sub` — the figure and the smaller figure under it
- `editTo` — the record's own edit page
- `open` — `{ href, label }`, an address outside the app
- `action` — a second control on top of the row

Put everything the meta line has to say on that one line, separated by ` • `. There is only
one.
