---
category: Navigation
---
The row of sections at the bottom of a phone screen, where a thumb reaches.

## Props

- `children`: `TabBarItem`s, usually four
- `aria-label`: names the bar ("Sections")

## Parts

- `TabBarItem`: one section. `icon`, the label as children, `current` (the section the reader is in), `to` (a link) or `onClick` (a button, e.g. More).

## Rules

- Takes no `className` or `style`.
- In a touch `Shell` it is fixed to the bottom of the window, and hidden while a `SaveBar` or a sheet is open.
- Over an iPhone's home bar its items sit lower.

## Example

```jsx
<TabBar aria-label="Sections">
	<TabBarItem icon="home" to="/">Home</TabBarItem>
	<TabBarItem icon="receipt" current to="/orders">Orders</TabBarItem>
	<TabBarItem icon="building-store" to="/vendors">Vendors</TabBarItem>
	<TabBarItem icon="dots-vertical" onClick={openMore}>More</TabBarItem>
</TabBar>
```
