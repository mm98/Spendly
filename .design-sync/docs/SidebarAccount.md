---
category: Navigation
---
The signed-in account at the foot of the sidebar: a round mark, the name and email, and a menu that opens above it.

## Props

- `email` (required): the account's email
- `name`: shown above the email; without it the email stands alone and the initials come from the address
- `picture`: a picture's address, shown in the round mark in place of initials
- `expanded`: the menu is open
- `onClick`: the press that opens or closes it
- `onDismiss`: a press outside, Escape or Tab
- `menu`: the menu to show while `expanded` (a `Menu` with `MenuItem`s). It is drawn on the window, above the block, or beside it on the rail.
- `tip`: the hover label on the rail

## Rules

- Takes no `className` or `style`.
- Place it in a `Sidebar`, after the `sp-grow` spacer and a `SidebarDivider`.
- Up or Down on the closed button opens the menu at its last or first item.

## Example

```jsx
<SidebarAccount
	name="Camilla Lomholt"
	email="camilla@indbo.dk"
	expanded={open}
	onClick={() => setOpen(!open)}
	onDismiss={() => setOpen(false)}
	menu={<Menu aria-label="Account"><MenuItem icon="user">Account and profile</MenuItem><MenuItem icon="power">Sign out</MenuItem></Menu>}
/>
```
