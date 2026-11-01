# Cash flow on Statistics - the money flow chart (Brief-money-flow-chart.md)

Carsten asked for a chart that shows where the money goes: from the income, out to what it pays for, with what is left at the end, or Over when more goes out than comes in. The nine questions in the brief were answered in Claude Design's chat, with two more settled there: the chart is its own view of Statistics, Cash flow, not a card among the order cards; and the income flows to the budget's accounts (Budget, Savings) and to Spending, the orders, each split one step further (groups and rows, categories and vendors), not straight to the budget's groups.


## Fixed from handoff_cash_flow

**The problem.** Statistics' top bar held the lens ("Expenses only") and Export, beside the search. A top bar holds the search and nothing else.

**What changed.** The lens and Export are removed from Statistics, not moved: the page always counts as Expenses only did (Ordered or Delivered, not left out of statistics), and the 4e screen that drew the lens is gone. Every desktop top bar on every page is now the search alone, and `styles/check.js` asserts it: no button, menu, switch or segmented control in a desktop top bar, measured to the bar's own closing tag. A phone task's bar keeps its Back.

**Where.** `Order statistics 4a`, `4g`, `4b`, `4c`, `4d` top bars; `Order statistics 4e` removed; `index.html` (4e out, 112 screens); `styles/check.js`. App: `react/src/pages/Statistics.jsx` drops the lens and Export and no longer reads `flow=`; the `stats.flow.*` words in `react/src/language/en.json` and `da.json` go with them.

**What is still open.** Back in a phone task's top bar (Mobile screens, Order create, Order editing layouts) and the conversation menu on Ask on a phone are kept. Please confirm they stay.

## 1. Where it lives: a sub page of Statistics

**The problem.** Statistics is built from orders. The chart reads the budget and the orders together, rounds periods to whole months and needs the full width, so as a card it would behave unlike every card beside it.

**What changed.** Cash flow is a sub page of Statistics, `/statistics/cash-flow`. Statistics itself does not change, except for one control: an Orders / Cash flow switch (`Segmented`, words `stats.cash.view`, `stats.cash.view.orders`, `stats.cash.view.cash`) at the right end of the period row, on Statistics and on Cash flow. The period is shared both ways. Cash flow's own page has the period row and the card, and its top bar is the search alone. No sidebar row. On a phone the switch sits beside the period select, in the same row.

`styles/check.js` gains one assertion: a desktop top bar holds the search alone (see the fix above).

**Where.** `Order statistics 4a`, `4g`, `4b`, `4c` period rows; `Order statistics 4h` (new screen, agreed in chat); `Mobile screens` Statistics, and two new frames: Statistics, cash flow and Cash flow, one account. App: `react/src/pages/Statistics.jsx` (the switch), a new page for Cash flow.

**What is still open.** Nothing.

## 2. The chart

**The problem.** Statistics has no chart that draws flows (`Bars`, `Gauge`, `Donut`, `Shares`, `Plot`, `Stat`). And the money does not go from the income straight to the budget's groups: the income lands on an account, the budget's rows are paid from accounts such as Budget and Savings, and what is spent on orders is taken from the income itself.

**What changed.** A new component, `CashFlow`, class `sp-cashflow`: one SVG of 12px bars (radius 2) joined by ribbons, in four columns:
- the income, one bar per account income rows are paid into, usually one, here Income 34.000 kr.;
- where it goes: each cost account in the accounts list's order (Budget, Savings), No account when a cost row has none, then Spending (the orders), then Left;
- each account's groups, and Spending's categories;
- each group's rows, and each category's vendors.

Accounts, groups and rows keep the budget's order; categories and vendors are largest first. A ribbon takes the colour of the bar it flows into. Every bar is labelled with its amount and its share of the income ("Housing 12.346 kr. 36%"), the last column in one line each, with a 3px `--surface` halo so labels read over ribbons.

Spending is every order in the period that counts in Expenses only (Ordered or Delivered, not left out of statistics), each counted once under its first category, as Stacked counts it.

