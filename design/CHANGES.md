# No week bands in a chart by day

Answers the brief "no week bands in a chart by day": a chart by day does not band its odd weeks, so the band is taken out of the design. Built on `design/` from main at 2026-11-01T13:05Z, which holds `handoff_statistics_bands`; this package changes only the band and nothing else from that package.

## 1. The odd-week band is removed

**The problem.** `handoff_statistics_bands` drew every day of an odd ISO week in Spend by day on a faint `--surface-2` ground. The app no longer draws it, but the design still did, and `styles/components.css` still carried its rules.

**What changed.** A chart by day draws no week band: every day column stands on the card's own ground, as before `handoff_statistics_bands`. Hover and the pointed day's `--hover` band are unchanged.

**Where.**
- `Order statistics 4g`, Spend by day: no column carries `data-week`, and the note "A month of days bands its odd weeks" is gone.
- `Mobile screens`, Spend by day: no column carries `data-week`.
- `styles/components.css`: the rules `.sp-bars--days .sp-bars__col[data-week="odd"]` and `.sp-bars--plot.sp-bars--days .sp-bars__col[data-week="odd"][data-future]` and their comments are removed. `react/src/styles/components.css` takes the same removal, as a copy of this file.
- `react/src/components/Data.jsx` `Bars`: already sets no `data-week`; nothing to change. `react/src/pages/Statistics.jsx`: unchanged.

**What is still open.** Nothing.

## What stays

Everything else from `handoff_statistics_bands` is on main and unchanged here: Statistics without 30 days, the current month's green column down Budget's whole year, the 128px figure columns, and no "Amounts in kr.". `Budget.dc.html` is not in this package, as it does not change.

## later.md

Read on main before this task. Its one entry, Recently deleted, is an idea for later and not a design fix; nothing settled.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - 4g without the band and its note.
- `Mobile screens.dc.html` - Spend by day without the band.
- `styles/components.css` - the two band rules removed.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the pages load, unchanged.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css` - unchanged.
- `styles/pages/order-statistics.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css` - linked by the two pages, unchanged.

## Check

`styles/check.js`: 0 findings across 28 pages.
