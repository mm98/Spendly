---
category: Actions
---
A short status label: an order's state, a budget that is over or within its limit.

## Props

- `color`: `'default'` | `'success'` | `'danger'`
- `state`: `'progress'` (work in flight, e.g. "Scanning") or nothing
- `truncate`: cuts long text with "…" to the width it is given
- `children`: the text

## Rules

- Takes no `className` or `style`.
- A state, never a control: it renders a span and takes no handler.
- `progress` is a state, not a colour: a pill in progress takes no `color`. In flight is not in trouble.

## Example

```jsx
<div className="sp-row-flex sp-gap-8">
	<Pill color="success">Approved</Pill>
	<Pill color="danger">2.100 over</Pill>
	<Pill state="progress">Scanning</Pill>
</div>
```
