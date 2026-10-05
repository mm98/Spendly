# Spendly - changes since handoff_2026_10_05c_changes

Copy these files over handoff_2026_10_05c_changes. Answers Design brief 24.

## 1. Stacked and single bars have one shape (Order statistics, Spend by month)

- `.sp-bars__stack` is rounded at the top only: `border-radius: var(--r-marker) var(--r-marker) 0 0`. Was `6px` on all four corners.
- This is the same value as `.sp-bars__bar`, so Stacked and Total draw the same bar. Both stand square on the axis.
- The app can remove its workaround in app.css:
  `.sp-bars__stack { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }`

## 2. Check

- `styles/check.js` asserts that `.sp-bars__bar` and `.sp-bars__stack` both use `var(--r-marker) var(--r-marker) 0 0`.

## 3. Unchanged

- `.sp-bars--spark .sp-bars__bar` keeps its 2px radius.
- `.sp-bars__pair > .sp-bars__bar` already uses the top-only radius.

## Files
- styles/components.css - `.sp-bars__stack` radius
- styles/check.js - new "bars share one shape" assertion
- styles/COMPONENT-STATUS.md - change log entry
