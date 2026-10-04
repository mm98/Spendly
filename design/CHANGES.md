# Spendly - changes since handoff_2026_10_04i_changes

Copy these files over handoff_2026_10_04i_changes. handoff_2026_10_04i_changes is unchanged; this package follows it.

## 1. Line editor in the sheet (c15): the 70px photo

The sheet now uses the same photo slot as the desktop editor, `calc(var(--box) + var(--sp-12) + var(--mark-medium))` square (70px). The `.sp-line-editor--sheet .sp-mark` and `.sp-line-editor--sheet .sp-slot` size overrides from 04i are removed.

## 2. Line editor in the sheet (c15): fields 50/50

`.sp-line-editor--sheet .sp-line-editor__grid` is `repeat(2, minmax(0, 1fr))` instead of `132px 1fr`. Quantity and Unit price share one row, Retail price and Line total the next, each half the width (167px in the 1c phone).

## 3. Add row: the handle spacer only where rows have handles

`sp-list-item--add` carried a hidden `sp-list-item__handle` spacer in every list. In a list whose rows have no handle (the phone order lists), it pushed the + 28px right of the photos above.

- **Markup:** render the spacer in the add row only when the rows above carry handles. Removed from Order editing layouts 1c and one Components specimen.
- No CSS change; `.sp-list-item--add .sp-list-item__handle { visibility: hidden; }` stays for lists that reorder.
- Note added to Order editing layouts 1b.

**What the app changes**
- Take the new components.css.
- Omit the add row's handle spacer when the list does not reorder.

All three are logged in `styles/COMPONENT-STATUS.md`.

## Files

- `Order editing layouts.dc.html`
- `Components.dc.html`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js`: 84 finding(s) across 26 pages, the same known set as handoff_2026_10_04i_changes.
