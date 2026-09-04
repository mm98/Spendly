---
category: Cards
---
The small uppercase label the app names a block with. Use it above a group of cards, where
there is no card header to carry the name.

It draws one span at 11.5px, semibold, uppercase, with wide letter-spacing. Write the text in
sentence case ("Your cards") — the uppercase is the stylesheet's, not yours.

Inside a card you do not need it: `CardHeader` already draws this exact label from its
`title`. Reach for `SectionLabel` only outside a card.

## Where it goes

- Inside a `SectionHeader`, opposite the actions for the whole group. This is the common case.
- On its own, directly above a group, when the group has no actions.

## Props

- `children` — the label text
- anything else is spread onto the `<span>`

## Example

```jsx
<SectionHeader>
	<SectionLabel>Your cards</SectionLabel>
	<Button variant="pill" icon="pencil">EDIT</Button>
</SectionHeader>
```
