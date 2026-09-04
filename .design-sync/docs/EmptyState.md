---
category: Cards
---
What a card shows in place of its rows when there is nothing to list: an icon tile, one
sentence, and at most one action. It goes inside a `CardBody`, never on its own.

An empty state is an answer, not an absence. Say what is missing in the reader's words and
offer the one act that fills it — and offer nothing when there is nothing useful to press.

## Composing one

```jsx
<CardBody>
	<EmptyState>
		<p>No orders yet. Add one and your spending appears here.</p>
		<ButtonLink to="/orders/new">ADD AN ORDER</ButtonLink>
	</EmptyState>
</CardBody>
```

- The sentence is a `<p>`. Keep it to one; the tile caps at about 30 characters a line.
- The action is a `ButtonLink` (a text action) or `<Button variant="block">` (full width).
- Two different absences deserve two different sentences: "no orders yet" and "no orders match
  these filters" lead to different actions, so never share one string between them.

## Props

- `icon` — an Icon name for the tile. Defaults to `search`. Common choices: `search`, `chart`,
  `starFilled`, `cart`, `receipt`. Passing `null` removes the tile; almost never right, since
  every other empty state in the app has one.
- `children` — the sentence and the optional action
- `className`, and anything else is spread onto the `<div>`
