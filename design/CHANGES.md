# Spendly - changes since handoff_2026_10_04_changes_fixed

Copy these files over handoff_2026_10_04_changes_fixed.

## 1. The sidebar divider sits above Settings

Settings, Dark mode and the account are one bottom-aligned block, so the divider sits above Settings, not between Settings and Dark mode. Same in the expanded sidebar and the rail; the rail had no divider before and now has one.

- Markup order only, no CSS change: `<hr class="sp-sidebar__divider">` directly before the Settings item.
- Pages: Navigation shell (9a, 9b, 9g, 9h, 9i), Bookmarks, Home, Settings and import, Dark mode and image viewer.

**What the app changes**
- Move the divider above Settings in the sidebar, in both states.

## 2. Nav rows: right inset 12

`--shell-item-pad` is `8px 12px 8px 8px`, was `8px 8px` (`styles/tokens.css`). The icon is centred in its 24px slot, so its glyph reads about 13px in from the left; a count, switch or chevron at 8px sat closer to the right edge. Applies to every `.sp-nav-item`, dark sidebar and `--light` alike. The rail sets its own padding and is unchanged.

**What the app changes**
- Nothing beyond taking the new tokens.css.

## 3. The Views card does not shift when Edit is pressed

Edit mode is the at-rest row with two slots swapped: `.sp-nav-item--light` rows in `.sp-nav-list` (40px, 6px apart), the drag handle (`.sp-list-item__handle`) inside `.sp-nav-item__icon`, the row menu (`.sp-cell-menu` with `.sp-icon-btn--small`) in the count slot. All orders shows "locked" in the count slot. The current view keeps its fill. Previously 9e drew edit mode as `.sp-list-item` rows 8px apart, about 45px tall, so the card grew 43px and everything below it moved.

- Markup only, no CSS change.
- Navigation shell 9e and Order list 2g step 4 now use the same markup. 2g step 4 also gains the handles its own note required.
- Documented in Order list 2g: "Pressing Edit or Done never shifts the layout."

**What the app changes**
- Render edit mode with the at-rest row as above. Pressing Edit or Done must not change any row's height or the card's height.

## 4. Mockup frames in Navigation shell (documentation only)

- 9a and 9i: the frame is `height: 1024px`. The `min-height: 880px` in handoff_2026_10_04_changes_fixed never applied (the shell's own `min-height` outranks page rules), and the frame changed height when 9i collapsed. Now the whole sidebar shows and collapsing changes only the width.
- 9h: the 768 frame is `height: 704px`, was 600px, which cut off Dark mode and the account mark in the rail.
- `styles/pages/navigation-shell.css` only. No component changed.

## 5. Checks

`styles/check.js` gains two assertions:
- the sidebar divider sits directly above Settings;
- the Views card lists its rows in `.sp-nav-list` in edit mode too.

## Files

- `Navigation shell.dc.html`
- `Order list.dc.html`
- `Bookmarks.dc.html`
- `Home.dc.html`
- `Settings and import.dc.html`
- `Dark mode and image viewer.dc.html`
- `styles/tokens.css`
- `styles/pages/navigation-shell.css`
- `styles/check.js`
- `styles/COMPONENT-STATUS.md`

`styles/check.js` reports 84 findings, the same known set as handoff_2026_10_04_changes_fixed.
