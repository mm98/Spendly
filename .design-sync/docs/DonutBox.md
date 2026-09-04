---
category: Charts
---
The wrapper that centres a ring in a card body and sets the small lead-in above it. One child,
the ring; nothing else belongs inside it.

## Why it exists

A `CardBody` is a stacked block, so a `Donut` put straight into one sits against the left edge
and the rows under it no longer share a centre. `DonutBox` is the fix, and it is the only thing
it does — a centring grid plus 6px of space above the ring.

```jsx
<CardBody>
	<DonutBox>
		<Donut segments={segments} value="11.177 kr." label="Spent this month"
			ariaLabel="Category split of 11.177 kr. this month" />
	</DonutBox>
	<div className="category-rows">
		{split.map(c => <CategoryRow key={c.id} category={c} to={`/orders/all?category=${c.id}`} />)}
	</div>
</CardBody>
```

## When not to use it

A ring drawn **beside** its key, not above it, goes in a `CardBody variant="ring-row"` instead —
that body is the flex row, and it stacks the ring over the key on its own below 900px.
`DonutBox` there would fight it.

## Props

- `children` — the ring, and only the ring. The rows that name its segments go under the box.
- `className` — an extra class where a card needs one
