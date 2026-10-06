# Spendly - changes since handoff_2026_10_06f_changes

Copy these files over handoff_2026_10_06f_changes. Answers brief 36. No drawing changed.

## 1. General rules for every element (Layout rules 15f, new)
- New section "Rules every element follows". A screen does not restate these rules; a case they answer needs no drawing or question.
- Tooltips and readouts:
  - Behave like the browser's native tooltip: drawn on their own layer, on top of everything else, next to what they describe.
  - Never held inside the box they belong to: they may stand outside their chart, card, table, sidebar or any other container, so they never cover what they read. This is what allows a tooltip on a pill or a mark.
  - Only the window's edge moves them: they shift or flip only where they would leave the window. No container clips them; no container's scroll cuts them off.
  - Showing one never moves anything; it takes no space in the layout.

## 2. The readout is no longer pinned inside the plot (Order statistics 4a, Home 10a, Dark mode)
- Removed `data-pin="top"` from the markup and the `.sp-bars--plot .sp-bars__tip[data-pin="top"]` rule from components.css.
- Where there is no room above the bars, the readout stands above the plot and the card. The 4a and 10a notes say so and link to 15f.
- `data-side="start"` / `"end"` are unchanged.

## 3. Check (styles/check.js)
- New assertion: no `data-pin` in any page and no `[data-pin]` rule in components.css.
- Clean: 0 findings across 26 pages.

## Files
- Layout rules.dc.html
- Order statistics.dc.html
- Home.dc.html
- Dark mode and image viewer.dc.html
- styles/components.css
- styles/check.js
