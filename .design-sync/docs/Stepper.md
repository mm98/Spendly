---
category: Actions
---
A number with a minus and a plus button on each side: a quantity, a count, metres of fabric.

## Props

- `value` with `onChange(number)` (controlled), or `defaultValue` (default `1`); `onChange` receives a number
- `min`, `max`: the bounds. A step that would cross one is not offered: its button is disabled.
- `step` (default `1`): what minus and plus move by
- `decimals`: how many places a typed value keeps; the step's own places when absent (`0.25` is two)
- `locale`: how a value with places is typed and shown, e.g. `'da-DK'` shows `2,75`
- `aria-label`: the name, when it is not inside a `Field` with a text label
- `id`

## Rules

- Takes no `className` or `style`.
- Needs a name: put it in a `Field` with a text label, or pass `aria-label`. Without either it logs an error.
- The buttons are named from the same text: "One step fewer Quantity", "One step more Quantity".
- With places, it is a text input that accepts either separator while typing; the value stays a number.

## Example

```jsx
<Field label="Quantity">
	<Stepper value={quantity} min={1} max={20} onChange={setQuantity} />
</Field>
```