Colours are legend keys, so schemes and dark mode recolour it with no rule of their own: the income key 1 (`--primary`); each account takes one key and its groups and rows share it, keys 2, 3, 4, 6, 7 in the accounts' order (`--primary-3`, `--primary-4`, `--primary-5`, `--amber-2`, `--ink-6`), starting again after the fifth; Spending and everything under it key 5 (`--amber-ink`); Left `--primary-2`; Over `--red-ink`. Legend keys 5, 6, 7, `saved` and `over` are added to `.sp-legend__key`.

Pointing at a bar or ribbon lights its whole path and steps the rest back (`data-focus` on the chart, `data-on` on the lit parts); its readout is `ChartTip`: name and amount, Of income, and where it sits with its count, "Budget · 6 rows", "Spending · 3 vendors" (`stats.cash.ofIncome`, `stats.cash.where`, `stats.cash.rows`, `stats.cash.vendors`). A click or tap keeps it until a click elsewhere or Escape. Nothing on the chart drills or opens another page. Each bar is in the tab order and named by its label.

New fade tokens, by meaning: `--fade-ribbon` (`--fade-20`), `--fade-ribbon-lit` (`--fade-60`), `--fade-off-path` (`--fade-40`).

**Where.** `Order statistics 4h`; `Components c14` (specimen and Fixed note); `styles/components.css` `/* cash flow - c14 */` block (`.sp-cashflow*`, the new `.sp-legend__key` keys, the Left and Over share rows); `styles/tokens.css` the three fades; `react_handoff/Data.jsx` `CashFlow`, and `ShareRow` now takes series 5 to 7, `saved` and `over` (`SHARE_SERIES`). App: `react/src/components/Data.jsx`, `storybook/` (a story in light and dark, phone and desktop).

**What is still open.** Nothing.

## 3. At every width, and on a phone

**The problem.** The example is wide. Below about 1100 the third column's labels, drawn left of their bars, run into the second column's.

**What changed.** The chart picks its form by its own width, not the device's:
- 1100 and wider: four columns, as drawn in 4h.
- 640 to 1099: three columns, the income, where it goes, and the groups and categories, each labelled on the right. A group's or category's readout lists its three largest rows or vendors, then "N more" and "click to open" (`stats.cash.more`, `stats.cash.clickToOpen`). A click opens it as a step, drawn across as itself and its rows or vendors, with a crumb back to the whole flow.
- Under 640, and on touch: downwards (`sp-cashflow--down`), one step at a time, the income at the top, the accounts, Spending and Left below, and the share list (`ShareRow`) under it as the labels. Tapping an account or Spending shows its groups or categories, with it as a crumb (c8); tapping a group or category shows its rows or vendors; removing a crumb goes back.

The columns of one chart share one scale, so many rows make it taller, never smaller.

**Where.** `Order statistics 4h`: the full screen at 1400, the 900 wide card at rest with Housing's readout, and Housing opened; `Mobile screens` Statistics, cash flow and Cash flow, one account; `Components c14` touch specimen; `react_handoff/Data.jsx` `CashFlow` (`FOUR_COLUMNS`, the `three` layout, `tip(bar, { opens })`).

## 4. Periods

**What changed.** The period snaps to every month it touches, in full, and Spending counts the orders of the same days. The resolved line states those months' dates and the note reads "whole month" / "whole months" (`stats.cash.wholeMonths`). Week W34 is August; a week across two months is both; 30 days from 22/07 to 20/08 is 01/07 - 31/08/2026; custom 08/03 - 19/04 is 01/03 - 30/04/2026.

**Where.** `Order statistics 4h` period row and note.

## 5. Real or expected

**What changed.** No choice between them, and no switch. A budget row has one amount per month: the real amount once it is entered, the expected amount until then, as Budget shows it, so the chart reads that. Months still to come are not counted, since no orders are in them yet: a Quarter or Year in progress runs to the end of the current month, and the period note reads "whole months to date" (`stats.cash.wholeMonthsToDate`).

**Where.** `Order statistics 4h`, note One amount per row and month.

## 6. Left and Over

