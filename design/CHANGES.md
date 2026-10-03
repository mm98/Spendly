# Spendly - brief 9 addendum answers (fixed)

**Fixed in this package:** `.sp-combobox--grow` now grows in any flex row, not only inside a card (the 7a Year select had lost its width). `.sp-window--select` is `display: flex; width: 100%`, so the phone Statistics period fills its row.

Copy these files over handoff_2026_10_03k_changes. This replaces handoff_2026_10_03l_changes.

`Brief 9 addendum answers.md` answers the nine points, numbered as the addendum.

**Stylesheet changes the app takes (components.css)**
- `.sp-list-item--card > .sp-combobox { flex: none; }` and `.sp-list-item--card > .sp-combobox--grow { flex: 1 1 0; min-width: 0; }` - Filters takes the spare width (1).
- `.sp-menu__item > svg { flex: none; }` - drop it from app.css (4).
- `.sp-line-editor .sp-mark` is `--mark-medium` (6).
- `.sp-combobox--bare` - the compact year control on the phone Budget bar; the app can return to one bar (7).
- `a.sp-menu__item { text-decoration: none; }` - drop the inline style (8).
- `.sp-window--select` - the phone Statistics period with previous and next arrows (9).

**What the app changes**
- Vendors and Categories: cards at a list column of 640px or less, the 880 table above it (2).
- Statistics hints: "click to narrow down", "click to narrow further". The crumb row's aria-label is "Showing" (3).
- Account menu row: "Shortcuts" (5).

## Files

- `Mobile screens.dc.html`
- `Navigation shell.dc.html`
- `Actions inventory.dc.html`
- `Order statistics.dc.html`
- `Vendors and categories.dc.html`
- `Components.dc.html`
- `Dark mode and image viewer.dc.html`
- `styles/components.css`
- `Brief 9 addendum answers.md`

`styles/check.js` reports 82 known findings, unchanged.
