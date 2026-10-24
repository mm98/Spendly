---
category: Overlays
---
A list of actions: each item acts when pressed, and the menu closes. Floating, it hangs from the button that opens it; on a phone it becomes a sheet from the bottom.

## Props

- `position`: none (in flow, as drawn on a page) | `'floating'` (under its button, at the right) | `'up'` (above it) | `'start'` (at the left) | `'side-left'` | `'side-right'` | `'sub'` (a submenu inside a `MenuItem`) | `'row'` | `'plain'` (no frame, as a list inside a `Popover`)
- `scrolls`: a long menu scrolls inside itself
- `aria-label`: what the menu acts on, e.g. "This order"
- `children`: `MenuItem`, `MenuLabel`, `MenuSeparator`

## Parts

- `MenuItem`: one action. `icon` (an icon name), `onClick`, `to` (an in-app page; the item is a link), `disabled`, `danger` (a destructive action, in red), `dot` (a status dot: `'draft'` | `'progress'` | `'done'` | `'returned'` | `'cancelled'`), `selected` (`true` shows a check; pass `false` on the others of a choice). A `Menu position="sub"` as a child makes a submenu that opens on hover, focus or the right arrow.
- `MenuLabel`: the heading over a group of items.
- `MenuSeparator`: a rule between groups.
- `Anchor`: the element a floating menu hangs from. `open` shows the menu and lets it out of a card that clips; it places the menu above when the room below is short. Holds the menu's button and the `Menu`.

## Rules

- Takes no `className` or `style`.
- A `dot` that is not one of the five statuses is reported.
- The page owns `open`: the menu is opened and closed by its own button.
- A menu acts at once. A choice that waits for Apply is a `Popover`; a decision that must be answered is a `Dialog`.

## Example

```jsx
<Anchor open={open}>
	<IconButton icon="dots-vertical" aria-label="Actions for SPENDLY-447" aria-haspopup="menu" aria-expanded={open} onClick={toggle} />
	{open ? (
		<Menu position="floating" aria-label="This order">
			<MenuItem icon="pencil" onClick={edit}>Edit</MenuItem>
			<MenuSeparator />
			<MenuItem icon="trash" danger onClick={remove}>Delete order</MenuItem>
		</Menu>
	) : null}
</Anchor>
```
