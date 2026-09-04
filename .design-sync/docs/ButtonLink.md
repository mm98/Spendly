---
category: Actions
---
The text-weight action: SEE ALL, CLEAR ALL, ADD AN ORDER, SHOW HISTORY. It reads as words
rather than as a box, and it is still a real control — heavier and in capitals, so it stands
out from the sentence it sits beside without taking a button's weight.

Reach for it where a button would be too loud: closing out a row of filters, the one way out
of an empty state, a disclosure that shows more of a card. When the action is the point of
the screen, use `Button variant="primary"` instead.

Pass `to` for an in-app route and it renders a react-router link; pass `onClick` and it
renders a real `<button>`.

## The two forms look the same

Both forms are underlined, and both are the same weight, size and colour. Pass `to` and you get
a real link; pass `onClick` and you get a real button. Nothing about the styling tells them
apart, which is the point: the underline is what says "this is a link you can follow", and it
should not depend on which element the component happened to render.

## On a dark surface

`className="button-link-invert"` is the one modifier, for placing it on `AiCard` beside a
`Button variant="invert"`.

## Props

- `to` — in-app route; renders a link
- `children` — the words, in capitals
- `className` — `button-link-invert` on a dark card; anything else is spread onto the element
- `onClick` — the handler for the button form

## Example

```jsx
<EmptyState>
	<p>No orders yet. Add one and your spending appears here.</p>
	<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
</EmptyState>

<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
```

## Related

`Button` for the boxed action, `IconButton` for a glyph-only one.
