---
category: Utilities
---
One line in a `Stacked` column, laid out in a row: a title with its amount, a meta with its status.

## Props

- `children`: the line's parts; `<span className="sp-grow" />` pushes what follows to the end

## Rules

- Takes no `className` or `style`.
- Lives inside `Stacked`. The first line sits to the top of its content; the rest centre.

## Example

```jsx
<Stacked>
	<Line>
		<span className="sp-title sp-truncate">Bilka</span>
		<span className="sp-grow" />
		<span className="sp-amount">4.310,00</span>
	</Line>
	<Line>
		<span className="sp-meta">SPENDLY-452 · 19/08/2026</span>
		<span className="sp-grow" />
		<Pill color="success">Approved</Pill>
	</Line>
</Stacked>
```
