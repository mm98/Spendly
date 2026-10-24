---
category: Navigation
---
The bar at the top of the page: the search on a desktop, or Back, the title and a menu on a phone.

## Props

- `touch`: the phone bar, at the height every phone bar has (68px)
- `children`: what the bar holds, in one row. On a desktop a `SearchInput`; on a phone an `IconButton` back, a `Stacked` title and an `IconButton` menu, or one `sp-title sp-grow` title.

## Rules

- Takes no `className` or `style`.
- Inside `Shell` it is a direct child; in a touch shell it sticks to the top while the page scrolls.
- Below 900px wide, the desktop search fills the width the bar has.

## Example

```jsx
<TopBar touch>
	<IconButton icon="chevron-left" aria-label="Back to the orders" />
	<Stacked>
		<span className="sp-title">Indbo Møbler</span>
		<span className="sp-subtitle">SPENDLY-441</span>
	</Stacked>
	<IconButton icon="dots-vertical" aria-label="This order" />
</TopBar>
```
