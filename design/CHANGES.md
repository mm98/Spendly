# Cash flow: whole months, amounts hidden

Answers the request that Cash flow use no period shorter than a month, since income is paid per month, and open with its amounts hidden, as Budget hides income. Built on `design/` from main at 2026-11-01T09:58Z.

## 1. Month is the shortest period

**The problem.** Cash flow offered 30 days, Week and Custom. The budget is kept per month and income is paid per month, so a week or a custom range could not be shown as it reads: it was widened to whole months behind the reader's back.

**What changed.** Cash flow's period row offers Month, Quarter and Year only. Opening Cash flow while Orders is on 30 days, Week or Custom shows the month holding that period's last day: Week W34 opens August, 30 days to 20/08 opens August, a custom 08/03 - 19/04 opens April. Orders keeps its own period, so switching back returns to the Week, 30 days or custom range it was on. The arrows step by the month, quarter or year shown. On a phone the period select lists Month, Quarter and Year.

**Where.** `Order statistics 4h` (the period row, note Month is the shortest period on Cash flow); `Mobile screens` note On Cash flow the select lists Month, Quarter and Year. App: `react/src/pages/` Cash flow page, passing `presets` to `PeriodPicker` without `custom`.

**What is still open.** Nothing.

## 2. No date line and no note on Cash flow

**The problem.** With only whole months to choose, the date line ("01/08 - 31/08/2026") and the note ("whole month") repeated what the window already says (August).

**What changed.** Cash flow's period row draws neither. `PeriodPicker` takes `dated`, true by default; `dated={false}` leaves out the date line and the note. The Back to the present button still takes the note's place when the reader has stepped away. The `shown` and `note` props added in `handoff_cash_flow_follow_up` are removed, since Cash flow was their only user, and so are the phrases `stats.cash.wholeMonths` and `stats.cash.wholeMonthsToDate`. Orders is unchanged.

**Where.** `Order statistics 4h`, notes The period is whole months and One amount per row and month; `react_handoff/DatePickers.jsx` `PeriodPicker` (JSDoc updated); `language/en.json`, `language/da.json`. App: `react/src/components/DatePickers.jsx`, the Cash flow page, `react/src/language/*.json`.

**What is still open.** Nothing.

## 3. Amounts hidden by default

**The problem.** Cash flow showed every amount, the income included, as soon as it opened, while Budget hides income until asked.

**What changed.** Cash flow opens with its amounts hidden, every time. The bars and ribbons keep their real sizes, and each bar shows its name and its share of the income; Left and Over show their name only. The amounts are not in the page while hidden: not in the labels, the readout or the bars' titles. The readout keeps its name, Of income and its line ("Budget · 6 rows"). A Show amounts button, the same toggle as Show income on Budget (`aria-pressed`, the eye icon), sits before the Orders / Cash flow switch; pressed, it reads Hide amounts and every amount appears in place. It holds until Statistics is left, and switching to Orders and back keeps it. On a phone the button sits beside the Orders / Cash flow switch; the top line keeps its name and the share list its names and shares.

**Where.** `Order statistics 4h` (the first screen drawn hidden, the specimens below drawn shown; note Amounts are hidden every time Cash flow opens); `Mobile screens` cash flow frames (the first hidden, the Over and One account frames with the button pressed; note Cash flow opens with its amounts hidden). App: the Cash flow page and `CashFlow` in `react/src/components/Data.jsx`, which needs a way to draw its labels and readout without amounts; phrases for Show amounts and Hide amounts.

**What is still open.** Nothing.

## later.md

Read on main before this task. Its one entry, Recently deleted, is an idea for later and not a design fix; nothing settled.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - 4h period row, amounts hidden, notes.
- `Mobile screens.dc.html` - cash flow frames and notes.
- `react_handoff/DatePickers.jsx` - `PeriodPicker` `dated`, `shown` and `note` removed.
- `language/en.json`, `language/da.json` - from `react/src/language/` on main, the two whole-months phrases removed.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the pages load.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css` - unchanged from main.
- `styles/pages/order-statistics.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - the page stylesheets the two pages link, unchanged.

## Check

`styles/check.js`: 0 findings across 28 pages.
