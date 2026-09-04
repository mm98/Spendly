---
category: Cards
---
The padded region under a card's hairline. Everything a card shows that is not its header
goes inside one, and a card may hold more than one with a `CardDivider` between them.

`variant` picks the padding. Write the words in full, space-separated — they are class words,
not a prefixed enum:

- *(nothing)* — the default: 14px top, 18px bottom. Text, notes, a chart, an empty state.
- `card-body-tight` — 6px top, for a body that opens straight onto a list.
- `card-body-page` — even padding all round, for summary rows and form fields.
- `card-body-centered` — children centred, with more room. The "reading the document" state.
- `card-body-filters` — the search-and-filters panel.
- `card-body-fill` — the body takes the card's leftover height, for a chart sharing a grid row.
- `entry-list` — combine with the above when the children are `EntryRow`s.

## What it decides for you

Padding, including the gap under the hairline. **Never override `padding-top`.** A body that
opens on a row (`.data-row`) already drops its top padding, because the row's own padding is
both the gap and the box its hover tint paints.

## Props

- `variant` — the class words above, e.g. `"entry-list card-body-tight"`
- `children`
- `className`, and anything else is spread onto the `<div>`

## Example

```jsx
<CardBody variant="entry-list card-body-tight">
	<EntryRow avatar={bilka} name="Bilka" meta="12 August" amount="1.284 kr." to="/orders/1" />
	<Button variant="block" to="/orders/all">SEE ALL</Button>
</CardBody>
```
