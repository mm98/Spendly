# Every dropdown list follows "The list is the field's width"

Answers Brief-combobox-list-width.md. The brief left a choice: keep `--end` without its fixed width, or remove it. This package removes it.

## 1. `end` and `sort-end` are removed

**The problem.** `.sp-combobox--end` fixed its list at 288 wide and always grew it to the left, whatever the field's width and whatever the room. Every other list is the field's width and grows only for an option that does not fit.

**What changed.** The default list already grows toward the side with more room when it would pass the window edge (`place()`), so `--end` had no job left. `end` and `sort-end` are gone from `VARIANT`; a control that used `end` uses `default`, one that used `sort-end` uses `sort`. Its list is the field's width, grows only for an option that does not fit, up to 288, and grows leftward only when the left has more room.

The list hung from the field's right edge is now a state of the panel, `data-hang="end"`, so a drawing can show it with the same rule the app uses. `place()` sets it, in place of the inline `left: auto; right: 0` it set before, and keeps setting the measured width inline. `unplace()` removes it with `data-place`.

**Where.**
- `styles/components.css`: the "DRAFT c5 variant" block and `.sp-combobox--end .sp-combobox__panel` are replaced by `.sp-combobox__panel[data-hang="end"] { left: auto; right: 0; }`.
- `react_handoff/Combobox.jsx`: `end` and `sort-end` removed from `VARIANT`, and from the `variant` description in the JSDoc; `place()` sets `data-hang="end"`; `unplace()` clears it.
- `Components c5`, the notes "The list is the field's width" (no longer names `--end`) and "A closing list fades where it stood" (states the side-with-room rule and `data-hang`).
- `Order statistics 4e`: the lens on the bar is the `default` combobox, drawn open with `data-hang="end"`, and a new note says why.
- `playground-registry.js`: `end` removed from the Combobox variant control.
- App: `react/src/pages/SettingsImportMap.jsx`, the three `sort-end` lists (the "Change" list for how dates are written, the "grouped by" list, the category list per imported value) become `sort`. `react/src/pages/Bookmarks.jsx`, the phone Sort, `end` becomes `default`. `react/src/pages/Orders.jsx` already uses `sort` (#669). The Order statistics lens, wherever it is built with `end`, becomes `default`.
- Storybook: `storybook/stories/Combobox.stories.jsx`, the `end` story is removed; the variant control follows `VARIANT`.

**What is still open.** Nothing.

## later.md

No entry in later.md is a design fix. The one entry, a deleted record kept for a while, is an idea for later and stays as it is.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - c5 notes.
- `Order statistics.dc.html` - 4e drawing and note.
- `styles/components.css` - the removed variant and the `data-hang` state.
- `react_handoff/Combobox.jsx` - `VARIANT`, JSDoc, `place()` and `unplace()`.
- `playground-registry.js` - the Combobox variant control.
- `support.js`, `components.js`, `view.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-statistics.css` - what the two pages load to open from the folder.

## styles/check.js

0 finding(s) across 28 pages.
