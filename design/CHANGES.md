# Cash flow follow-up: three things the app could not draw as the design said (Brief-cash-flow-follow-up.md)

This package builds on `handoff_cash_flow_fixed`, whose design changes are not on main's `design/` yet, so every file here is main's with both packages applied. This note covers the follow-up brief only; the first package's `CHANGES.md` still describes Cash flow itself.

## 1. The phone period row

**The problem.** On a phone, Statistics draws the period as the dropdown between two arrows (`sp-window sp-window--select`, Mobile screens 7b). The design put the Orders / Cash flow switch in the same row, which leaves the dropdown 141px wide at 393 and no room for "Month · October".

**What changed.** The switch has a row of its own, directly under the period control, full width (`sp-segmented--fill`): Orders and Cash flow share the width equally. The period keeps its arrows and its full width. On Statistics the switch comes before Include N left-out orders. This is what the app already does.

**Where.** `Mobile screens`: the 7b Statistics frames (Statistics, Statistics · one month), and the cash flow frames (Statistics, cash flow; Cash flow, more out than in; Cash flow, one account), now drawn with the arrows. The simpler Statistics frame in 7a takes the same row under its select. `Order statistics 4h`, note Under 640. App: `react/src/pages/Statistics.jsx`.

**What is still open.** Nothing.

## 2. The date line for whole months

**The problem.** `PeriodPicker` works out the date line and its note from the preset and takes no dates, so a running year on Cash flow read "01/01 - 01/11/2026" with two notes: "whole months to date" passed as `extra`, and the picker's own "year to date".

**What changed.** `PeriodPicker` takes two new props. `shown`, `{ from, to }`, is the dates the date line states, in place of the ones the period resolves to. `note` is the word after the date line, in place of the period's own. Each replaces its own and nothing else changes. Cash flow passes the whole months and its note (`stats.cash.wholeMonths` or `stats.cash.wholeMonthsToDate`), so a running year reads "01/01 - 31/08/2026 · whole months to date", one note. `extra` is no longer used for it. An unordered or half `shown` is reported with `console.error`. `note` is no longer in the list of props the picker rejects.

**Where.** `react_handoff/DatePickers.jsx`, `PeriodPicker` (JSDoc updated); `Order statistics 4h`, note The period snaps to whole months. App: `react/src/components/DatePickers.jsx`, `react/src/pages/Statistics.jsx`.

**What is still open.** Nothing.

## 3. Over on a phone

**The problem.** `CashFlow` with `down` added Left as the last share row but never Over, so on a phone a month with more out than in showed no sign of it.

**What changed.** On the first step, when more goes out than comes in, the top bar is the income and Over side by side, Over in the problem colour, and Over is the list's last row, "Over 3.229 kr." in the problem colour with no share, as Left is drawn. A step inside an account or Spending shows neither.

**Where.** `Mobile screens`, the new frame Cash flow, more out than in (December 2025); `Order statistics 4h`, note Under 640; `react_handoff/Data.jsx` `CashFlow` (the downward form). App: `react/src/components/Data.jsx`; `storybook/stories/Data.stories.jsx` `WhereTheMoneyWentDownwards` gains an Over case.

**What is still open.** Nothing.

## 4. A ribbon's readout

**The problem.** The package had words for a ribbon's own readout ("Housing to Mortgage") and for a costs total, but `CashFlow` reads out bars only.

**What changed.** A ribbon has no readout of its own: pointing at one shows the readout of the bar it flows into and lights that bar's path, as `CashFlow` already does. `stats.cash.costs` and `stats.cash.to` are removed from `language/en.json` and `da.json`, as the app left them out.

**Where.** `Order statistics 4h`, note Pointing at a bar or a ribbon; `react_handoff/Data.jsx` (`tip` JSDoc); `language/*.json`.

**What is still open.** Nothing.

## later.md

Read on main before this brief. "Reconcile's matching notes in the design are out of date" is settled in `Order list 2j` (in `handoff_cash_flow` and here); please remove it. "A deleted record should not be removed for good at once" is an idea for later and is not touched.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Mobile screens.dc.html` - the switch's own row under the period on every Statistics and Cash flow frame; the cash flow frames drawn with the arrows; the new Over frame.
- `Order statistics.dc.html` - 4h notes: one date line and note, a ribbon's readout, the phone row and Over.
- `react_handoff/DatePickers.jsx` - main's `react/src/components/DatePickers.jsx` with `shown` and `note` on `PeriodPicker`.
- `react_handoff/Data.jsx` - `CashFlow`'s downward form shows Over.
- `language/en.json`, `language/da.json` - `stats.cash.costs` and `stats.cash.to` removed.
- `Components.dc.html`, `Order list.dc.html`, `index.html`, `styles/components.css`, `styles/tokens.css`, `styles/check.js`, `styles/pages/order-statistics.css` - as in `handoff_cash_flow_fixed`, unchanged here.
- `support.js`, `components.js`, `icons.js`, `view.js`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css`, `styles/pages/order-list.css` - what the pages load to open from the folder.

## styles/check.js

0 findings across 28 pages.
