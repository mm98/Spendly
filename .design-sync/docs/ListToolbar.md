---
category: Lists
---
The summary line over a grid of cards, where no `List` draws one: the count and total, optionally led by the box that selects the page.

## Props

- `loose`: carries its own border
- `selectAll`: leads the line with the box that selects the page: `{ selectedCount, total, noun, onToggleAll }`
- `children`: the summary, such as a count and a total

## Rules

- Takes no `className` or `style`.
- When records are picked, a `BulkBar` takes its place.

## Example

```jsx
<ListToolbar loose selectAll={{ selectedCount: 0, total: 12, noun: 'orders', onToggleAll }}>
	<strong className="sp-data">48 orders</strong>
	<span className="sp-subtitle">· 61.480,00 kr.</span>
</ListToolbar>
```
