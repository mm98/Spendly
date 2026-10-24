---
category: Surfaces
---
The rail beside a record's form: its cards in a column, held in view while the form scrolls.

## Props

- `wide`: the 400px rail instead of the 360px one
- `children`: `Card`s (details, totals)

## Rules

- Takes no `className` or `style`.
- It sits beside the form and sticks near the top while the page scrolls. On a narrow screen the page does not render it and puts its cards in the flow.

## Example

```jsx
<Panel>
	<Card><CardHeader name="Details" />...</Card>
	<Card>
		<Sum value="3.640,00 kr.">Items</Sum>
		<Sum variant="total" value="3.980,00 kr.">Total</Sum>
	</Card>
</Panel>
```
