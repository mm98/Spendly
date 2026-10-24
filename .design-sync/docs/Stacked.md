---
category: Utilities
---
The column of text in a row, beside its mark: a title over a subtitle, or two `Line`s.

## Props

- `children`: spans with type classes (`sp-title`, `sp-subtitle`, `sp-meta`), or `Line`s

## Rules

- Takes no `className` or `style`.
- It fills the room it is given, so a long title is cut with `sp-truncate` rather than pushing the row wider.

## Example

```jsx
<ListItem variant="card" mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>}>
	<Stacked>
		<span className="sp-title sp-truncate">Indbo Møbler</span>
		<span className="sp-subtitle">SPENDLY-447 · 08/08/2026</span>
	</Stacked>
</ListItem>
```
