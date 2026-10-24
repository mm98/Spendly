---
category: Data
---
One line of a summary: what it is on the left, what it comes to on the right. A `total` line ends the sum.

## Props

- `children`: the name of the line
- `value`: what it comes to (text, a link, or a `Well` for a long note)
- `variant`: `'default'` | `'stacked'` (value under the name, for a note) | `'total'` (the last line, larger)
- `tone`: `'default'` | `'expected'` (only planned so far, grey) | `'success'` | `'danger'`
- `named`: the name is one the reader typed; it is cut with an ellipsis rather than wrapped
- `edits`: pressing the line opens its amount in place
- `meta`: a quiet line under the name

## Rules

- Takes no `className` or `style`.
- Lines sit straight in a `Card`, one after the other; the card draws the rules between them.

## Example

```jsx
<Card>
	<Sum value="3.640,00 kr.">Items</Sum>
	<Sum value="340,00 kr.">Shipping</Sum>
	<Sum variant="total" value="3.980,00 kr.">Total</Sum>
</Card>
```
