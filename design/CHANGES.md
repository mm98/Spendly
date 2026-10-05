# Spendly - changes since handoff_2026_10_05g_changes

Copy these files over handoff_2026_10_05g_changes.

## 1. Stats in a line (new variant, `.sp-stats--line`)

- A new variant of the stats row, beside `.sp-stats`. Existing stats rows are unchanged.
- Stats sit in one row at their own widths: `grid-auto-flow: column`, `grid-auto-columns: max-content`, column gap `var(--sp-16)`, row gap `var(--sp-6)`, `justify-content: start`.
- Each `.sp-stat` spans the row's two tracks through `grid-template-rows: subgrid`: the labels share the first track, the figures share the second on `align-self: last baseline`, so figures of different sizes stand on one line.
- The selector is `.sp-stats.sp-stats--line`, so it holds over `.sp-touch .sp-stats`.
- Documented in Components beside the stat (specimen "Stats in a line").

## 2. Home, month card

- The three stats (Spent this month, Saved, Orders) use `sp-stats sp-stats--line`. They were a centred `sp-row-flex sp-gap-16 sp-wrap`, which floated the smaller figures halfway down the large one.

## 3. Home, Add an order

- The drop's subtitle reads "Image or PDF. The vendor, date and lines are read for you." ("to check" removed so it fits on one line).

## 4. Check

- `styles/check.js` is unchanged. Clean run: 0 findings across 26 pages.

## Files
- Home.dc.html - month card stats, drop subtitle
- Components.dc.html - Stats in a line specimen
- styles/components.css - `.sp-stats--line`
- styles/COMPONENT-STATUS.md - change log entry
