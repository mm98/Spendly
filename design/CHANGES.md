# A category limit for a month or a year

The brief: limits on categories are fixed to the calendar month. A category should be able to have its limit for a longer period, as one amount for the whole of it. Settled in chat: the periods are Month and Year, Month is the default, a period is the calendar month or calendar year, and a yearly limit is one amount for the whole year, never split into twelve.

Every page here is main's `design/` copy as of 2026-10-30T12:52Z, with only this package's changes applied.

## 1. The limit field takes a period

- **The problem:** the limit is one amount and always a month. The field is a bare amount ("Monthly limit", unit "kr. / month"), so nothing can hold a yearly limit.
- **What changed:** the field is labelled "Limit" and is the amount (unit "kr.") with a segmented control to its right, at the field's height: Month | Year, Month checked by default. The help line follows the period: "One amount for each calendar month." or "One amount for the calendar year, January to December." The card head reads LIMIT, and the rail sum reads "Limit". A yearly limit is one amount for 1 January to 31 December in the user's timezone, spent as unevenly as the user likes. The limit sanity-check warning keeps its amber state and reads "Decor averaged 19.480 kr. a month over the last 12 months."
- **Where:** Vendors and categories 5e (create), 5f (edit), 5i (the rules). Components c3 (the warning at a field). States and confirmations (Limit sanity check). Responsive reference (the category form). The field is `.sp-field` with `.sp-row-flex.sp-gap-8`, holding `.sp-field__wrap.sp-grow` (input `.sp-input--unit.sp-number`, `.sp-field__unit`) and `.sp-segmented` (`role="radiogroup"`, `aria-label="Limit period"`). There are no CSS changes. App: the category form in `react/src/pages/`, `api/src/routes/categories.js`, and `api/src/lib/categoryList.js`, which needs a stored period beside the amount: `month` or `year`, default `month`.
- **What is still open:** nothing.

## 2. Switching the period of a saved limit warns and converts

- **The problem:** without a rule, switching Month to Year would leave 22.000 kr. as a yearly limit, a twelfth of what was meant.
- **What changed:** on a category with a saved limit, Month to Year multiplies the amount by 12, and Year to Month divides it by 12, rounded to whole kroner. The field takes the new amount. Under the field the card shows the `sp-alert`, the same alert as the vendor's usual categories in 5l: "The limit changes to 264.000 kr. a year" / "It is 22.000 kr. a month now. The change is saved with the category." The other way round: "The limit changes to 5.000 kr. a month" / "It is 60.000 kr. a year now. ...". If the user types over the amount, the alert stays and its title follows the typed amount. Switching back to the saved period and amount removes the alert. Nothing is stored until Save, and Save is never blocked. On a new category (5e), or one with no saved limit, the switch changes only the period: the amount stays as typed and no alert shows.
- **Where:** Vendors and categories 5i, the two specimens "5F - DECOR SWITCHED FROM MONTH TO YEAR, BEFORE SAVE" and "5F - TEXTILES SWITCHED FROM YEAR TO MONTH, BEFORE SAVE", and the notes beside them.
- **What is still open:** nothing.

## 3. The categories list measures each row on its own period

- **The problem:** the list's columns are THIS MONTH and MONTHLY LIMIT, and the pace marker is `day / daysInMonth`.
- **What changed:** the columns are THIS PERIOD and LIMIT. A row is measured on its current calendar month or current calendar year, and the limit cell names the period under the amount: "22.000 kr." / "a month", "60.000 kr." / "a year". Textiles is drawn as yearly: 41.900 kr. spent against 60.000 kr., "41.900 kr. · 18.100 left", pace marker at 80% (day 293 of 365). The pace marker is `day / daysInPeriod`. Sort, the over and near tests, the amber and the URL flags (`over-limit`, `near-limit`) all use each row's own period. A category with no limit is measured on the current month. When the limit column is dropped at narrow widths, the name's second line reads "limit 22.000 kr. a month". With `month=2026-08` the column reads AUGUST. A monthly limit is measured on that month alone, with no marker. A yearly limit is measured on January to the end of that month, with the marker at 8 of 12 months, and its cell reads "38.200 kr. Jan - Aug · 21.800 left". The empty states lose "this month": "No category is over its limit", "No category is near its limit".
- **Where:** Vendors and categories 5d (list, URL filters, both specimens), 5h (narrow columns), Responsive reference (column heads). App: the categories list page and `api/src/lib/categoryList.js` (the month spend behind the flags), `api/src/routes/categories.js` (`over=yes`).
- **What is still open:** nothing. You skipped the question about a past month with a yearly category, so Claude Design chose "the year up to the end of that month", as above.

