---
category: Surfaces
---
The grid that cards sit in on a page.

## Props

- `fluid`: fills the width with as many columns as fit, for a set whose length the page does not know; otherwise it holds the page's column count
- `children`: `Card`s

## Rules

- Takes no `className` or `style`.

## Example

```jsx
<Cards>
	<Card><Stat label="August" figure="61.480,00 kr." delta="Saved 8.240,00 kr." /></Card>
	<Card><Stat label="Orders" figure="18" /></Card>
</Cards>
```
