# Spendly - changes since the 2 October handoff

3 October 2026. Copy these files over the 2 October package; everything else is unchanged.

## Button xsmall (Components c6)

- `.sp-btn--xsmall`: 22px high, 6px side padding, 12px type at weight 500, the standard 9px radius.
- `.sp-icon-btn--xsmall`: 22px square, for an icon button beside it.
- On touch both take the next size up: the button is the small size (34px, 16px padding, weight 600), the icon button the row size (32px).
- Used for the action in a rail section header: Views (Edit, Save, Done, Cancel) and Filters (Clear all, Clear).
- React: `Button size="xsmall"` and `IconButton size="xsmall"`.

## Files

- `styles/components.css` - the two variants and their touch rules.
- `react_handoff/Button.jsx` - `xsmall` added to both size maps and docs.
- `playground-registry.js` - `xsmall` added to both size options.
- `Components.dc.html` - xsmall specimen in c6; rail headers use xsmall.
- `Order list.dc.html`, `Navigation shell.dc.html` - Views and Filters header buttons use xsmall.
- `styles/COMPONENT-STATUS.md` - change log entry.

## Checks

`styles/check.js` reports the same 83 known findings as the 2 October baseline.