## 4. Home, Needs a look and alerts

- **The problem:** Home, Needs a look and the alerts all say "this month".
- **What changed:**
  - Needs a look reads "N over their limit", each category in its own current month or year.
  - On Home's Categories this month, a category with a yearly limit is still ranked by this month's spend, but its line and bar show its year: "41.900 / 60.000 this year".
  - The save warning names the limit's period: "64.300 of 60.000 kr. for 2026".
  - The monthly summary lists a yearly limit once, in the month it was passed: "Textiles went 4.300 kr. over its limit for 2026". "Finished close" and "room to spare" are said of a yearly limit only in December's summary.
  - The Settings switch reads "A category that has gone past its limit for this month or this year."
- **Where:** Home 10a (notes). Duplicate and alerts (Budget alerts notes). Mobile screens 7a (notes). Settings and import 11a (Needs a look pane). Components (the Needs a look rows, "over their limit"). App: `api/src/routes/orders.js` (the limits an order counts against), `api/src/lib/stats.js` (the categories whose limit was passed).
- **What is still open:** nothing.

## 5. Statistics and the weekly email

- **The problem:** Statistics multiplies a monthly limit by the months in the period, and the limit line assumes every limit is monthly. The weekly email states limits "since limits are monthly".
- **What changed:**
  - In Statistics, a monthly limit counts once for every month in the period. A yearly limit counts by the share of its year the period covers: once for Year, a quarter of it for Quarter, a twelfth for Month. A custom period counts by days.
  - The Limits card's line reads "For 2026 a monthly limit counts 12 times, a yearly one once."
  - The dashed limit line in Spend by month is drawn only when the chart's step is the limit's period. A yearly limit, or a monthly one on a chart by day or by week, draws no line and has no legend key.
  - The weekly email states each limit for its own period so far: "64.300,00 kr. of 60.000,00 kr. in 2026 so far".
  - The sign-in and first-run copy says "limits" rather than "monthly limits".
- **Where:** Order statistics 4a, 4g (notes, Limits card). Auth and first run 20a, 20f (email notes), the first-run limit note and Home's empty state. App: `api/src/lib/stats.js`, `api/src/lib/aggregate.js`, `api/src/lib/mcpTools.js` (the tool descriptions say "monthly limit"), and the status email templates in `api/src/emails/`.
- **What is still open:** nothing.

## later.md

Read on main before the task. Its only entry, "A deleted record should not be removed for good at once", is marked as an idea for later and is not part of this package.

## Files

- `README.md` - the design overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Vendors and categories.dc.html` - 5d, 5e, 5f, 5h, 5i.
- `Components.dc.html` - c3 limit field, Needs a look rows.
- `States and confirmations.dc.html` - limit sanity check, empty categories copy.
- `Responsive reference.dc.html` - category column heads and form.
- `Home.dc.html` - yearly limit in Categories this month.
- `Duplicate and alerts.dc.html` - Budget alerts with a yearly limit.
- `Order statistics.dc.html` - Limits card, limit line.
- `Settings and import.dc.html` - Needs a look switch copy.
- `Mobile screens.dc.html` - Home and Needs a look notes.
- `Auth and first run.dc.html` - sign-in and first-run copy, weekly email note.
- `support.js`, `view.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css` - main's, unchanged.
- `styles/pages/states.css`, `responsive-reference.css`, `auth-and-first-run.css`, `settings.css`, `budget.css`, `mobile-screens.css`, `home.css`, `order-statistics.css`, `duplicate-and-alerts.css` - linked by the pages above, unchanged.

## styles/check.js

0 finding(s) across 28 pages.
