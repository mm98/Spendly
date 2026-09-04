---
category: Cards
---
The surface everything on a Spendly page sits on: a white panel with a hairline border and
rounded corners. Reach for it whenever content needs its own box on a page.

A card is a compound, and the order never changes:

```jsx
<Card aria-label="Latest orders">
	<CardHeader title="Latest orders" to="/orders/all" label="Latest orders, open all orders" />
	<CardDivider />
	<CardBody variant="entry-list card-body-tight">
		<EntryRow avatar={vendor} name="Bilka" meta="12 August" amount="1.284 kr." to="/orders/1" />
		<Button variant="block" to="/orders/all">SEE ALL</Button>
	</CardBody>
</Card>
```

`Card` itself draws only the box. It decides nothing about padding — that is `CardBody`'s —
and nothing about the band across the top — that is `CardHeader`'s.

## What the caller decides

- **A name.** Every card takes `aria-label`. It is usually the same words as the header title.
- **Whether the header goes anywhere.** `to` on the header makes the whole band a link.
- **The body's padding.** A list card takes `card-body-tight`; a card of text or fields takes
  `card-body-page`; anything else takes the default.
- **A second block.** A card may hold several `CardBody`s with a `CardDivider` between them.

## Props

- `variant` — extra class words, written in full: `card-tray`, `card-steps`. Most cards pass none.
- `children` — the header/divider/body group
- `className`, and anything else is spread onto the `<section>`

## Cards that already exist

Do not rebuild these by hand: `KpiCard` (a figure tile), `AiCard` (the dark scan prompt),
`ReturnsCard`, `DeleteCard`, `SkeletonCard`.
