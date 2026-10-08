# Spendly - loading bars stand on the baseline

Copy these files over handoff_2026_10_08n_changes.

**Fixed: a chart's loading bars hung from the top.** `.sp-skeleton--bar` set `align-self: stretch`, which overrode the chart's `align-items: flex-end`, so every loading bar with a height sat on the chart's top edge instead of its baseline. It is now `align-self: flex-end`, the same as the bars it stands in for. One rule, so it is fixed everywhere it appears: all 9 loading bars, all on States and confirmations (the loading card in 6b and the two-card loading state). No loading bar has no height, so none relied on the stretch.

## Checks
- checks.html: a new rule, a chart bar stands on the baseline. Every child of `.sp-bars` shorter than the chart must end on the chart's baseline.
- Proved on the old rule: with `align-self: stretch` put back on States and confirmations, the check reports all 9 bars (84.0px, 61.6px, 75.6px above the baseline, and so on). With the fix, 0.
- checks.html: clean, 25 rules over 26 pages. check.js: 0 findings across 26 pages.

## Files
- styles/components.css
- checks.html
