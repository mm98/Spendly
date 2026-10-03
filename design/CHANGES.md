# Spendly - brief 7: show where to click to edit a budget amount

Copy these files over the New order follow-up package (handoff_2026_10_03f_changes).

- **21a and 21c, a budget line** (`.sp-sum.sp-sum--edits`, role="button"): under the pointer the whole line takes `--hover`, at `--r-tile`, bled 8px past the text on both sides (negative margin, equal padding) so the figures keep their column. The same in edit mode (21c), where the name opens the row editor and the amount its field. Drawn hovered: Salary.
- **21b, an amount cell** (`.sp-input--cell`): under the pointer it takes `--hover` inside its own box and no border. The old `border-color: var(--line-3)` hover is gone. Focus is unchanged: green border, white, `--ring`. Drawn hovered: the first cell.
- **Keyboard:** `--ring` on focus is unchanged; hover and focus show together.
- **Touch:** both hovers sit inside `@media (hover: hover)`, so nothing changes on a phone.
- `[data-hover="true"]` draws the state in the design only; the app uses `:hover`.

## Files

- `styles/components.css`
- `Budget.dc.html`

`styles/check.js` reports the same 84 known findings.
