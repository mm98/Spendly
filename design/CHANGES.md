# Statistics periods, week bands and the current month on Budget

Answers the requests made after `handoff_cash_flow_month`: no 30 days on Statistics, odd weeks banded in a chart by day, the current month marked down Budget's whole year, and no "Amounts in kr." on Budget. Built on `design/` from main at 2026-11-01T12:43Z, which already holds `handoff_cash_flow_month`.

## 1. No 30 days on Statistics

**The problem.** Statistics offered 30 days beside Week and Month. Income is paid per month, so a rolling 30 days matched no budget month and read as noise.

**What changed.** The Orders view offers Week, Month, Quarter, Year and Custom. Cash flow is unchanged: Month, Quarter and Year. Opening Cash flow while Orders is on Week or Custom shows the month holding that period's last day (Week W34 opens August, a custom 08/03 - 19/04 opens April), and switching back returns Orders to the period it was on. A chart's step: a day for Week and Month, a week for Quarter, a month for Year. On a phone the period select lists Week, Month, Quarter, Year, Custom.

**Where.** `Order statistics` 4a, 4b, 4c, 4f, 4g (the period rows), notes Each bar under a figure is one step of the period and Month is the shortest period on Cash flow; `Mobile screens` notes On a phone the Statistics period is one select and On Cash flow the select lists Month, Quarter and Year. App: the Statistics page passes `presets` to `PeriodPicker` (`react/src/components/DatePickers.jsx`) without `days30`; the component and its `STANDARD_PERIODS` are unchanged, since other pages still offer 30 days. A saved or linked Statistics period of 30 days opens as Month.

**What is still open.** Nothing.

## 2. Odd weeks banded in a chart by day

**The problem.** A month drawn as 31 day bars gave no sense of the weeks in it.

**What changed.** In a chart by day, every day of an odd ISO week stands on the faint `--surface-2` ground, tick included, and the band carries across the gaps between its days. August 2026 bands 1 - 2, 10 - 16 and 24 - 30. ISO week numbers keep the banding the same from month to month. Days still to come keep their band; the pointed day's `--hover` band covers it.

**Where.** `Order statistics 4g` (Spend by day, new note A month of days bands its odd weeks) and `Mobile screens` (Spend by day). `styles/components.css`: `.sp-bars--days .sp-bars__col[data-week="odd"]` and `.sp-bars--plot.sp-bars--days .sp-bars__col[data-week="odd"][data-future]`, beside the bar chart's rules. App: the bar chart in `react/src/components/Data.jsx` sets `data-week="odd"` on a day's column when its ISO week number is odd.

**What is still open.** Nothing.

## 3. The current month down Budget's whole year

**The problem.** In the whole year the month it is now was marked only by the accent ink in its header, easy to lose once the sheet scrolled.

**What changed.** The current month's column stands on the scheme's faint green, `--primary-tint-2`, from the header to the last total, over its whole width; its header cell takes `--primary-tint`, one step deeper, as the header row is already grey. Both follow the colour scheme. Section and group rows are split around the column so the band never breaks. Every figure column (the months, Year and Per month) is 128px and inset 8px on the left and 12px on the right, so no figure touches the band and a field's hover and focus box stands 8px inside its column on both sides. The sheet's minimum width is 2092px (180 + 120 + 14 x 128); it scrolls sideways where it does not fit.

**Where.** `Budget 21b`, note Where the year does not fit. `styles/components.css`: `.sp-table--borderless :is(th, td).sp-col-number` and `.sp-table--borderless :is(th, td)[data-current="true"]`, a state of the borderless table, used only by Budget. `styles/pages/budget.css`: `.bg-sheet` min-width and `.bg-sheet thead th.sp-col-number` width. App: the Budget whole-year sheet sets `data-current` on every cell of the current month and splits its section and group rows into the months before, the current month and the rest.

**What is still open.** Nothing.

## 4. No "Amounts in kr." on Budget

**The problem.** The whole year, To place and Save to the budget each said "Amounts in kr.", which every reader already knows.

**What changed.** The three notes are gone; the whole year's note reads "Grey amounts are expected". The sheet's accessible name still says the amounts are in kr.

**Where.** `Budget 21b` and the To place and Save to the budget cards on `Budget`. App: `react/src/pages/` Budget and its bank check, and the phrase in `react/src/language/*.json` if no other place uses it.

**What is still open.** Nothing.

## later.md

Read on main before this task. Its one entry, Recently deleted, is an idea for later and not a design fix; nothing settled.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - period rows, step note, week bands.
- `Mobile screens.dc.html` - period notes, week bands.
- `Budget.dc.html` - current month column, notes, "Amounts in kr." removed.
- `styles/components.css` - week band, figure column inset, current month state.
- `styles/pages/budget.css` - figure column width and sheet width.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the pages load, unchanged.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css` - unchanged.
- `styles/pages/order-statistics.css`, `styles/pages/mobile-screens.css` - linked by the pages, unchanged.

## Check

`styles/check.js`: 0 findings across 28 pages.
