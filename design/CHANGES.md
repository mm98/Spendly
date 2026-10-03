# Spendly - changes since the 2 October handoff

3 October 2026. Copy these files over the 2 October package; everything else is unchanged.

## Button xsmall (Components c6)

- `.sp-btn--xsmall`: 22px high, 6px side padding, 12px type at weight 500, the standard 9px radius.
- `.sp-icon-btn--xsmall`: 22px square, for an icon button beside it.
- On touch both take the next size up: the button is the small size (34px, 16px padding, weight 600), the icon button the row size (32px).
- Used for the action in a rail section header: Views (Edit, Save, Done, Cancel) and Filters (Clear all, Clear).
- React: `Button size="xsmall"` and `IconButton size="xsmall"`.

## From the app review (Part A and B)

Accepted:

- A1 `--list-max: 420px` in `styles/tokens.css`.
- A2 `variant="picked"` in `react_handoff/ListItem.jsx`.
- B1 `.sp-combobox__panel` and `.sp-palette__body` stop at `--list-max` and scroll inside.
- B2 the ordering-by-hand CSS, as requested. The shadow contradiction is settled for `--shadow-menu`: the c1 notes now name it, no new token.
- B3 "Stop opening with it" added to the notes in 2g and 9e.
- B4 xsmall excluded from the touch full-width rule. The design's narrow-width block is `@media (max-width: 640px) { .sp-btn { width: 100%; } }`, not the app's `639.98px` / `:not(.sp-btn--small)`; it now reads `.sp-btn:not(.sp-btn--xsmall)`. The app's copy of that block differs from the design and should be brought back to it.
- B6 Cards select the page: select-all box leads the summary line in 2c and is the bulk bar's box. Notes in 2c and 2h updated. Components c1 never carried the select-all sentence, so nothing changed there.
- B7 note only: "A card with no photos shows the box without the scrim." See below for the CSS.
- B8 the mark ink is calculated (APCA, tie keeps `--surface`). CSS sets the result per swatch and theme and adds `data-ink`; `Mark.jsx` works it out from the rendered fill. The c2 note's old "flips to dark ink above L 75" is replaced by the rule.
- B9 the update notice is a specimen and notes in States and confirmations 6d; 11d's note points to it.
- B10 `.sp-toast-region` added as a column, stretched on touch.

Decided against the app:

- B5 Done stays **outline** xsmall. Every rail header action in the design (Edit, Save, Cancel, Clear all) is outline xsmall; the solid Done in 9e was the odd one out and is now outline xsmall too. The app's solid Done should change.

Not applied:

- B7 CSS. The design's stylesheet has no `.sp-record__pick::before` scrim at all, so `content: none` would cancel a rule that does not exist. The 2c note describes the scrim (rgba(27,26,23,0.35), circular). Send the app's `::before` rule and it goes into the design with the empty-band exception.

## Files

- `styles/components.css` - the two variants and their touch rules.
- `react_handoff/Button.jsx` - `xsmall` added to both size maps and docs.
- `playground-registry.js` - `xsmall` added to both size options.
- `Components.dc.html` - xsmall specimen in c6; rail headers use xsmall.
- `Order list.dc.html`, `Navigation shell.dc.html` - Views and Filters header buttons use xsmall.
- `styles/COMPONENT-STATUS.md` - change log entry.

## Checks

`styles/check.js` reports 84 findings: the 83 of the 2 October baseline, plus one "a stacked pair truncates" on the new 6d notice, which copies the existing two-tab notice beside it (already one of the 83).
