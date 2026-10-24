---
category: Lists
---
Record cards as a grid, with a head above it and a footer under it, each at the grid's width.

## Props

- `head`: above the grid: a `ListToolbar loose`, or a `BulkBar loose` while cards are picked
- `footer`: under the grid, usually a `ListMore loose`
- `children`: `Record`s

## Rules

- Takes no `className` or `style`.

## Example

```jsx
<Records
	head={<ListToolbar loose><strong className="sp-data">3 orders</strong></ListToolbar>}
	footer={<ListMore loose shown={3} total={18} pageSize={3} onMore={loadNext} />}
>
	{orders.map(o => <Record key={o.ref} title={o.name} subtitle={o.ref} amount={o.amount} />)}
</Records>
```
