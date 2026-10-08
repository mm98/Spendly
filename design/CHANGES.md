# Spendly - evenly spaced chart labels, axis values on their lines

Copy these files over handoff_2026_10_08r_changes.

**Changed: a chart's labels are evenly spaced** (Components c14). The first and last bar are always labelled, and the labels between are the same number of bars apart. The step is the smallest that divides the span and keeps at least 48px clear between labels (3 x `--sp-16`), so it follows the chart's width, not the device:
- Phone, 31 days, bars 10.3px apart: every 6 days, 1, 7, 13, 19, 25, 31 (Mobile 7b, Statistics · one month).
- Desktop, 31 days, bars 30.3px apart: every 2 days, 1, 3, 5 ... 31 (Statistics 4g).
- A shorter month keeps the step and ends on its last day (1, 7, 13, 19, 25, 30); where the last gap would be under half a step, the label before the last is left empty.
This replaces 1, 8, 15, 22, 31, which had three gaps of 7 days and one of 9.

**Fixed: a value on the plot's axis sat off its grid line.** The values were spread over the axis box and the lines over the same box less a label's height, so 80k sat 7.3px below its line and 0 sat 8.3px above the baseline. Each value is now a 1px box laid out as its line is, with the text centred on it. Statistics 4a and 4g; Dark mode's Spend by month uses the same plot.

## Checks
- checks.html: labels not evenly spaced, or a last gap longer than the step or under half of it, is a finding. An axis value more than 1px off its grid line is a finding, and so is a plot with a different number of values and lines.
- check.js: 0 findings across 26 pages.

## Files
- styles/components.css
- checks.html
- Components.dc.html
- Order statistics.dc.html
- Mobile screens.dc.html
