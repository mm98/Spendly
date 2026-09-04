---
category: Forms
---
A figure and its unit in one field. Use it for every number a reader types: an amount, a
quantity, a discount, a budget.

It is not `input[type=number]`. A Danish decimal is written with a comma, and a native number
field hands back an empty value for one, so the grammar and the on-screen keyboard are the
app's own: the field types as text with a decimal keypad, and what it hands back is already
filtered to what a save accepts.

## Props

- `value` — the figure as text.
- `onChange` — gets the filtered figure, not the event.
- `unit` — the short suffix inside the field (`kr.`, `pcs`). Always the shorthand form.
- `id`, `invalid`, `describedBy` — the same three every field in the app takes, so a label
  and an error message can address it.

## Example

```jsx
<Field label="Total" htmlFor="total" error={errors.total} errorId="total-error">
	<NumberInput id="total" value={values.total} unit="kr."
		invalid={Boolean(errors.total)} describedBy="total-error"
		onChange={total => setValues(v => ({ ...v, total }))} />
</Field>
```

A figure with no unit is the same control without the `unit` prop. Anything that is not a
figure belongs in `TextInput` instead.
