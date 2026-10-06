# Spendly - changes since handoff_2026_10_06b_changes

Replaces handoff_2026_10_06c_changes. Copy these files over handoff_2026_10_06b_changes. Answers brief 31.

## Fixed since handoff_2026_10_06c_changes
- Section 1, Token field suggestions: the note said the suggestions already use the combobox classes. No page draws them open, so it now states that they are to be built with those classes. No file other than this one changed.

## 1. Denser option rows (styles/tokens.css, styles/components.css, Components c5 notes)

### Tokens (new)
- `--row-h: 32px` - an option in a pickable list on desktop.
- `--row-h-touch: 44px` - the same on touch.

### Desktop
- `.sp-combobox__option`: `min-height: var(--row-h)`, `box-sizing: border-box`, padding `var(--sp-6) var(--sp-12)` (was `var(--sp-8) var(--sp-12)`).
- `.sp-combobox__panel`: `gap: var(--sp-2)` (was `var(--sp-6)`).
- 34px a row (was 42).

### Touch
- `.sp-touch .sp-combobox__option`, `.sp-touch .sp-menu__item`, `.sp-touch .sp-palette__row`: `min-height: var(--row-h-touch)` (was `--control-h-touch`, 48).
- `.sp-touch .sp-combobox__panel`: `gap: 0`.
- 44px a row (was 54). A phone shows about 12 options at once instead of 9 or 10.
- `.sp-touch .sp-field-group__head` keeps `--control-h-touch` (48): it opens a group of 48px fields. It is now its own rule.

### Separator
- `.sp-combobox__panel hr`: `margin: var(--sp-4) 0` (was 0). It sits 6 from the rows either side on desktop, 4 on touch.

### Menu and palette on desktop
- Unchanged: menu items 36 with no gap, palette rows 38.

### Token field suggestions
- No page draws the token field's suggestions open. They are built with `.sp-combobox__panel` and `.sp-combobox__option`, so they take the same rhythm; they get no rule of their own.

## 2. Favourites first in every vendor and category picker (Components c5 notes)

### Groups
- Every mode 2 list of vendors or categories is grouped Favourites, Recent, then the rest, headed "Favourites", "Recent" and "Other vendors" or "Other categories".

### Where
- The order form's vendor field.
- The category tokens on the order form and the vendor form.
- Add category in an order's menu and in the bulk bar.
- The category picker on Bookmarks and in the import mapping.
- The merge target pickers for vendors and categories.

### Order within each group
- Favourites: alphabetical.
- Recent: the vendors or categories on the latest orders, newest first, up to 5, as the vendor field does today. One that is a favourite shows only under Favourites.
- The rest: alphabetical.

### Rules
- A group with nothing in it is not drawn. With one group left, there is no header.
- Typing filters every group in place, keeping the order. The create row stays last.
- Overviews, tables, cards and the order list's filter rail are not pickers and do not change.

## 3. Not changed
- No type, colours or other components.

## 4. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- styles/tokens.css
- styles/components.css
- Components.dc.html
