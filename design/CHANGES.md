# Spendly - changes since handoff_2026_10_06e_changes

Copy these files over handoff_2026_10_06e_changes. Answers brief 35.

## 1. Readout on Home's Last 8 months (Home 10a)
- Keep the readout as built: a bar that a hover or focus reaches takes the soft tile and shows the Statistics readout (4a). Head: month and year, then the total. Note: "18 orders · click to open"; for a month of last year only "click to open". No category rows.
- Home's chart is now the plot's bars: `sp-bars sp-bars--plot sp-bars--card`.
- Change in the app: the chart stays 140 high with an 8 gap, not 180. Bars keep their real heights; drop the rule that draws the tallest bar at half the plot.
- Placement is the Statistics rule unchanged: 8 clear of the tallest of the bar and its two neighbours; where that leaves too little room, `data-pin="top"` sets it inside the plot's top edge; `data-side="start"` / `"end"` at the chart's ends. It never moves a bar.
- The plain bars (`sp-bars` without `--plot`, and the spark) carry no readout.

## 2. CSS (styles/components.css)
- Added `.sp-bars--plot.sp-bars--card { --plot-h: 140px; gap: var(--sp-8); }`. No existing rule changed.

## 3. Check (styles/check.js)
- New assertion: a `.sp-bars__tip` inside plain `.sp-bars` fails.
- Clean: 0 findings across 26 pages.

## Files
- Home.dc.html
- styles/components.css
- styles/check.js
