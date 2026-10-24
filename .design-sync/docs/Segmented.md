---
category: Actions
---
A row of two to four choices where exactly one is picked: a view, a period, a filter. Radios in a shell, so the arrow keys move the pick.

## Props

- `name` (required): the radio group's name
- `options`: `{ value, label, disabled? }[]`; a value is a string or a number, such as a month's number
- `value` with `onChange(value)` (controlled), or `defaultValue` (uncontrolled); `onChange` receives the option's value
- `variant`: `'default'` | `'facet'` (fills the width, as a filter) | `'narrow'` (no wider than a field) | `'fill'` (segments share the full width equally)
- `fixed`: an ordered set that never grows, like the months; it may pass four options
- `aria-label`, `role`, `aria-labelledby`

## Rules

- Takes no `className` or `style`.
- More than four options is a `Combobox`, unless `fixed`.
- Each label is measured at its selected weight, so the row does not shift as the pick moves.
- Inside a `Field` it takes a legend, not a label: it is a set.

## Example

```jsx
<Segmented
	name="order-view"
	aria-label="Show orders as"
	options={[{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }]}
	value={view}
	onChange={setView}
/>
```
