# Spendly - changes since handoff_2026_10_05d_changes

Copy these files over handoff_2026_10_05d_changes. Answers Design brief 25.

## 1. The spark bars are rounded at the top only (Order statistics, figure cards)

- `.sp-bars--spark .sp-bars__bar` is `border-radius: 2px 2px 0 0`. Was `2px` on all four corners.
- The app can remove its workaround in app.css:
  `.sp-bars--spark .sp-bars__bar { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }`

## 2. A chart draws every step of its period (Order statistics 4a)

- The Year period draws all twelve months, in the four figure cards and in Spend by month. September to December are steps still to come.
- A step still to come carries `data-future`:
  - in a spark, a bar at `data-h="0"`: an empty slot;
  - in the plot, a `span.sp-bars__col` with its tick and no bar, so it opens nothing and has no readout.
- `.sp-bars--plot .sp-bars__col[data-future] { background: none; }` removes the hover band. The app can remove its own rule for this from app.css.
- The spark aria-labels read "... by month in 2026", were "... over the last eight months".
- The 4a note states the rule: steps still to come are drawn empty.

## 3. Check

- `styles/check.js`: "bars share one shape" also asserts `.sp-bars--spark .sp-bars__bar` is `2px 2px 0 0`.
- Clean run: 0 findings across 26 pages.

## Files
- Order statistics.dc.html - twelve steps in 4a, note
- styles/components.css - spark radius, `[data-future]` state
- styles/check.js - spark radius assertion
- styles/COMPONENT-STATUS.md - change log entry
