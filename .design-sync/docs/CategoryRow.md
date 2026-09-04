---
category: Rows
---
The row a category breakdown is a list of: the category's own coloured tile and glyph, its
name, a line saying what share of expenses it is, and its spend. It backs the rows beside a
breakdown ring and the budget list on Categories.

## Composing it

Rows go in a `category-rows` block inside a `CardBody` — that block is the grid keeping
tile, text and figure in three columns down the card.

```jsx
<Card aria-label="Category breakdown">
	<CardHeader title="Category breakdown" />
	<CardDivider />
	<CardBody>
		<div className="category-rows">
			{categories.map(c => (
				<CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />
			))}
		</div>
		<Button variant="block" to="/categories">ALL CATEGORIES</Button>
	</CardBody>
</Card>
```

## The record it takes

Unlike most rows here, this one takes the whole record and reads it:

- `colour` and `icon` (or `iconPath`) draw the tile — the glyph's ink is picked from the fill
- `name` is the title
- `spend` is a **number**; the row formats it as whole kroner
- `share` is a **number** like `38.4`; the row writes it as "38,4% of expenses"

A record missing `spend` renders an empty figure and no error, so pass the whole thing.

## Choosing the meta line

Left alone, the row states the share. Pass `meta` to say something else — most often what
the spend is against a budget: `88% of a 4.500 kr. budget`. When you do that, make `spend`
cover the same stretch of time the sentence claims. The month's budget beside an all-time
spend is two facts pretending to be one.

Put the qualifier in the card header ("Against budget • September"), not in every row, so
one wording covers rows that all share it.

## Props

- `category` — the record: `{ name, colour, icon, iconPath?, share, spend }`
- `meta` — replaces the share line
- `to` — an in-app route; makes the row a link and draws the chevron

Where the row links, link it at what it names: the slice's own orders, over the same
window the figure covers.
