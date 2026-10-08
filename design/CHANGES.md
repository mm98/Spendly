# Spendly - crumbs text only, legends under their chart

Copy these files over handoff_2026_10_08k_changes.

- **A crumb is text only.** Indbo Møbler carried a vendor mark in the Statistics path (4b, 4c) and Decor beside it did not. A path also holds periods, statuses and amount ranges, which have no mark, so the only consistent rule is none: the two marks are removed. 20 crumbs across 7 pages, all text now. Components c8 states it.
- **A legend is always under its chart.** Spend by month (Order statistics 4a, Dark mode) drew it between the head and the chart; Spend vs saving and the Components specimen drew it under. Both Spend by month legends moved under the chart. Components c14 states it; components.css says it beside the legend rule.

## Checks
- check.js: a crumb carrying a mark, and a legend with no chart before it in its card, are findings. Both proved on the old markup (the mark put back on Decor, the legend put back above the plot): both caught.
- checks.html: the same, rendered (a crumb's mark; a chart starting below its legend's top).
- styles/check.js: 0 findings across 26 pages. checks.html: clean, 23 rules over 26 pages.
- Looked at: Statistics 4a Spend by month and Spend vs saving, both Showing bars, Dark mode Spend by month.

## Files
- Order statistics.dc.html
- Dark mode and image viewer.dc.html
- Components.dc.html
- styles/components.css
- styles/check.js
- checks.html
