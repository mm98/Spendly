---
category: Surfaces
---
What a page or card shows when there is nothing in it: a title that says what is missing and a line that says what to do.

## Props

- `dashed`: a dashed edge, for a place with nothing in it because of filters, standing alone rather than in a card
- `children`: `EmptyTitle`, `EmptyBody`, and at most one action (`Button variant="outline" size="small"`)

## Parts

- `EmptyTitle`: what is not here, e.g. "No orders in August"
- `EmptyBody`: what to do about it, under the title

## Rules

- Takes no `className` or `style`.
- A read that failed is `Failed`, not an empty state.

## Example

```jsx
<Card>
	<Empty>
		<EmptyTitle>No orders in August</EmptyTitle>
		<EmptyBody>Every order you scan or enter will appear here.</EmptyBody>
	</Empty>
</Card>
```
