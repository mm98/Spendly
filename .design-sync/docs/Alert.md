---
category: Overlays
---
A notice of a condition that lasts, in the page: it stays until the condition is gone.

## Props

- `color`: `'warning'` (default) | `'danger'` | `'success'`
- `mark`: the sign at the start, e.g. `'!'` or `<Icon name="check" size={12} />`
- `title`: the condition, in one line
- `children`: what it means and what to do
- `action`: one `Button` (outline, small) at the far end of the row
- `below`: puts the action under the words, for a narrow row

## Rules

- Takes no `className` or `style`.
- One action at most.
- An alert says what is true now. What already happened and goes away is a `Toast`.

## Example

```jsx
<Alert color="danger" mark="!" title="Two of the rows could not be imported">
	They have no price. The other 36 are ready.
</Alert>
```
