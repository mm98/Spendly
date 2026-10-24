---
category: Forms
---
An amount input that shows the number formatted for the locale ("24.310,00") and hands back a number. Placed inside a `Field`, usually with `unit="kr."`.

## Props

- `value`: a number, or `null` for empty
- `onChange(number | null)`: receives the parsed number, or `null` when the text is not a number
- `decimals`: places shown (default 2)
- `min`: a typed value under it becomes `min`
- `locale`: e.g. `'da-DK'`; defaults to the browser's
- `expected`: the figure is drawn in the lighter ink, as a value taken from elsewhere
- `cell`: the amount in a sheet's cell. It reads as a figure until clicked or focused
- `danger`: marks the input invalid without a `Field` message
- `onBlur`, `disabled`, `placeholder`, `aria-label` and other native input attributes

## Rules

- Takes no `className` or `style`.
- What is being typed is kept as typed until the field is left, then shown formatted again.
- The unit (`kr.`) comes from `Field`'s `unit` slot, not from the value.

## Example

```jsx
<Field label="Amount" unit="kr.">
	<NumberField value={amount} onChange={setAmount} locale="da-DK" />
</Field>
```
