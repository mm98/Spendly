---
category: Surfaces
---
A box inside a card that holds one thing apart from the rest: a budget group's figures, a warning, a piece of text to copy.

## Props

- `variant`: `'default'` | `'quiet'` (tighter and toned, for a pair of lines) | `'snippet'` (text to copy, kept as written and broken anywhere; room is left at the right for a copy control)
- `color`: `'default'` | `'warning'` | `'danger'`
- `children`: spans with type classes

## Rules

- Takes no `className` or `style`.
- A well sits inside a `Card`.

## Example

```jsx
<Card>
	<Well color="danger">
		<span className="sp-title">Two rows were not imported</span>
		<span className="sp-subtitle">Rows 14 and 22 have no price.</span>
	</Well>
</Card>
```