**What changed.** Income more than the accounts and Spending together: the rest is Left, the last bar of the second column, labelled with the amount alone in the positive colour (`Left 1.830 kr.`, `stats.cash.left`), never a share. Less: Over comes in under the income in the problem colour (`Over 3.229 kr.`), and the ribbons from the income column are shared between the two in proportion. Equal: neither.

**Where.** `Order statistics 4h` and its December 2025 state.

## 7. Small flows

**What changed.** A group shows up to six rows and a category up to six vendors. With seven or more, the five largest keep their place and the rest join as one Other at the end (`stats.cash.other`), its readout listing them. Spending shows up to six categories the same way, the rest as Other categories (`stats.cash.otherCategories`). Accounts and groups are never joined. Anything with nothing in the period is not drawn.

**Where.** `Order statistics 4h` (Housing's Other), note Other.

## 8. No budget, or no income

**What changed.** No budget sheet: the empty state, "No budget yet" with Open Budget (`stats.cash.noBudget`, `stats.cash.noBudgetBody`, `stats.cash.openBudget`), since the chart starts from the budget's income. A budget with no income starts at the accounts and Spending, with no Left or Over, with a line above it and a link (`stats.cash.noIncome`, `stats.cash.addIncome`).

**Where.** `Order statistics 4h` states.

## 9. Statistics' lens

**What changed.** The lens is hidden on Cash flow (point 1); Spending always counts as Expenses only does. `stats.flow.*` is the lens's and is not reused; the new words are `stats.cash.*`.

## 10. The data

**What changed.** One new route answers the whole chart: `GET /api/cashflow?from=2026-08&to=2026-08&amounts=real`, with the income accounts and their sums, each cost account with its groups and rows in the reader's order, each row's expected and real sums, and Spending with its categories and vendors. A period across a new year reads two sheets. `react/src/pages/Budget.jsx` and Home do not change.

**Where.** `Order statistics 4h`, note Drawn from the budget and the orders. App: `api/`.

## later.md: Reconcile's matching notes in the design are out of date

**The problem.** `Order list 2j` said a payment matches an order dated "before or after" the bank date, and that both sliders start at 3.

**What changed.** The Matching note: an order dated on the bank date or up to Days apart before it, never after. The slider note: Days apart starts at 5, Amount difference at 3. The Days apart slider is drawn at 5, "Up to 5 days".

**Where.** `Order list 2j`. This settles the later.md entry "Reconcile's matching notes in the design are out of date"; please remove it.

## The tweak bar on Components and Order list

**The problem.** On main, `Components` and `Order list` carry a Language tweak the other 26 pages do not, so `styles/check.js` failed "one tweak bar on every page" on main.

**What changed.** The Language prop is removed from those two pages' tweak bars, so all 28 match.

**Where.** `Components.dc.html`, `Order list.dc.html` (`data-props`).

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - main's, the lens, Export and 4e removed, with the switch at the end of the period row on 4a, 4g, 4b, 4c, and 4h Cash flow at 1400 and at 900 (at rest and with a group opened), its states and notes.
- `Mobile screens.dc.html` - main's, with the switch beside the period select on Statistics, and two Cash flow frames (the income, one account).
- `Components.dc.html` - c14 cash flow specimen and note; tweak bar.
- `Order list.dc.html` - 2j notes and Days apart slider; tweak bar.
- `index.html` - 4h listed, 4e removed, 112 screens.
- `styles/components.css` - the cash flow block, new legend keys.
- `styles/tokens.css` - three fade tokens.
- `styles/pages/order-statistics.css` - `.os-cash-state`, `.os-cash-mid`, `.os-cash-tip`, `.os-cash-tip-mid` (layout only).
- `styles/check.js` - main's, with one assertion added: a desktop top bar holds the search alone.
- `react_handoff/Data.jsx` - `CashFlow`, `ShareRow` series.
- `language/en.json`, `language/da.json` - `stats.cash.*`.
- `support.js`, `components.js`, `icons.js`, `view.js`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css`, `styles/pages/order-list.css` - what the pages load to open from the folder.

## styles/check.js

0 findings across 28 pages.
