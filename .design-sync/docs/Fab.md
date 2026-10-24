---
category: Navigation
---
The one round floating button on a phone screen (New order), above the tab bar.

## Props

- `aria-label` (required): what the button does ("New order")
- `icon`: an icon name (default `'plus'`)
- `to`: the button is a link
- `onClick`: the press, when there is no `to`

## Rules

- Takes no `className` or `style`.
- Without an `aria-label` it logs an error: a glyph names nothing.
- One per screen. In a touch `Shell` it is fixed above the tab bar, and hidden while a save bar or a sheet is open.

## Example

```jsx
<Fab to="/orders/new" aria-label="New order" />
```
