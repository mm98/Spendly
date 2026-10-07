# Brief 30 - pay day and twelve insights

This file is three things in one. Part A is the thirteen items: for each one, the brief for Claude Design (what the person sees, where it lives, the states, the questions only the design can answer) together with the data part (what it reads, how the figure is worked out, how much history it needs, and what it must never claim). Part B is the questions for Claude Design in one batch, and the order to build in. Part C is the rest of the idea list, kept short, so nothing from the sweep is lost.

How it was made: about 240 ideas were collected from fourteen angles, each was checked against the real data model and the design, duplicates were merged, and the owner picked the pay day setting and twelve insights. Every section below was then checked again against the design pages it names and the code it leans on.

How to use it: give Part A and Part B to Claude Design as Brief 30. The answers come back as `design/Brief 30 answers.md` and are built from `design/`, as every brief before. The data parts need no design answer; they are there so the design knows what the figures can honestly say.

## What is true about the data

Every item below leans on these facts. A sentence in the app that forgets one of them is a lie.

- One account is one person. Nothing is ever compared with other people.
- An order has a day, never a time of day. The day is often the day it was typed in, not the day the money left the account.
- The app knows only what was typed in or scanned. A quiet week may be a week with no receipts typed in. So every figure that could mislead says "in your orders" or "orders you wrote in", never "you spent".
- Home's "Spent this month" and the monthly summary count orders of every kind (Expense, Gift, Sold, Work, Other) with any status except Returned, Cancelled and Draft. Statistics at rest counts every kind and every status except Cancelled and Draft. A new figure on Home must count as Home does, or the two numbers disagree on the same card.
- An order with several categories is split evenly across them. A category figure is a share, so the orders behind it add up to more than the figure.
- A saving is the list price minus the price paid, on lines where a list price was typed, plus the order's discount. Lines without a list price count as no saving. A saving is always shown as an amount in kr., never as a percentage. A percentage is fine for a limit.
- A category limit is one amount per month, with no history of earlier limits. A look at past months uses today's limit.
- Pay day is not stored anywhere today. Salary is one amount per month on the budget sheet, with no date. Part A, item 1 adds the setting.
- Line titles are free text ("Mælk, 1 l"). The pack size, when there is one, sits inside the title. Nothing stores a brand, a barcode or a unit.
- The receipt reader is optional. Without a reader key, a scan gives an honest blank draft. Everything that talks to a language model follows the same rule: absent without the key, never a half-working control.
- Accounts differ in size. One has thousands of orders, many have a few months. Every item says what it shows with little history, and a number with nothing behind it is not shown.
- A link opens exactly what it counts. A row that shows a number opens a list with that many items.

## Part A - the thirteen items

Each item below has the same parts. "What the person sees" is the copy on screen, with example figures. "Where it lives" names the design page and section it belongs to, and what is reused. "States" covers little history, nothing to show, loading, failed and switched off. "What it reads" and "How the figure is made" are the data part. "What it must never claim" is the honesty rule for that item. "Decisions" are choices the build makes from an existing pattern unless the owner or the design overrules them in one line. "Questions for Claude Design" holds only the real design questions; they are collected again in one batch at the end of this part.

The twelve picks, in the owner's order: 1 where this month will end, 2 a limit suggested from your own months, 3 the day a limit is likely reached, 4 things that cost more than before, 5 where you paid least, 6 payments that repeat every month, 7 maybe this order was saved twice, 8 last time I bought this, 9 ask a question in your own words, 10 write one sentence and get a draft order, 11 your year in a few cards, 12 same month last year on Home. Picks 4, 5 and 8 all need a place for a product, so they are one item here.


### 1. Pay day setting and its first two readers

Covers: the pay day setting, and the two lines on Home that read it. Size: medium.

In Settings the person says when their pay arrives each month, and a preview shows the next pay day. Home's month card then says how many days are left to pay day and how much a day is left under the month's limits until then.

#### What the person sees

- Settings, Money, dates and times, under the PREVIEW row: a group named "Pay day" with three choices "Not set" / "Day of the month" / "Last work day", and under it "The day your pay arrives each month. Home counts the days to it."
- Only with "Day of the month" chosen, a number field named "Day of the month" holding "31", and under it "A day the month does not have, such as 31, means the last day of that month."
- Only with "Day of the month" chosen, a group named "If it falls on a weekend" with three choices "Friday before" / "Monday after" / "That day", and under it "Only Saturdays and Sundays move the day. Public holidays do not."
- A preview row shaped like PREVIEW above it, two cells: "NEXT PAY DAY"   "Mandag 31.08.2026"   "in 10 days" (the weekday and date are written in the chosen Date and time format; Danish gives "Mandag 31.08.2026", British English "Monday, 31/08/2026"). Absent while "Not set" is chosen.
- Home, month card head (desktop, 21 August 2026): "August 2026 · day 21 of 31" on the left; on the right "Pay day in 10 days" then "last added 2 days ago". The other two forms are "Pay day is tomorrow" and "Pay day is today".
- Home, the limits line under the gauge: "90% of 68.000 kr. in limits · 652 kr. a day until pay day" on the left, "ahead of pace" on the right as today.
- The same line with no pay day set (or when the next pay day is today or in a later month): "90% of 68.000 kr. in limits · 593 kr. a day until the month ends".
- The same line when the month is over its limits: "104% of 68.000 kr. in limits" with no per-day figure.
- Phone, the line under the greeting (20 August): "August, day 20 of 31 · pay day in 11 days".
- Phone, THIS MONTH card, one small line under the gauge: "593 kr. a day until pay day" (or "... until the month ends").

#### Where it lives

Settings 11a, inside the existing "Money, dates and times" card (react/src/pages/Settings.jsx MoneyCard, route /settings/money): after the PREVIEW ListItem comes an sp-rule and then the three fields and the NEXT PAY DAY ListItem, the same "fields, rule, more" shape DefaultsCard already has (Pair, sp-rule, then more). The rule and the weekend rule are the existing Segmented inside a Field, as Theme and Row density are drawn in 11a and built in AppearanceCard (Segmented.fieldRole is 'group', so the Field writes the label as a legend); the day is the existing NumberField (c3) with no unit; the preview reuses the PREVIEW row's markup (sp-list-item: sp-section-label, a value, sp-rule--vertical, sp-data). SECTIONS 'money' gains the keys payRule, payDay, payWeekend, so the sticky bar reads "Unsaved changes in Money, dates and times" and the card saves through the same PATCH as currency; nothing applies before Save. Not the brief's own pane: 11a says "Eleven panes" and draws one card per pane, so a twelfth pane or a second card under one nav entry would be a design change, and this is literally money and dates. Home 10a (react/src/pages/Home.jsx MonthCard and Limits): the pay day sentence is one more sp-meta span in the head row (sp-row-flex sp-gap-12), before "last added 2 days ago", and the per-day figure is appended with the dot to the existing left sp-meta of the limits line. The brief's "8.600 kr. left under your limits" would replace the drawn "90% of 68.000 kr. in limits"; design/ wins, the drawn text stays and the per-day figure is added after it (see the one question). Mobile 7a (PhoneHome and PhoneMonth): the pay day sentence joins the sp-data date line under the greeting, and the per-day figure is an sp-meta line under the gauge in the THIS MONTH card, a slot that card already draws in its "No monthly limits yet" and "Your limits did not load" states. New: three settings columns, one migration, one helper file react/src/app/payDay.js (beside folded.js and recent.js); no new component, screen, route or endpoint.

#### States

- **not enough history.** Absent as a state: nothing waits on history. The lines read today's date, the saved setting and this month's spend, and show from the first day the setting is saved.
- **nothing to show (Not set).** No pay day sentence in the head or on the phone's date line. The limits line still gets the figure to the month's end: "90% of 68.000 kr. in limits · 593 kr. a day until the month ends". The NEXT PAY DAY preview row is absent in Settings.
- **nothing to show (no limits).** The card's existing "No monthly limits yet. Set one on a category to follow the month here." stands alone; no per-day figure, because there is nothing to divide. The pay day sentence in the head still shows.
- **nothing to show (over the limits).** "104% of 68.000 kr. in limits" with no per-day figure: nothing is left to divide. "ahead of pace" stays on the right as today.
- **pay day is today.** Head: "Pay day is today". The per-day figure counts to the month's end: "593 kr. a day until the month ends".
- **loading.** The head and the limits line draw as today: the card's skeleton lines (130 x 11) until the month read lands, then the month text and the "90% of 68.000 kr. in limits" line. The two new texts are absent until the settings read has landed (the `known` rule Home already applies to the summary and Needs a look), the way "last added" is absent until the orders read lands; so the month-end wording never shows before a saved pay day arrives, and no skeleton is added.
- **failed.** Settings did not load: the pay day sentence and the per-day figure are absent, because the page does not know whether a pay day is set; the rest of the card is as today. The month read failed: the card's existing Failed state, nothing new. Save failed in Settings: the existing toast "Your changes were not saved. Try again."
- **switched off.** Same as Not set. There is no separate switch: "Not set" is the off position.
- **phone.** Date line: "August, day 20 of 31 · pay day in 11 days". THIS MONTH card: "593 kr. a day until pay day" under the gauge. In Settings the fields stack one under the other and the phone save bar reads "Unsaved changes".

#### On a phone

Below 640px the pay day sentence rides on the sp-data line under the greeting ("September, day 30 of 30 · pay day in 11 days", 44 characters at the longest month name, expected to fit 375px at --t-13) and the per-day figure is one sp-meta line under the gauge in the THIS MONTH card; both are plain text. The Settings fields stack (Pair returns its children unwrapped on touch), the Segmented groups keep their desktop shape at touch height, the number field takes the decimal keyboard (NumberField sets inputMode decimal), and the save bar is the phone SaveBar with "Unsaved changes". Checked against the 7a frame's markup in design/Mobile screens.dc.html and PhoneHome in Home.jsx; not rendered yet, so the 44-character fit is a claim to measure in the verification pass.

#### Where a tap goes

- /settings/money - the Money, dates and times pane, the only place the pay day is set and changed (route settings/:section? in react/src/routes.jsx, SECTIONS key 'money')
- No new route. On Home the pay day sentence and the per-day figure are text, not links: they are figures of the kind "day 21 of 31" and "90% of 68.000 kr." already are, not counts of records, so there is no list for them to open (10a: a link opens what it counts).

#### What it reads

- settings (read: default_kind, default_status, page_size, sort, list_sort, currency, locale, density, notify_while_saving, notify_monthly_summary, notify_email, notify_early, scan_overrides, sidebar via selectSettings in api/src/routes/settings.js; user_id is the PRIMARY KEY, 001_init.sql)
- NEW settings.pay_rule TEXT NOT NULL DEFAULT 'none' CHECK (pay_rule IN ('none', 'day', 'last-workday'))
- NEW settings.pay_day INTEGER NULL CHECK (pay_day IS NULL OR pay_day BETWEEN 1 AND 31); NULL unless pay_rule is 'day'
- NEW settings.pay_weekend TEXT NOT NULL DEFAULT 'before' CHECK (pay_weekend IN ('before', 'after', 'same'))
- NEW migration api/src/migrations/228_pay_day.sql: three ALTER TABLE settings ADD COLUMN lines under one short comment naming the setting and its pane, as 210_sidebar_fold.sql does in one line; 227_needs_a_look.sql is the newest file today (there is no 226), and no existing migration is touched. Existing rows read 'none'. api/src/seed.js names its columns in seedAccountDefaults, so new accounts take the column defaults with no change.
- API shape: GET and PATCH /api/settings carry payRule, payDay, payWeekend beside the existing camelCase keys (selectSettings, upsertSettings and toApi each gain the three); PATCH validates with the route's own oneOf and keeps what is stored for anything unrecognised.
- orders (read, unchanged): the month window's spent from GET /api/stats under Home's MONTH = { range: 'month', flow: 'expenses' } (FLOW_WHERE.expenses in api/src/lib/stats.js: status NOT IN Returned, Cancelled, Draft; custom statuses count, and every kind counts), plus pace.daysIn and pace.unitDays from paceFor()
- categories.budget (read, unchanged): the sum of limits that monthView() in Home.jsx already computes over getHomeCategories' `limited` list
- npm run queries:check will report the settings SELECT and UPSERT as changed statements; both stay a primary-key lookup on user_id, so they are blessed, no index.

#### How the figure is made

One helper, react/src/app/payDay.js, gives the pay day of any month and the previous and next pay day for any date. For one month: rule 'day' takes the smaller of pay_day and the month's length, then if that date is a Saturday or Sunday moves it by pay_weekend ('before' to the Friday, 'after' to the Monday, 'same' stays); rule 'last-workday' takes the month's last day and steps back while it is a Saturday or Sunday; rule 'none' gives nothing. For a date it builds the pay days of the month before, the month itself and the month after, sorts them, and returns the last one before the date as previous and the first one on or after it as next; three months because 'after' can push a weekend 31st into the 1st of the next month (31 May 2026 is a Sunday, so June then has two pay days). Home passes today() from react/src/api/format.js and settings.data, which Home already reads for Needs a look and the monthly summary; the same today() goes to the server in the X-Spendly-Today header (client.js, api/src/lib/dates.js), so "day 21 of 31" and the pay day count are the same day. The head sentence is days = next minus today in whole days: 0 "Pay day is today", 1 "Pay day is tomorrow", else "Pay day in N days", the same shape as daysAgo() beside it. The per-day figure is left = limits minus window.spent, where limits is monthView().limits and spent is what the card already shows under FLOW_WHERE.expenses; it is absent when limits is 0 or left is 0 or less. Its days are next minus today when next is after today and inside this month ("until pay day"); otherwise unitDays minus daysIn plus 1, today through the month's last day ("until the month ends"), because the limits reset on the 1st and dividing this month's rest over next month's days would be false. Figure = Math.round(left / days) through currency(x, 0), whole kroner as the line's other figures. The right-hand "ahead of pace" keeps Home's own rule (used > pace in Limits), untouched. The Settings preview calls the same helper with the draft values, not the saved ones, and writes the date with Intl.DateTimeFormat for the chosen locale code (undefined for 'auto', the way localeSample does), weekday long, day and month two-digit, year numeric, first letter capitalised as capital() does for the month name.

#### How much history it needs

None is needed. The sentences read today's date, the setting as saved, and this month's figures the card already has; they show from the first day the setting is saved, and with less than one day of anything there is nothing to wait for. Without the setting the per-day figure counts to the end of the month; without any limit it is absent.

#### What it must never claim

- It never says the money is in the account. "Pay day in 10 days" counts calendar days, on the reader's own clock, to the date the person's own rule gives; the rule is theirs, the date is arithmetic.
- It never shows an amount of pay. The Budget's Salary row is not read, and no amount is asked for in Settings.
- The per-day figure is what is left under the category limits, from orders typed in, under the statuses that moved money (every status but Draft, Cancelled and Returned, custom statuses included, every kind included); spend in categories with no limit is not in it. The line keeps "in limits" in front of it so it is never read as a bank balance or as what can be spent.
- Public holidays are not known: the weekend help says so in two sentences, and nothing in the app pretends otherwise. Easter moves and Store Bededag is gone; the rule moves only Saturdays and Sundays.
- A figure with nothing behind it is not shown: no limits, nothing left, or over the limits means no per-day figure, never "0 kr. a day".
- A per-day figure never counts past the month it belongs to. When the next pay day is in a later month, or is today, the line says "until the month ends", not "until pay day".
- When Settings did not load, both new texts are absent rather than falling back to the month-end wording, because the page does not know whether a pay day is set.
- Settings applies nothing before Save, and the preview row says "NEXT PAY DAY" from the values on screen, not the saved ones, the same way the amount preview shows the chosen currency.
- The day field can never hold a day the server would refuse: below 1 becomes 1, above 31 becomes 31, an emptied field returns to its last value on blur, so the "Your settings are saved." toast is never shown over a value that was silently kept.

#### Decisions the build makes unless overruled

- Rows in the existing Money, dates and times card (fields, rule, more, as DefaultsCard), not a twelfth pane and not a second card under one nav entry: 11a says eleven panes and draws one card per pane.
- Segmented for both the rule (Not set / Day of the month / Last work day) and the weekend rule (Friday before / Monday after / That day): three short options each, the control Theme and Row density already use inside a Field in Settings. c5 says a Segmented applies instantly, but 11a's Row density and 8b's Tell me early already wait for the card's Save in this pane, so these two wait too.
- The day is a NumberField with no unit (c3: the unit can be nothing), decimals 0, whole numbers, clamped to 1 to 31 on the client (NumberField clamps only below `min` today, so the upper bound is done in the card's onChange); it opens on 31 when nothing is stored, which the help line explains as the month's last day, and the person changes it before saving.
- The weekend group shows only for Day of the month: the last work day is never a weekend. The stored default is 'before' (the Friday before), the usual move for a Danish pay date; it only matters once a rule is set.
- The NEXT PAY DAY preview is a second row shaped exactly like PREVIEW (label, value, vertical rule, sp-data), from the on-screen values, the date with its weekday in the value's place so the weekend rule's effect is visible and "in 10 days" in the sp-data place; absent under Not set.
- On Home the pay day sentence is its own sp-meta span in the head row, before "last added 2 days ago", separated by the row's gap as the Categories card head separates its two facts; plain text, not a link.
- The per-day figure is appended to the drawn left text of the limits line after the dot; the drawn "90% of 68.000 kr. in limits" and the right-hand "ahead of pace" are unchanged (design wins over the brief's "8.600 kr. left under your limits"; see the question).
- Without a pay day the figure is shown and counts to the month's last day with "until the month ends", rather than being absent: the limits are monthly, the month's end is a fact the card already prints ("day 21 of 31"), and the figure is the pace the gauge marker already implies.
- Phone: the sentence joins the date line under the greeting, and the per-day figure takes the sp-meta slot under the gauge the THIS MONTH card already uses in two states; the figure is kept on the phone because the phone is where the person stands in the shop.
- Both Home texts wait for the settings read (the `known` rule Home already applies to the summary and Needs a look) and are absent until then, with no skeleton of their own; the rest of the head and the limits line draw as today.
- API names: payRule 'none' | 'day' | 'last-workday', payDay 1 to 31 or null, payWeekend 'before' | 'after' | 'same'; a 'day' rule arriving without a valid whole day keeps the stored rule, the route's existing fall-back-to-stored rule.
- The helper lives once, in the browser (react/src/app/payDay.js): its only readers are Home and the Settings preview, both of which need the reader's own day; the API validates and stores, it does not compute.
- docs/home.png and docs/phone.png are re-rendered in the verification pass, since the limits line gains text even on an account with no pay day; all-orders.png and order-list.png must come back byte-identical.
- react/scripts/edge-account.mjs is not extended: it adds records, and this is a setting with no record shape; the helper's calendar cases (31 in a 30-day month, a weekend 31st under each rule, 28 February 2026 on a Saturday, 31 May 2026 under 'after' giving June two pay days) are checked by a one-off node run of the helper in the verification pass.

#### Questions for Claude Design

- The brief rewrites the drawn limits line to "8.600 kr. left under your limits · 360 kr. a day until pay day", but 10a draws "90% of 68.000 kr. in limits" on the left of that line, while 4a's Monthly limit rows read "6.680 kr. left". The build keeps 10a's text and adds the per-day figure after it. Should 10a's left text be redrawn as an amount left ("6.520 kr. left under your limits"), the 4a shape, so Home and Statistics say the same kind of thing? Only Claude Design can change the drawn copy.


### 2. Where this month will probably end

Covers: pick 1 of 12. Size: medium.

Home's month card gets one muted line that says what the month will probably end at, with a low and a high figure once there is enough history, and how many earlier months it was worked out from. It counts exactly what "Spent this month" counts, and it is absent early in the month, while the history is thin, or while the pattern is too unsteady to say anything sound.

#### What the person sees

- Desktop month card, existing header: August 2026 · day 21 of 31        last added 2 days ago
- Desktop month card, existing figure: Spent this month  61.480 kr.
- Desktop month card, existing row under the gauge: 90% of 68.000 kr. in limits        ahead of pace
- Desktop month card, new row under that, left: Will probably end near 72.000 kr. (65.000 to 80.000)
- Desktop month card, new row, right: from 6 earlier months
- Desktop, with 3 to 5 counted months, left: Will probably end near 72.000 kr.
- Desktop, with 3 to 5 counted months, right: from 4 earlier months
- Phone THIS MONTH card, one line under the gauge: Will probably end near 72.000 kr. (65.000 to 80.000)
- Phone, with 3 to 5 counted months: Will probably end near 72.000 kr.

#### Where it lives

Home 10a, the month card, drawn by MonthCard in react/src/pages/Home.jsx, and the phone Home frame in Mobile screens 7a, drawn by PhoneMonth in the same file. On desktop the line is a second meta row inside the card's gauge block (the `sp-stack sp-gap-8` holding the gauge and the "90% of 68.000 kr. in limits / ahead of pace" row, Home.dc.html lines 154-162), with the same markup as that row: `sp-meta`, `sp-grow`, `sp-meta`, so nothing new is drawn, only a new state of the card. On the phone it is one `sp-meta` line under the gauge, the place PhoneMonth already uses for "No monthly limits yet. Set one on a category to follow the month here." (the 7a frame itself draws the THIS MONTH card as figure, "of 68.000 kr." and gauge, with no line under the gauge; the line is a new state of that card). The figures come from the API as a new field `outlook` on GET /api/stats/home (homeAttention in api/src/lib/stats.js), the Home-only read that already carries lastAdded into MonthCard; the month card itself keeps reading /api/stats?range=month&flow=expenses (getStatsSlice with MONTH = { range: 'month', flow: 'expenses' }). Two things differ from the feature note: "From your last 6 months." becomes "from 6 earlier months", because the counted months are not always the six right before this one (see honest), and Statistics 4a gets nothing, because no card there has a place for it: the Monthly limit card's lines ("Day 20 of 31 - expected pace", "Marker shows where you should be on day 20.") are about the limits marker, and the figure cards' meta line is the comparison ("vs 410.700 kr."), so a line there would be a new card or a new slot.

#### States

- **not enough history (fewer than 3 counted months).** Absent. No text, no dash, no placeholder figure; the card keeps its other lines.
- **3 to 5 counted months.** Middle figure and count only: "Will probably end near 72.000 kr." with "from 4 earlier months" at the right. No low and high.
- **too early in the month (day 1 to 4) or median share under 15 percent.** Absent.
- **nothing counted typed in for this month yet.** Absent (never "near 0 kr.").
- **range collapses (low and high round to the same figure, or one equals the middle).** Middle figure and count only, as with 3 to 5 months.
- **nothing to show.** Absent. On desktop the month card stretches to the capture card's height beside it, so the extra row only redistributes the space between the card's groups and the card is never shorter for it. This is measured in the build, not assumed.
- **loading.** Absent until both the month read (/api/stats) and /api/stats/home have answered, then shown; no skeleton, the same as "last added 2 days ago" today. A skeleton would promise a line that often does not come, and the line never stands under a skeleton gauge.
- **failed.** Absent when /api/stats/home fails. The month card's own failed state ("This month" did not load) already covers the month read; the line has no error text of its own.
- **switched off.** There is no switch. The line is absent on its own whenever it has nothing sound to say.
- **phone.** One sp-meta line under the gauge in the THIS MONTH card: "Will probably end near 72.000 kr. (65.000 to 80.000)". The month count is not drawn on the phone (7a: cards drop fields rather than shrinking them).

#### On a phone

Mobile 7a Home frame, the THIS MONTH card: one `sp-meta` line under the gauge reading "Will probably end near 72.000 kr. (65.000 to 80.000)", without the month count (7a: cards drop fields rather than shrinking them). It is drawn under the gauge in every state of the card: with limits, under "No monthly limits yet. Set one on a category to follow the month here." when there are none, and under "Your limits did not load." when only the limits failed. Not rendered yet: at 375 the line is to be measured in the build with six-figure amounts ("Will probably end near 123.400 kr. (112.300 to 138.900)") with the iPhone 15 descriptor, to confirm it holds one line or wraps cleanly without overflow; if it wraps, the range goes to a second line of its own rather than mid-figure.

#### Where a tap goes

- (none) - the line is plain text and opens nothing; the card's existing links are unchanged

#### What it reads

- orders: user_id, date, status, total - read through the existing dailyRowsOver and totalsOver statements with scopeOf({ flow: 'expenses' }), whose WHERE is `ot.status NOT IN ('Returned', 'Cancelled', 'Draft')` (FLOW_WHERE.expenses); no kind filter, amount is the stored total column (paid + shipping - discount)
- orders: MIN(date) per user - the existing earliestOrderDate statement, for the first-order rule
- NEW response field (not a column): GET /api/stats/home gains outlook: { middle: number, low: number | null, high: number | null, months: integer } | null, beside lastAdded and things
- No new table, column, index or setting.

#### How the figure is made

The API takes the month's counted total as the card shows it: totalsOver over the calendar month with the expenses scope, which counts orders with any status except Returned, Cancelled and Draft (Ordered, Delivered and every custom status), of every kind (Expense, Gift, Sold, Work, Other), by the stored total column, dated by the order's day, so the whole month as dated, not just through today. It then reads daily totals for the 12 full calendar months before this one in one dailyRowsOver call with the same scope, cumulates each month with cumulate(), and for each month divides the running total at today's day number (pace.daysIn; the month's last day when the month is shorter, so share 1) by that month's total. A month whose first day is before the account's first order (earliestOrderDate) or whose total is 0 is skipped and not counted. The shares are sorted; the median (the mean of the two middle values when the count is even) gives the middle figure as the counted total divided by the median share; the 75th and 25th percentile shares (position (N-1) x 0.75 and (N-1) x 0.25 in the sorted list, taking a proportional value between two neighbours when the position is not whole) give the low and the high figure the same way. Each figure is rounded to the nearest 100 kr. in the API and written with currency(n, 0) in the app. The answer rides on GET /api/stats/home, so it is cached per reader day by readCache and flushed on any write like Home's other reads; today is req.today (X-Spendly-Today), the same day the month card's pace uses.

#### How much history it needs

It looks at the 12 full calendar months before this one, the same twelve the monthly summary (selectLimitedMonths from m - 13) and the category form read. A month counts when its first day is on or after the day of the account's first order and its counted total is above 0; other months are skipped and are not in the number the line says. The middle figure needs at least 3 counted months; the low and the high figure need at least 6. With 3 to 5 counted months the line shows the middle figure and the count, no range. The line is absent with fewer than 3 counted months, on days 1 to 4 of the month, while the median share is under 15 percent, and while nothing counted has been typed in for this month.

#### What it must never claim

- It never says "will end at" or "you will spend": "probably" and "near" stay in the sentence, and the range reads "65.000 to 80.000", never "at most" or "at least".
- It never says "your last 6 months": the counted months are the ones with counted orders in the last twelve, which may not be the six right before this one, so the line says "from 6 earlier months".
- It counts only orders typed in with a day in the month, as the figure above it does; it knows nothing about money not typed in, so it is absent when nothing counted is typed in for this month rather than saying "near 0 kr.". The line does not repeat "typed in" because it sits directly under "Spent this month", whose scope it shares.
- An order typed in with a day later this month counts as already spent, because the figure above it counts it too; the line then reads higher than a through-today reading would.
- The end figure is never below "Spent this month": the month's counted total is what is divided, and a share is never above 1, so the line cannot contradict the figure above it.
- It is not a link; the number of months is plain text like "day 21 of 31" on the same card, and no row that opens a list is added.
- No percentage is shown; the shares are used only to work out the amounts, and a saving is not involved.
- When the history is thin or the shares are unsteady the line is absent, never a dash, a question mark or a placeholder figure.
- An account whose first order is less than four full months old never sees the line; a Danish account filled from a bank import, with every order dated the first of the month, gets shares of 1 and a line equal to "Spent this month", which is true but says nothing new.

#### Decisions the build makes unless overruled

- The figures are served as `outlook` on GET /api/stats/home (homeAttention), not on /api/stats: Home is the only reader, MonthCard already receives `attention`, and Statistics' response stays as it is.
- No new SQL text: dailyRowsOver, cumulate, totalsOver, scopeOf({ flow: 'expenses' }) and earliestOrderDate are reused with new parameters; check-queries keys statements by normalised SQL and records the first parameters it sees, so `npm run queries:check` is run and expected to report no change.
- "So far" is the card's own Spent this month figure (orders dated anywhere in the month, including a day still to come), so the line never reads below the figure above it.
- 12 full months are looked at, matching the twelve the monthly summary (8b) and the category form already use.
- A month counts only if its first day is on or after the first order's day and its counted total is above 0; the count said in the line is of counted months only.
- "The same day" is the running total at today's day number; for a shorter earlier month it is that month's last day (share 1).
- Percentiles by position in the sorted shares, (N-1) x 0.25 and (N-1) x 0.75 with a proportional value between neighbours; the median is the mean of the two middle values when the count is even.
- The three figures are rounded to the nearest 100 kr. before they are written (72.000 kr., not 71.987 kr.), because "near" promises no more; when low and high round to the same figure, or either equals the middle, the range is dropped.
- Shown from day 5 of the month (pace.daysIn >= 5), and only while the median share is 15 percent or more.
- Desktop placement: a second meta row under the limits row inside the gauge block, same markup as that row (`sp-meta`, `sp-grow`, `sp-meta`), drawn whichever state the limits block is in: limits, "No monthly limits yet...", or "Your limits did not load.". The unit is written once, after the middle figure, as the feature note's own example does.
- Not the Stat's meta-line slot: Components c14 gives a Stat "label, figure, and optionally a meta line and a change", but the month card uses `sp-stats--line`, whose subgrid holds exactly two rows (label, figure), so a meta line there is a third row on a finished variant. The meta row under the gauge needs no component change. Claude Design may overrule this placement in one line.
- The line waits for both reads: it is drawn only once the month figure (w) and /api/stats/home are there, so it never stands under the gauge skeleton.
- Phone placement: one `sp-meta` line under the gauge, without the month count (7a: cards drop fields rather than shrinking them).
- No skeleton and no error text of its own: absent until the reads answer, absent if /api/stats/home fails, the same as "last added" today.
- No switch in Settings: Home's month card lines ("ahead of pace", "last added") have none, and the line is absent on its own when it has nothing sound to say.
- Statistics 4a gets nothing: no card there has a place for it without a new card or a new slot.
- react/scripts/edge-account.mjs gains three cases in the same change: a month inside the last twelve with no counted orders, a month with every order dated its first day (as a bank import lands), and a first month that began mid-month. The script's demo data is 14 months, so the account has enough history for the range.
- docs/home.png and docs/phone.png are re-rendered only if the unchanged source no longer reproduces them: regen-docs.mjs seeds the docs account from August 2026 (MONTHS counts from that month), so until 1 November 2026 it has fewer than 3 full earlier months and the line is absent in both shots; from November the middle figure appears and from February 2027 the range, and the shots change then.
- Response shape: `outlook: { middle, low, high, months }` or null; low and high are null below 6 counted months.

#### Questions for Claude Design

- Home 10a says "A button or row that shows a number opens a list with exactly that many items. If it cannot, the number is not shown." The new row shows "from 6 earlier months" and opens nothing. The build reads that rule as being about counts of records (the same card already shows "day 21 of 31" and "90% of 68.000 kr." as plain text) and keeps the count. If Claude Design reads it as covering this count too, the count is dropped and the line keeps only the figures; which reading holds?


### 3. Same month last year, on Home

Covers: pick 12 of 12. Size: medium.

Home's month card gets one small line under this month's figures: what the same days of the same month last year came to, with its order count, and what that whole month came to, with its order count. It shows on desktop and on a phone, and only when the account has an order that far back.

#### What the person sees

- Desktop 10a, month card, top label (unchanged): "October 2026 · day 6 of 31"
- Figures (unchanged): "Spent this month" "1.900 kr." · "Saved" "320 kr." · "Orders" "5"
- New line, under the figures and above the gauge: "Same days last year, 1 to 6 October 2025: 1.350 kr. in 4 orders. All of October 2025: 7.200 kr. in 22 orders."
- Gauge lines (unchanged): "12% of 16.000 kr. in limits" "below pace"
- Phone 7a, This month card: "This month" "1.900" "of 16.000 kr.", the gauge, then the same line: "Same days last year, 1 to 6 October 2025: 1.350 kr. in 4 orders. All of October 2025: 7.200 kr. in 22 orders."
- On the first day of a month: "Same day last year, 1 October 2025: 240 kr. in 1 order. All of October 2025: 7.200 kr. in 22 orders."
- When the same days last year had nothing to count: "Same days last year, 1 to 6 October 2025: no orders. All of October 2025: 7.200 kr. in 22 orders."
- When the whole month last year had nothing to count: "No orders in October 2025."
- On the last day of a month, when the same days are the whole month: "All of October 2025: 7.200 kr. in 22 orders."
- When last year's month did not load: "October 2025 did not load." "Try again"

#### Where it lives

Home 10a, the month card. On desktop (MonthCard in react/src/pages/Home.jsx) the line is one row of the card's own column, between the three figures (Spent this month, Saved, Orders) and the gauge; on a phone (7a Home frame, PhoneMonth) it sits under the gauge of the This month card, after "No monthly limits yet. Set one on a category to follow the month here." when that text shows. It is the card's existing small grey line (sp-meta, the same type as "90% of 68.000 kr. in limits" and "No monthly limits yet."), inside the c10 card: no new component, and it is text, not a link, like the three figures above it. New are the line itself, a second month read for the same month last year (the read Statistics' Compare already makes), and sameDaysOf moving out of Statistics.jsx into react/src/pages/statisticsWindows.js so Home and Statistics share one calculation. Where the proposal differs from the owner's note: the first sentence there ("1 to 6 October: 1.900 kr. in 5 orders") repeats Spent this month and Orders, which the card already shows, so it is not drawn twice. Statistics on a phone shows no comparison (the 7a Statistics frame is label and figure only; Statistics.jsx compares only when not touch), so the phone line is a question below. The month card and the capture card share one row (hm-split, align-items stretch) and the month card's groups are spread over the capture card's height (hm-spread, space-between), so the line most likely fits in the room the spread already leaves; if the month card becomes the taller of the two, the capture card grows with it. The verification pass measures both cards' heights before and after.

#### States

- **not enough history.** Absent: no line, no empty text, no skeleton. Rule: the account's first order (firstOrder in the month read, MIN(date) over every order, drafts and cancelled ones included) is dated after the last day of the same month last year.
- **nothing to show - last year's whole month empty.** "No orders in October 2025." One sentence, no figures; shown only because the account has an order that far back. "No orders" means none that Spent this month would count: a draft, a cancelled or a returned order from that month does not count here, as it does not count in the figures above.
- **nothing to show - the same days empty, the month not.** "Same days last year, 1 to 6 October 2025: no orders. All of October 2025: 7.200 kr. in 22 orders."
- **loading.** While the month read loads: absent, because the card does not yet know whether the line will show. Once the month read answers and the history rule passes, one skeleton line (the card's hm-line skeleton, 11 high, as under the gauge) holds the place until last year's month read answers.
- **failed.** "October 2025 did not load." with the small text button "Try again" at its right - the shape of PhoneMonth's "Your limits did not load." + "Try again". This month's own figures still show. Statistics' own failed shape for the same read is a c19 inline alert ("October 2025 did not load", "Try again", "The figures are shown without the comparison."); it is too tall for one line in the card, so the card's own smaller shape is used.
- **switched off.** No switch: the line has no setting. It is absent only by the history rule.
- **phone.** Under the gauge in the This month card, same words as desktop, wrapping to two or three lines at 375. Loading, failed and empty states as on desktop.
- **first day of the month.** "Same day last year, 1 October 2025: 240 kr. in 1 order. All of October 2025: 7.200 kr. in 22 orders." - never "1 to 1".
- **last day of the month.** "All of October 2025: 7.200 kr. in 22 orders." only. Rule: the same days cover every day of last year's month (the day count is the smaller of today's day number and the days in last year's month, so 29 February also lands here), and the first sentence would repeat the second.

#### On a phone

The 7a Home frame's This month card gets the line under its gauge (after "No monthly limits yet. Set one on a category to follow the month here." when there is no limit). Same words as desktop, one sp-meta line that wraps to two or three lines at 375; nothing is dropped, because the order count beside each amount is the point. "Try again" is the small text button the card already uses beside "Your limits did not load.". Statistics on a phone shows no comparison at all (7a Statistics frame: label and figure only; Statistics.jsx line 130, comparing = compareOn && !touch && !drilled), so whether the phone carries this line is asked below.

#### Where a tap goes

- none - the line is text, like Spent this month and Orders above it; nothing on it opens anything
- /statistics?range=month - Statistics, this month, Compare on by default (compare is on unless the address says compare=off): holds the same two figures as "vs 1.350 kr. by 6 Oct" and "vs 4 by 6 Oct" (not linked from the line; named so the build can link it if the owner wants)
- /statistics?range=month&period=2025-10 - Statistics on last year's month, the route the monthly summary's "Open statistics" already uses for a past month: holds exactly "All of October 2025" (its Total spend and Orders with the Expenses lens) (not linked from the line; named for the same reason)
- Try again - no route; asks for last year's month again

#### What it reads

- orders: user_id, date, status, total, saved - read through GET /api/stats (stats.js totalsOver and dailyRowsOver; the daily rows carry spend, saved and a count together). total and saved are the stored generated columns (paid + shipping - discount; retail - paid + discount) from migrations 009_order_discount.sql and 100_order_statuses.sql
- orders: MIN(date) per account, returned as firstOrder by GET /api/stats (stats.js earliestOrderDate) - the history rule
- NEW: nothing. No column, no table, no setting.

#### How the figure is made

Home already reads this month with GET /api/stats?range=month&flow=expenses (MONTH in Home.jsx): window.spent, window.orders, window.pace.daysIn, window.from and firstOrder. When firstOrder is on or before the last day of the same month last year, Home reads that month too: GET /api/stats?range=month&windowId=2025-10&flow=expenses, the read Statistics makes for its Compare switch (past in Statistics.jsx, windowId from yearEarlier in statisticsWindows.js); its window.spent and window.orders are "All of October 2025". The same days are sameDaysOf(window, days) from Statistics.jsx: series.current[days-1] and series.ordersCumulative[days-1], with days = the smaller of this month's daysIn and the number of days in last year's month (Statistics.jsx line 394), so Home and Statistics give the same figures for the same day. Both reads count the same orders: FLOW_WHERE.expenses in stats.js, status not Returned, Cancelled or Draft (Ordered, Delivered and every custom status count), every kind, amount = the stored total (paid + shipping - discount), placed by the order's date. The year compare in the API (compare=year, comparisonWindowId) is not used, because series.previous carries spend only, no order count. No new SQL: a month read's plans are already blessed.

#### How much history it needs

Shows when the account's first order (any status, drafts included) is dated on or before the last day of the same month last year, so there is at least one order about 12 months back. With less, the line is absent and nothing stands in its place. The demo account filled for one year does not reach it (populateDemoData months = 12 fills from 11 months back through this month, so its oldest order is in the month after last year's October), so home.png and phone.png do not change; filled for two years, or on the edge account (demo months 14 and the "Last year" order at day(-400) in react/scripts/edge-account.mjs), it shows.

#### What it must never claim

- Never "you spent" or "you bought": the figures are the orders that were typed in, so every amount carries "in N orders" and an empty stretch reads "no orders", not "0 kr.".
- Never "no orders were added": the history rule counts every order, but the figures count only what Spent this month counts, so a month holding only a draft, a cancelled or a returned order reads "no orders", which is what the card's own Orders figure would say of it.
- No percentage and no "more" or "less": the two amounts stand side by side with their counts, so a higher amount from more receipts is visible as that.
- The dates are written out ("1 to 6 October 2025") so "same days" cannot be read as the same weekdays.
- "All of October 2025" is a month that has ended; the line never projects this month to its end.
- A zero is words, never "0 kr. in 0 orders" - a number with nothing behind it is not shown.
- "did not load" says only that; it does not say what last year came to.
- An order is placed by its date, which is a day with no time, often the day it was typed in; the line compares those days and claims nothing about when the money left.

#### Decisions the build makes unless overruled

- One sentence in the card's small grey type (sp-meta, the "90% of 68.000 kr. in limits" line), not the 4a pill-and-"vs" row: the pill is a percentage, and the owner asked for amounts with order counts.
- Text, not a link, like the three figures above it in the same card; Statistics with Compare on holds the same comparison, and /statistics?range=month&period=2025-10 holds last year's month, as the monthly summary's "Open statistics" already links a past month.
- Desktop: the line sits between the figures row and the gauge, so the figures are followed by their comparison and the gauge keeps its own two lines. Phone: under the gauge, because the figure and "of 16.000 kr." and the gauge are one block there.
- The phone carries both sentences; nothing is dropped, the line wraps.
- Day numbers are plain; the month name follows the account's language inside running text (4a rule, monthNames in format.js); "Same day last year, 1 October 2025" on the first day; only "All of ..." when the same days cover all of last year's month.
- Zero reads "no orders" for the same days and "No orders in October 2025." for the whole month.
- The history rule uses firstOrder from the answer Home already has; the second read runs only once it passes, so an account without the history makes no extra request.
- Loading: absent until the month read answers, then one skeleton line until last year's read answers. Failed: "October 2025 did not load." + "Try again", the PhoneMonth shape, on both desktop and phone; not Statistics' c19 alert, which does not fit in the card's line.
- sameDaysOf moves from Statistics.jsx to statisticsWindows.js and is used by both pages; the API is not changed.
- No setting: the line is not a Needs a look kind and the month card has no switches.
- The edge account already holds an order 400 days back, which shows the line; the demo account at one year shows the absent case. Both are checked in the verification pass, with the month card's and capture card's heights measured before and after on desktop.

#### Questions for Claude Design

- Statistics on a phone shows no comparison at all (the 7a Statistics frame is label and figure only, and Statistics.jsx compares only when not touch). Should Home's This month card on a phone carry this line as proposed, or does the phone keep its 7a frame as drawn, with the line on desktop only?


### 4. A limit suggested from your own months

Covers: pick 2 of 12. Size: medium.

On a category's edit page, under the Limit field, the app says what a normal month on that category looks like, in how many of your last months you were above the figure in the field, and offers a limit with a little room above that. One tap puts the figure in the field; nothing is saved until you press Save category.

#### What the person sees

- Monthly limit (card label, 5f, unchanged)
- Limit (field label, unchanged; the field reads 22.000, or the placeholder no limit when empty)
- About half of your last 6 months on Decor were above 19.550 kr. A limit of 21.500 kr. gives a little room above that. 2 of those months were above 22.000 kr.
- Use 21.500 kr.
- [after the tap the field reads 21.500, the button is gone, and the line ends] ... 2 of those months were above 21.500 kr.
- Unsaved changes · Cancel · Save category (save bar, unchanged; on a phone the primary reads Save, as 7a says)
- [no limit in the field] About half of your last 6 months on Decor were above 19.550 kr. A limit of 21.500 kr. gives a little room above that.
- [young account, four whole months] About half of your last 4 months on Decor were above 19.550 kr. A limit of 21.500 kr. gives a little room above that. None of those months were above 40.000 kr.
- [amber 6c state, the app's words unchanged, with Use 21.500 kr. under it] Decor averaged 19.480 kr. a month over the last 12 months. This limit will be passed most months.
- [Home, 8b row, unchanged words] Decor went 2.100 kr. over · Third time in twelve months. The limit may be too low. · Adjust

#### Where it lives

5f, Categories - edit, the Monthly limit card: the Limit field's message slot and the slot under it. In code that is react/src/pages/CategoryForm.jsx lines 243-254, Field `message` with `messageType='hint'` plus Field's `after` prop holding one `Button variant="outline" size="small"` - the 5h shape (a field message with small outline buttons under it, design lines 1180-1183) that react/src/pages/VendorForm.jsx lines 307-314 already render through `after`; CategoryForm.jsx lines 221-227 hold the nearer precedent of a button under a field ("Use {name}" on a taken name, 6c), but as a solid small button in a sibling div, so the alias shape is the one copied. The count against the typed figure reuses the `checkedBudget` on-blur pattern at lines 135-139 and 246. New: two fields on the single record from `fullRecord` in api/src/routes/categories.js (line 47), one prepared statement in api/src/lib/aggregate.js beside `categoryYearOrdersQuery` (line 142), a short helper that sorts, takes the middle and rounds, and `?focus=limit` added to Home's Adjust at react/src/pages/Home.jsx line 396 - the parameter the app's Edit on category in Statistics already sends (Statistics.jsx line 1234) and CategoryForm.jsx lines 65-67 already read. Where this departs from the brief: the "same one-tap on the monthly summary's Adjust row" is not built - design 8b gives that row one small outline action, Adjust (Duplicate and alerts.dc.html line 225), and a tap on Home that writes a limit would save with no Save step, which 5f's save bar forbids; Adjust lands on the field where the suggestion is. It is not a c19 inline alert (c19 Actions: "None of its own") and not a fourth rail card (5c's note: "Three cards is its ceiling"; 5f's rail already holds Category summary, Recent orders and Removing it).

#### States

- **not enough history.** Line and button absent. The field keeps its plain hint: One amount for every month. Statistics reads this.
- **nothing to show.** The middle value is 0 kr. (more than half of the months had no counted order in the category): line and button absent, the plain hint stays. A new category (5e) never shows it.
- **already that figure.** The typed limit equals the suggestion: the line stays, the button is absent.
- **no limit in the field.** The line without its third sentence: About half of your last 6 months on Decor were above 19.550 kr. A limit of 21.500 kr. gives a little room above that. The button shows.
- **loading.** The field is held by the skeleton as today (CategoryForm `h()` and RailLoading); the help line shows the plain hint until the record arrives, then the suggestion replaces it. No separate skeleton.
- **failed.** The page's own Failed state, unchanged (Failed.jsx): This category did not load, the reason line, Try again; Open Categories in place of Try again when the category is gone. The suggestion rides on the same record, so it has no failed state of its own.
- **switched off.** Absent: there is no switch. It is a help line on a field, not an alert, so the Limit alerts pane (11a) is not touched.
- **phone.** 5f on a phone is the 5b frame (Mobile screens 7a note: 5c, 5e and 5f are the same frame): the same Monthly limit card in the scroll, the line wraps under the field, the small outline button under it as 5h's buttons render on a phone, and the save bar at the bottom reads Unsaved changes with Save after the tap. Home on a phone has no monthly summary (7a note), so the Adjust route is desktop only.

#### On a phone

Same card, same words. The line wraps to three or four lines at 393px (iPhone 15, the floor device) under the field; the button keeps the small outline size and its touch target, as the two buttons under the alias field (5h) do on a phone. The save bar stands in the tab bar's place and reads Unsaved changes with the primary Save after the tap. Checked against the 7a note that 5f is the 5b frame; not rendered.

#### Where a tap goes

- /categories/:id/edit?focus=limit - Adjust on Home's monthly summary (8b) and Edit on category inside a category crumb in Statistics (4a): the edit page with the Limit field focused, where the line and the button are
- /categories/:id/edit - a 5d row, unchanged
- /categories - where Save category returns (useListReturn), unchanged
- Use 21.500 kr. - no route; it fills the Limit field on this page

#### What it reads

- read: orders (user_id, date, total, category_count, status), order_categories (order_id, category_id), categories (id, name, budget) - all in api/src/migrations/001_init.sql and 009_order_discount.sql
- read: MIN(orders.date) for the account - the `earliestOrderDate` statement api/src/lib/stats.js line 38 already holds
- NEW field on GET /api/categories/:id (fullRecord, routes/categories.js line 47): recentSpends, number[] - the last 3 to 6 whole months after the first order's month, oldest first, 0 for a month with nothing counted; empty when fewer than 3
- NEW field on GET /api/categories/:id: suggestedLimit, number or null - middle of recentSpends times 1.1, rounded to the nearest 50; null when recentSpends is empty or the middle is 0
- NEW prepared statement in api/src/lib/aggregate.js: categoryYearOrdersQuery's shape (order_categories oc CROSS JOIN orders ot) with `AND ot.status NOT IN ('Returned', 'Cancelled', 'Draft')` and the six-month bounds; its plan is reviewed and blessed in api/query-plans.json (npm run queries:bless)
- no new column, table or setting; the list row (GET /api/categories?page) does not carry the new fields, since no list reads them

#### How the figure is made

Months: the whole calendar months before this one and after the calendar month of the account's first order (MIN(date) over the account's orders), the last 6 of them, fewer on a young account, UTC month bounds as `lastTwelveMonths` in aggregate.js lines 125-131 draws them. Per month: SUM(total / category_count) over orders linked to the category and dated in that month, with status NOT IN ('Returned', 'Cancelled', 'Draft') - FLOW_WHERE.expenses in api/src/lib/stats.js lines 190-195, what Home's "Spent this month" counts (Home.jsx line 32, flow 'expenses') and what the 8b summary's "Third time in twelve months" counts (selectLimitedMonths, stats.js lines 530-538). A month with no such order is 0. Middle: sort the values; an odd count takes the middle one, an even count the mean of the two middle. Suggestion: middle times 1.1, then Math.round(x / 50) * 50; shown only when the middle is above 0. Count: the months whose value is above the figure in the Limit field, read when the field is left (the `checkedBudget` blur at CategoryForm.jsx lines 135-139 and 246) and set again by the Use tap itself, since the blur fires before the tap writes the new figure; no third sentence when the field is empty; a count of 0 reads "None of those months". The existing 12-month list (`categoryMonthSpends`, aggregate.js lines 142-159) has no status filter, so it counts Returned, Cancelled and Draft; the 6c amber check (CategoryForm.jsx 136-138), the rail's "12-month average" (fullRecord's monthAverage) and 5d's "avg. per month" (categoryList.js selectYear, lines 39-41, also unfiltered) read it, and this brief leaves them as they are.

#### How much history it needs

At least 3 whole calendar months after the month of the account's first order and before this month. With 3 to 5 it uses those and the sentence names the count ("your last 4 months"). With fewer than 3, or when the middle value is 0 kr., the line and the button are absent and the field keeps its plain hint. The first order's own month is never counted, since it is a part month; this month is never counted for the same reason.

#### What it must never claim

- It never says what the person "usually spends" for the rounded-up figure: the sentence names the middle value (19.550 kr.) as what about half the months were above, and names the suggestion as "a little room above that".
- It counts only orders typed into Spendly, with Home's statuses, so the sentence says "on Decor" and "your last 6 months", never "your spending" in general.
- A month is the calendar month of the order's date, which is a day the person typed (often the day it was typed in), and an order with several categories counts an even share of its total in each; the sentence does not say more than the months and the amounts.
- The window starts at the account's first order, not the category's: a category made recently has 0 for the months before it, and when more than half the months are 0 the line is absent rather than suggesting a figure from one or two months.
- The count is against the figure in the field right now, so it says "above 22.000 kr." with the figure, never "over the limit" with no figure.
- It never calls the figure right, recommended or safe; the words are "gives a little room above that".
- The tap saves nothing: the save bar reads "Unsaved changes" as for any edit, and the button's words are "Use", not "Set" or "Save".
- With fewer than 3 whole months nothing is shown, rather than a figure from one or two months.
- The 8b row's "Third time in twelve months" is 12 months and the field's count is the last 6; the two can differ, and each sentence names its own window.
- It does not claim to agree with 5d's "avg. per month", the rail's "12-month average" or the amber "averaged ... over the last 12 months", which count other statuses; the brief leaves those figures as they are.

#### Decisions the build makes unless overruled

- Placement: the Limit field's message slot plus Field's `after` slot with one `Button variant="outline" size="small"`, the 5h shape already rendered in VendorForm.jsx; not a rail card, not a c19 alert.
- One message at a time, in this order: red error (zero or bad amount), the 6c amber sentence unchanged, the suggestion line, the plain hint. The Use button sits under whichever shows, whenever a suggestion exists and differs from the typed figure.
- The count recomputes when the field is left, as the 6c amber check does (CategoryForm.jsx line 246), and the Use tap sets both the field and the count's figure in one step; the gauge in the rail stays live as today.
- Home's Adjust keeps its words, size and place and gains `?focus=limit`, the parameter the app's Edit on category in Statistics already sends; no tap on Home writes a limit.
- Statuses: Home's rule (not Returned, Cancelled or Draft). The 12-month list, the rail's 12-month average and 5d's avg. per month are not changed in this brief.
- The category name in the sentence follows the typed name, falling back to the saved one, as the amber sentence does (CategoryForm.jsx line 138).
- A count of 0 reads "None of those months"; every other count is the digit.
- Rounded to the nearest 50 in the account's currency (settings.currency), one rule for DKK, EUR and USD alike; the user may want a finer step for EUR or USD.
- The window is anchored on the account's first order, as the feature note asked, not on the category's first order; the nothing-to-show state covers a young category.
- The new fields ride on GET /api/categories/:id only (the single record its form reads), not on the list row.
- react/scripts/edge-account.mjs gains a category with six or more months of counted orders and a limit, and one with two months, so both the shown and the absent state render on the edge account.
- The create page (5e) shows no suggestion: a new category has no months.

#### Questions for Claude Design

- Two figures on one field: the 6c amber sentence names the 12-month average (19.480 kr., every status counted, Returned, Cancelled and Draft included) while the button under it offers 21.500 kr. from the last 6 months' middle with Home's statuses. Should 6c's sentence and its "more than 6 of 12" count move onto the same months and the same status rule as the suggestion, or keep their own? This changes settled 6c copy.
- Length of a field help line: c3 draws "one field, one help line" and the suggestion is three short sentences at `.sp-field__help` 11px grey, longer than any help line drawn in design/ (6c's is two). Is that acceptable under the field, or should the suggestion sit in the Category summary rail as a c21 sum row beside "12-month average" with the Use button in that card?
- Which statuses count toward a monthly limit: 5i's note says "all statuses" and points to a BEHAVIOUR.md that is not in design/ or the repo, 5d's This month column and the over-limit flag count everything but Cancelled and Draft (categoryList.js), and Home's Spent this month, the 8b summary and this suggestion count everything but Returned, Cancelled and Draft. One answer in one place, as 5i asks.


### 5. The day a limit is likely reached

Covers: pick 3 of 12. Size: medium.

For each category with a monthly limit, the Monthly limit card and the category list say around which day the limit is likely to be reached if spending goes on as it has, or that it likely stays under this month. It shows only when three past months and at least five orders back it up and those months agree within two weeks; otherwise the row reads exactly as it does today.

#### What the person sees

- Statistics, Monthly limit card, a row under its limit: "Seating" / "17.320" "/ 24.000 kr." / "6.680 kr. left · likely reaches its limit around 28 Oct"
- Statistics, Monthly limit card, a row ahead of pace: "1.260 kr. left · ahead of pace · likely reaches its limit around 22 Oct"
- Statistics, Monthly limit card, a row that stays under: "4.820 kr. left · likely stays under this month"
- Statistics, Monthly limit card, a row already over (unchanged): "2.100 kr. over budget"
- Categories list, the line under the category name: "41 orders · 21.140 kr. avg. per month · likely reaches its limit around 28 Oct"
- Categories list on a phone, under the bar: "Likely reaches its limit around 28 Oct."
- Categories list on a phone, under the bar: "Likely stays under its limit this month."
- Home, Needs a look (only if Claude Design places the row): "2" "categories are likely to reach their limit before October ends"; for one: "1" "category is likely to reach its limit before October ends"; on a phone "2" "likely to reach their limit"
- Settings, Needs a look (only if the row is placed): "Categories likely to reach their limit" / "A category likely to reach its limit before the month ends, if spending goes on as it has."
- Categories list filter chip (only if the row is placed): "Likely to reach the limit"

#### Where it lives

Statistics 4a, the Monthly limit card (react/src/pages/Statistics.jsx, LimitCard): the clause joins the row's existing sp-meta text after "6.680 kr. left" and after "ahead of pace" when that shows, separated by the dot the card already uses (format.js dot); it shows only when the card's month is the one running today (monthRunning, the pace marker's own condition), and the card is already null under the Refunds lens (4e note: the limit cards and the pace marker come out under refunds), so the clause goes with it. The clause is not drawn in the limit-by-month card a category crumb opens (4c, LimitByMonth), which has no row text. Categories 5d (react/src/pages/Categories.jsx, the table row and the phone cards): the THIS MONTH column is 152px through its head cell (ListCell width="amount", .sp-col-amount in react/src/styles/components.css) and its MonthLine already holds "17.320 kr. · 6.680 left", so the clause cannot stand there; on desktop it joins the sp-meta line under the name after "avg. per month", is left out at the fold width (FOLD = 880 and under, where "limit 24.000 kr." already joins that line, 5k) rather than cut, and on the phone cards (CARDS = 640 or touch) it is the sentence under the bar, the slot 5i gives the overage sentence; it goes when a month is named in the address (?month=), as the pace marker does (pace = named ? null : monthPace()). Home 10a: the drawing's Categories this month rows are "24.100 / 22.000" with a bar and no text line (Home.jsx CategoryLine matches), so nothing is added there; Home gets the day only as a Needs a look count row (c23, the shape of the "4 orders ordered over 2 weeks ago" row; the over and near rows are per-category "!" rows, not counts), and only if Claude Design places it in the rank order (see questions). A new rule means one entry in api/src/lib/looks.js RULES, one in react/src/pages/needsLook.jsx LOOKS and a count in stats.js COUNTS; Settings 11a's Needs a look pane (Settings.jsx LooksCard, section key 'looks') draws the switch from LOOKS by itself. New: one server function in api/src/lib/stats.js shared with the month forecast section of this brief, a reach field on the stats month window (beside pace and budgets) and on 5d rows under with=month (rowsFor in api/src/lib/categoryList.js), and, if the row is placed, the rule id and a /categories?flag=likely-over filter in categoryPage. No new component: the clause is text in slots that exist, and the row is the existing count row of c23.

#### States

- **not enough history.** Absent. The row keeps "6.680 kr. left" (4a) or "17.320 kr. · 6.680 left" (5d) and the phone card shows nothing under the bar; nothing is said about a day, and nothing about staying under.
- **nothing to show.** Already over: the existing "2.100 kr. over budget" (4a), "24.100 kr. · 2.100 over" (5d) or "1.240 kr. over the limit." (phone) and nothing more. Nothing spent in the category this month, a month named in the address, a month that is over or not yet started, the Refunds lens, a category with no limit, or the three months more than 14 days apart: absent.
- **stays under.** "4.820 kr. left · likely stays under this month" (4a); the 5d line ends "· likely stays under this month"; phone card "Likely stays under its limit this month." Only when all three months agree.
- **loading.** Skeleton: the cards' existing skeletons (the Monthly limit card holds the number of rows it last saw, from sessionStorage; 5d rows load with the page). The day arrives with the row's figures in the same read, never after them.
- **failed.** The cards' existing failed states (Monthly limit: "The limits did not load" or "October against the limits did not load" with Try again; 5d: the list's own). The day is part of the same read, so it fails and comes back with the figures, never on its own.
- **switched off.** Only the Needs a look row has a switch (Settings 11a, if the row is placed): off removes it from Home and from the phone's Home, and the next row moves up. The text in 4a and 5d has no switch.
- **phone.** 5d cards: the sentence under the bar; a card with nothing to say has no sentence line, as under-limit cards have none today. Statistics: the same card and row text as on desktop, Edit on category in the footer. Home on a phone: the count row "2 likely to reach their limit", only if the row is placed.

#### On a phone

Statistics on a phone draws the same Monthly limit card with the same row text (Edit on category sits in the card's footer on touch, as today). The 5d phone cards (Mobile screens 5d frame: name, "limit 6.000 kr.", the amount, the bar) get the sentence under the bar, "Likely reaches its limit around 28 Oct." or "Likely stays under its limit this month.", in the slot 5i gives the overage sentence ("1.240 kr. over the limit."); a card with nothing to say has no sentence line, exactly as an under-limit card today. Phone Home has no Categories this month card and no monthly summary (7a); it gets the day only as the Needs a look count row "2 likely to reach their limit", if that row is placed, opening the same filtered category list as the desktop row.

#### Where a tap goes

- /statistics?range=month - 4a, the Monthly limit card; its rows are text, not links (unchanged)
- /statistics?range=month&crumbs=category:<id> - 4c, the limit-by-month card for one category; no day drawn there (unchanged)
- /categories - 5d; the clause sits in the row, and the row opens /categories/<id>/edit as today
- /categories?month=2026-09 - 5d for a named month: no day, as there is no pace marker
- /categories?flag=likely-over - NEW, only if the Needs a look row is placed: exactly the categories the row counts, chip "Likely to reach the limit"
- /settings/looks - 11a, the Needs a look pane with the new switch, only if the row is placed
- / (Home) - the Needs a look row leads to /categories?flag=likely-over, only if the row is placed

#### What it reads

- categories: id, name, budget (the monthly limit, 0 = none), user_id - read (001_init.sql)
- orders: id, user_id, date, total, category_count, status - read; a category's share of an order is total / category_count, as every split does (MONTH in categoryList.js, selectLimitedMonths and scopeOf in stats.js)
- order_categories: order_id, category_id - read
- home_attention_rules: user_id, rule TEXT, enabled INTEGER (227_needs_a_look.sql) - gains the rule value 'soon' only if the Needs a look row is placed; no schema change, the migration's own note says a new rule needs none
- settings: notify_early (75, 90 or 100; 200_alerts_and_scan_defaults.sql) - read only to leave the near row's categories out of the count, if the row is placed
- NEW API field (no table): GET /api/stats window.reach, present only for a month window that holds today, one entry per limited category { id, day, low, high, orders, under }
- NEW API field (no table): GET /api/categories?with=month rows gain reach with the same shape
- NEW URL filter: /categories?flag=likely-over, only if the row is placed; no new setting and nothing new in the settings table

#### How the figure is made

For each category with a limit, the server adds up that category's share of each order (total / category_count) per day over the three whole months before this one and this month so far, counting the same orders as the figure beside it: 5d counts every status but Draft and Cancelled (the MONTH query in api/src/lib/categoryList.js, so Returned counts there), 4a counts the page's lens (FLOW_WHERE in api/src/lib/stats.js: Expenses, the default, leaves out Returned, Cancelled and Draft; Net counts Returned as money back), and Home reads the month window with flow 'expenses' (Home.jsx MONTH). Each past month becomes a curve: the share of that month's category spend reached by each day, placed at day / daysInMonth so 30- and 31-day months line up; the middle curve is the mean of the three. This month's spend so far divided by the middle curve's share at today's position (today is req.today, the reader's own day, as getStats and paceFor use it) gives the expected month total; the day is the first calendar day where expected total times the curve's share reaches the limit, and the low and high days are the same step run on the fastest and slowest of the three months' own curves. The function sits in api/src/lib/stats.js beside paceFor and monthlySummary, returns per category { day, low, high, orders, under }, and is the same code the month forecast section builds for the whole month, so the two never disagree; getStats carries it as window.reach only for a month window that holds today (beside pace and budgets), and rowsFor adds it to each 5d row under with=month. It is silent, and the row keeps its current text, when the category has fewer than 5 counted orders in those months, when any of the three months had nothing in the category, when nothing is spent in it this month yet, when the category is already over, or when high minus low is more than 14 days or one end is missing because a curve never crosses.

#### How much history it needs

Three whole calendar months before this one, each with spend in the category, plus this month so far, with at least 5 counted orders across them. With less, nothing is shown and the row reads as today: no day, and no "stays under" either, since there is no pace to read it from. A category created this month shows nothing until three past months hold its spend.

#### What it must never claim

- The day is always "likely" and "around", never a bare date: it is read from the orders typed in so far, and the app sees nothing coming.
- An order's date is a day only, often the day it was typed in, not the day of purchase; an order typed in late moves the curve, and the copy claims nothing about when money actually left.
- Never shown for a month that is over or not yet started, never under the Refunds lens, never for a category already over its limit: those are facts the row already states, not forecasts.
- "Likely stays under" shows only when all three months agree; a split verdict is silence, not a guess.
- Nothing in the copy says "will": "likely reaches", "likely stays under", "are likely to reach".
- The 5d figure counts Returned orders and the 4a and Home figures do not (Expenses lens); the clause follows the figure beside it, so the same category can read differently on the two pages, as the figures already do.
- A Needs a look row shows a count only when its link opens exactly that many categories (10a: a link opens what it counts); a count of zero is no row.
- No percentage of certainty is printed, and no "10 days before the month ends" arithmetic: the card's head already reads "Day 20 of 31 - expected pace", and a second number would be a second claim.

#### Decisions the build makes unless overruled

- Home 10a's Categories this month rows stay "24.100 / 22.000" with no day: the drawing has no text line, so the feature note's placement there is not built.
- On 5d desktop the clause joins the line under the name after "avg. per month"; at the fold width (880 and under) it is left out rather than cut; on 5d phone cards it is the sentence under the bar. The 152px THIS MONTH column keeps "17.320 kr. · 6.680 left" unchanged.
- The day prints with the app's existing day-and-month format (dayShortMonth in react/src/api/format.js): "28 Oct" in English, the short Danish form for a Danish locale; not "28 October", since the slot is a small text line.
- Clause order and wording: "6.680 kr. left · ahead of pace · likely reaches its limit around 22 Oct"; the 10-point "ahead of pace" rule is untouched.
- Which orders count is whatever the figure beside the clause counts, so the two numbers always agree on the same row.
- The day is worked out on the server from req.today; the 5d pace marker reads the browser's clock (monthPace in react/src/pages/vendorsCategories.jsx), so around midnight the two can differ by a day for one load. Accepted; the marker is not changed.
- Silent when nothing is spent in the category this month, when the category is already over, under Refunds, and for any month other than the running one.
- The window is 14 days; a window with one end missing counts as too wide.
- Each of the three past months must have spend in the category; otherwise silent.
- The Monthly limit card's note ("Each category has one limit that applies to every month.") and its marker line are unchanged; no mechanism text goes on screen.
- If the Needs a look row is placed: rule id 'soon', on by default like the two limit rows, categories already in the over or near rows are not counted again, and the row opens /categories?flag=likely-over with the chip "Likely to reach the limit". The rule is added in looks.js, needsLook.jsx and stats.js COUNTS; Settings draws the switch by itself.
- Computed on the server in one function shared with the month forecast section; no new table, column or setting.
- Verification: measure that the 5d line is not cut at 1440 and at 881 with the sidebar open and that the clause is absent at 880; render the phone card on the iPhone 15 profile; react/scripts/edge-account.mjs gains a category with 4 counted orders (silent), one with 5 (shown), one whose three months disagree by more than two weeks (silent) and one that stays under.

#### Questions for Claude Design

- Needs a look: should a count row "2 categories are likely to reach their limit before October ends" exist, and where does it rank among Categories over their limit, Categories near their limit, Orders not delivered after 2 weeks, Vendors that look like duplicates and Orders without a receipt (10a orders rows by severity, then recency, and the cap of three means a row placed high can push another off Home)? If it exists, the category list needs a filter in the Over the limit / Near the limit family, proposed as the chip "Likely to reach the limit" at /categories?flag=likely-over. In the same answer: should Home's Categories this month rows carry the day at all? They are drawn as "24.100 / 22.000" with a bar and no text line, so a line there is a row shape that does not exist today.

Depends on: Brief 30, the month forecast section: the day-by-day share curve is built once in api/src/lib/stats.js there and reused here; Limit alerts, the "Tell me early" share (notify_early): decides which categories the near row already holds, so the Needs a look row does not count them twice; The existing pace rule in 4a and 5d (marker at day / daysInMonth, "ahead of pace" at 10 points over), which the clause follows and does not change.


### 6. Maybe this order was saved twice

Covers: pick 7 of 12. Size: large.

When you save an order that looks like one you already saved, the edit screen says so before you save, and you can still save. Home then points to the orders that may be saved twice, and from there you keep both or delete one.

#### What the person sees

- An order like this is already saved
- Elgiganten, 1.299,00 kr., the same 2 lines, dated 3 Oct (SPENDLY-312). Saving is fine - you can compare the two afterwards.
- Elgiganten, order number 48812, dated 3 Oct, 1.450,00 kr. Saving is fine - you can compare the two afterwards.   (the second line when the typed order number matches instead of the lines)
- Save anyway   (on a new order the button reads Create anyway, as it already does when a limit is crossed)
- Home, Needs a look: the count pill 2, then: orders that may be saved twice   (phone: 2, then: may be saved twice; the count is always 2 or more, so there is no singular)
- Settings, Needs a look: Orders that may be saved twice - Two orders from the same shop with the same total and the same lines within 3 days, or with the same order number.
- Order list chip: Maybe saved twice
- Row note on the newer order of a pair, in amber before its reference: may be saved twice, like SPENDLY-312 from 03/10/2026
- Order page notice: This order may be saved twice. SPENDLY-312 from 03/10/2026 has the same shop, the same total and the same 2 lines.   (or: has the same shop and the same order number 48812.) Buttons: Open that order / Both are right
- List under the chip with nothing to show: No orders look saved twice / Two orders look saved twice when they have the same shop, the same total and the same lines within 3 days, or the same order number. / Show all orders
- Toast after Both are right: Both orders kept. - Undo

#### Where it lives

Moment 1 is in the edit screen (Order create 3a step 3, Order editing 1d), in the slot the limit notice already has (react/src/pages/OrderForm.jsx limitNotice: inside the totals card above the Total on desktop, after the cards and before the save bar on a phone), as one more amber row of the same component (ListItem color warning, count '!'), and the commit button already turns into Save anyway / Create anyway when a limit is crossed (8b, c19). Following c19 ("No control", "Actions: None of its own") the alert carries no link: the brief's Open that order on the alert is not built unless Claude Design allows it (see questions). Moment 2 is a new rule `twice` in Needs a look (Home 10a AlertsCard and PhoneAlerts in Home.jsx, Mobile 7a), whose switch row appears in Settings 11a's Needs a look card from the same LOOKS list (Settings.jsx LooksCard, route /settings/looks), ranked after Orders not delivered and before Vendors that look like duplicates. The row opens /orders?flag=possible-duplicate: the order list (2b) gains a `flag` facet in Orders.jsx FACETS, shown as the chip Maybe saved twice (c12, the same Crumb as the vendor list's Possible duplicates chip in Vendors.jsx), the pairs placed older then newer in the list's sort as api/src/lib/vendorList.js places look-alikes, the newer row carrying an amber note in its meta line as Vendors.jsx likeNote does. Both are right is new and has no drawn home: proposed as a section notice (6f: top of the content column, the shape of 8a's "Copied from" notice, which the app draws with Overlays.jsx Alert and its action slot in OrderForm.jsx notices()) at the top of the order page (1a, Order.jsx) on each order of a pair, with Open that order and Both are right in that slot, plus the same Both are right item in the row menu (2e, OrderMenu.jsx) only while the list is filtered to the chip; Delete one is the existing Delete order and its 6d dialog (DeleteOrder.jsx) with the Undo toast, unchanged.

#### States

- **not enough history.** Absent. The alert needs one saved order from the same shop to compare with, and a pair needs two orders; with fewer, nothing matches and nothing is drawn. No skeleton and no placeholder.
- **nothing to show.** Home: no row (a count of zero is no row, 10a); with no other rule firing the card is absent. The list under the chip, with nothing typed: the 6a shape - No orders look saved twice / Two orders look saved twice when they have the same shop, the same total and the same lines within 3 days, or the same order number. / button Show all orders (as the vendor list's No vendors look like duplicates / Show all vendors). The order page: no notice.
- **loading.** Home: the card's existing row skeletons (AlertSkeleton). The edit screen: nothing until the answer is in, as the limit notice. The order page: the notice arrives with the order itself (GET /api/orders/:id carries it), so it never appears late and never moves the page.
- **failed.** Home: the card's existing failed handling, unchanged. The edit screen: a failed check shows nothing and Save works as before - the check never blocks and never runs through validate.js. The list: the order list's existing Failed state (Your orders did not load, Try again). Both are right that fails: the error toast the app already uses - The orders were not kept as a pair. Try again.
- **switched off.** The Home row is skipped and the next rule moves up; with every rule off the card is absent (10a). The switch is Home's only: the chip's list, the order page notice and the alert while saving still work with the switch off.
- **phone.** Home: the pill 2 then may be saved twice, opening the same list (7a). The list: the Filters button reads Filters · 1 instead of a chip (Orders.jsx); two cards per pair, older first, with no note, since a card has no reference line (2i, 7a). The order page notice puts its two buttons under the words, as the saved-order notice does on a phone (OrderForm.jsx Created, Alert below). The alert while saving sits after the cards, before the save bar, as the limit notice does.

#### On a phone

Home: the row reads the pill 2 then "may be saved twice" and opens /orders?flag=possible-duplicate (7a, the Home frame). The list shows "Filters · 1" instead of the chip, and two cards per pair, older first, with no note, because a card carries no reference line (2i, 7a: "The reference, the status and the category are not on the card"). The order page notice puts its two buttons under the words, as the saved-order notice already does on a phone (OrderForm.jsx Created with Alert below); 6d's equal-halves rule belongs to the notice in the toast region, which this is not. The alert while saving sits after the cards and before the save bar, where the limit notice already sits on a phone (OrderForm.jsx touch layout).

#### Where a tap goes

- /orders?flag=possible-duplicate - the Home row, the phone row, and the chip Maybe saved twice: the pairs, older then newer
- /orders/:id - Open that order in the notice, on a pair's row and in the row menu's Open order; the alert while saving only names the order
- /orders/new and /orders/:id/edit - where the alert while saving appears
- /settings/looks - the Needs a look card with the switch Orders that may be saved twice

#### What it reads

- orders (read): id, user_id, vendor_id, date, total, item_count, reference (NOT NULL DEFAULT ''), status, created_at
- order_items (read): order_id, title - compared as lower(trim(title)) sorted and joined, the shape GET /api/orders/often already builds (orders.js selectShapes)
- home_attention_rules (read, write): user_id, rule, enabled - NEW rule value 'twice', no migration needed (227_needs_a_look.sql says a new rule stands at its default until set)
- NEW table order_pairs_kept: user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, first_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, second_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, PRIMARY KEY (user_id, first_id, second_id) WITHOUT ROWID; first_id < second_id so one unordered pair is one row; modelled on 227_needs_a_look.sql and 180_monthly_summary.sql
- index (existing, no new one): idx_orders_user_vendor (user_id, vendor_id, date, id) as 011_query_plan_indexes.sql and 100_order_statuses.sql define it, drives the save-time check and the account-wide pairing
- NEW API: GET /api/orders/twin?vendor=&date=&total=&titles=&reference=&exclude= beside GET /api/orders/limits; GET /api/orders?flag=possible-duplicate (list rows carry twinOf: id, reference, date, as vendor rows carry duplicateOf and duplicateName); GET /api/orders/:id carries twin; POST /api/orders/pairs and DELETE /api/orders/pairs/:first/:second (keep a pair, undo); GET /api/stats/home things.twice.count
- settings: no new column

#### How the figure is made

Two saved orders of one account are a pair when they have the same vendor_id and either (a) dates at most 3 days apart (date is a day, so this is a difference of whole days), totals equal within 0.005 (the import check's own tolerance, imports.js sameOrder), the same item_count above zero and the same shape - every line's lower(trim(title)) sorted and joined, exactly as GET /api/orders/often builds it, but over every order of the vendor, not /often's latest 1000 - or (b) the same reference compared without case and surrounding spaces, not empty and not starting with REFERENCE_PREFIX 'SPENDLY-' (the app's own numbers). Cancelled orders are left out, since they no longer count; Draft and every other status, custom ones included, count (stats' FLOW_WHERE leaves out both Cancelled and Draft, but a draft is on its way to counting, so it is still worth catching). A pair stored in order_pairs_kept is skipped. As api/src/lib/vendorLookalikes.js does for vendors, the newer order (later created_at, then id) is the one that may be saved twice and sits in one pair at most, with the oldest matching order as its partner; Home counts the distinct orders in the pairs, as vendorsIn does, so the list opens exactly that many. While typing, GET /api/orders/twin reads the candidates of one vendor within 3 days through idx_orders_user_vendor, plus that vendor's rows with the same typed reference, excludes the order being edited (as limits' exclude does) and kept pairs, and answers the nearest match; the form reads it as it reads the limits (useApi keyed on vendor, date, lines and reference), and the result never enters validate.js, so it cannot block.

#### How much history it needs

None needed. The alert needs one saved order from the same shop to compare with, and a pair needs two orders; with fewer than that nothing matches and nothing is shown, and the Home row is absent rather than zero.

#### What it must never claim

- Never say an order is a duplicate or was saved twice; say it may be saved twice, or is like one already saved. The app compares only shop, date, total, line titles and the typed order number; it does not know whether a purchase really happened twice, and no copy says 'purchase'.
- Count only what the rule finds: the Home row's number is the distinct orders in pairs, and the list opens exactly those orders. A count of zero is no row.
- The alert names what it compared - the other order's shop, total, number of lines or order number, date and reference - not what the person meant. 'the same 2 lines' is said only when the line titles matched; 'order number 48812' only when the typed reference matched.
- An order's date is a day only, often the day it was typed in; 'within 3 days' compares days and nothing finer. An order number that came in through an import counts as typed.
- The alert does not promise that Home will show the pair: that depends on the Needs a look switch and the cap of three. It says 'you can compare the two afterwards', which the chip's list always allows.
- Both are right says only what it does: the pair is not pointed out again. It changes nothing on either order, and the words never claim the orders were checked.
- Import step 3 already warns ('rows look like orders you already have', same vendor, day and total). The scan's answer carries a possible duplicate (scan.js selectPossibleDuplicate, same vendor within 14 days) but nothing in react/src reads it, so no copy claims the scan warns.

#### Decisions the build makes unless overruled

- Words: 'may be saved twice' and the chip 'Maybe saved twice', not 'duplicate' or 'typed in twice'. Duplicate is already the name of the copy action (8a, 3b), and 'typed in' is a phrasal verb. The vendor list keeps its own 'Possible duplicates' chip.
- Rank: the new rule `twice` goes after `late` and before `vendors` in LOOKS (api/src/lib/looks.js and react/src/pages/needsLook.jsx), on by default like vendors; the Settings card lists it in that place from the same list, and 10a's and 11a's rank text gains the row. A doubled order makes the month's figures wrong, so it ranks above two vendors that split one shop's statistics.
- The alert while saving renders as the limit notice does (ListItem color warning, count '!'), after any limit rows, on create and on edit alike (excluding the order itself); the commit word the form already switches is reused; it is not switchable, since it fires only on a real match and Both are right silences a pair for good. The date in it is written as the 8a notice writes one (dayShortMonth: 3 Oct, with the year when it is not this year).
- The rule's constants: 3 days, totals within 0.005, shapes compared as /often's; Cancelled left out; stored pairs skipped; the newer order is the one in one pair at most.
- Both are right is reversible, so it gets a toast 'Both orders kept.' with Undo and no dialog (6d, 6f); Undo deletes the stored row. Delete one is the existing Delete order with its 6d dialog and Undo toast, unchanged.
- A deleted order's pair row goes with it (ON DELETE CASCADE; orderTrash.js deletes the row and keeps a copy); if the delete is undone from the toast, the pair is found again and asked again.
- Under the flag, pairs are placed older then newer in the list's sort as vendorList.js places look-alikes; the newer row carries the note; the flag is never part of a saved view (like the import chip) and the facet rail has no control for it (URL only, like /categories?flag=over-limit).
- GET /api/orders/:id carries `twin` so the order page notice arrives with the order; list rows under the flag carry `twinOf` the way vendor rows carry duplicateOf and duplicateName. Both are built from the same lib (api/src/lib/orderTwins.js beside vendorLookalikes.js).
- On a phone the cards carry no note (a card has no reference line, 2i, 7a); the order page notice carries the words, with its buttons under them as the saved-order notice does.
- react/scripts/edge-account.mjs gains both kinds of pair (same lines within 3 days; same typed order number weeks apart), a near miss 4 days apart, and two orders sharing only a SPENDLY- reference, so the rule's edges are on the edge account.
- The account-wide pairing reads through idx_orders_user_vendor; if npm run queries:check flags its plan it is rewritten first, then blessed only if Home's one read is the only path.

#### Questions for Claude Design

- The brief wants Open that order on the alert while saving. Components c19 says the inline alert owns no control and has no actions of its own, while the section notices of 8a and 3a (Copied from with Discard, values need a look with Jump to first) do carry a button. May the inline alert's second line carry a text link to the other order as a state of c19, or does the alert only name it (reference and date), as proposed?
- Both are right has no drawn home: c23 rows only filter, 2e lists the row menu's six items exactly, and 1a draws no notice. Proposed: a section notice in 6f's sense (top of the content column, the 8a Copied from shape) at the top of the order page on each order of a pair, with Open that order and Both are right in its action slot, and the same Both are right item in the row menu only while the list is filtered to Maybe saved twice. Is that right, or should the action live in one of the two places only?


### 7. A place for products

Covers: picks 4, 5 and 8 of 12: things that cost more than before, where you paid least, and last time I bought this. Size: very large.

You get a Products list under Library and a page for each product: every time you bought it, what you usually paid at each shop, and the unit price by month. Built on it are two filtered lists (costs more than before, cheaper at another shop) and a Products group in the search box that opens the product page.

#### What the person sees

- Sidebar, under Library after Bookmarks: "Products" with the count "128"
- List head and foot (5a, c8): "128 products"; columns "PRODUCT", "LAST BOUGHT ↓", "LAST UNIT PRICE"; "Showing 10 of 128" and "Load more"
- A row: "Kaffe, 500 g" / "Bought 17 times" / "21/09/2026" / "49,00 kr." (at a list width of 880 or less the date column goes and the second line reads "Bought 17 times · last 21/09 at Netto", as 5k folds a vendor's)
- /products?flag=costs-more: the crumb "Costs more than before" above the list; under the row's amount: "37,00 kr. before"
- /products?flag=cheaper-elsewhere: the crumb "Cheaper at another shop"; under the row's amount: "36,00 kr. at Netto"
- Product page, rail card "Product summary" (c21: mark, name, one line of context, then label and value rows): "Kaffe, 500 g" / "Bought 17 times" / "Last" "49,00 kr. at Netto, 21/09/2026" / "Lowest" "34,00 kr. at Netto" / "Spent" "790,00 kr." / "Price change" "12,00 kr. more" with the line "Usually 37,00 kr. before, 49,00 kr. the last two times."
- Rail card "Per shop" (c1 rows): "Føtex" / "6 times" / "usually 42,00 kr." and "Netto" / "4 times" / "usually 36,00 kr."; its foot: "You bought it 6 times at Føtex, usually for 42,00 kr. At Netto it was usually 36,00 kr. That is about 6,00 kr. less. From the prices you typed in."
- Form card "The product": field "Name" "Kaffe, 500 g"; field "Also counted as this product" with the chips "kaffe 500g" and "KAFFE, 500 G", each with a remove; the help line "Other spellings of the same line. Remove one and it counts on its own again."
- Card "Unit price by month" with the meta "Last 12 months" (c14 bars); card "Every purchase": rows "Netto · SPENDLY-447" / "21/09/2026 · 2 x 49,00 kr. · retail 55,00 kr." / "98,00 kr.", then "Showing 10 of 17" and "Load more"
- Search box (c24): group "Products · 3"; row "Kaffe, 500 g" / "17 times · last 21 Sep at Netto" / "49,00"; last row "See all 3 in Products"

#### Where it lives

Products is a fourth row in the sidebar's Library group (9a lists Vendors, Categories, Bookmarks, each with a live count; AppShell.jsx sidebar() draws them as Counted rows), in the collapsed rail with icon and tooltip (9b), in More after Bookmarks on a phone (7a; More.jsx ROWS, and 'products' joins AppShell.jsx UNDER_MORE so More stays current) and as "Go to Products" in the palette's actions (9d, Palette.jsx GO). /products is the 5a list and nothing beside it, built from the parts Vendors.jsx already uses (c20 controls bar, c1 table, c8 footer, the 5k fold at 880, cards at 640 and on touch) with its own columns; a row is a link to /products/:id/edit, which is the 5c frame (vendorsCategories.jsx RecordPage: form cards, the 360px rail, the save bar) with a product's cards, route handle navKey "products", layout "split", the list with remember true. The brief's "untick per title" becomes the 5h alias chips with a remove inside the form card (VendorForm.jsx's TokensField), because that is the existing shape for "other names this record answers to", and "Merge into..." is 5j unchanged with "Merge 17 purchases" in its button. The two flagged lists are 5d's URL filters: no control on the page, a removable crumb (the Crumb inside Filters, as Categories.jsx draws them), search and sort keep working, the empty state keeps the crumb. The palette gets a Products group drawn with c24's row (name, meta, value) and search.js gains a products kind with its count; the brief's "price-over-time line" is drawn as c14 bars per month, because design/ has bars (sp-bars, sp-bars--spark) and a plot frame (sp-plot) but no line series. New in code: the products and product_titles tables, order_items.title_key, api/src/lib/products.js, api/src/routes/products.js, the list and page in react/src/pages and one migration; nothing new in design/ beyond the answers to the three questions.

#### States

- **not enough history - list.** Card with the 6a empty state: "No products yet" / "A product appears here once the same line is on two of your orders." / button "New order" (opens /orders/new). A line bought once is not listed and has no page.
- **not enough history - page.** With two purchases the page shows: the summary's "Price change" row is absent until the newest two purchases and one purchase 90 or more days before the newest exist; the "Per shop" card is absent with one shop, and its comparison sentence is absent until two shops have two purchases each in the 12 months before the newest purchase; the chart draws only the months that have a purchase and is absent when they all fall in one month. A number with nothing behind it is not drawn.
- **nothing to show - flags.** The crumb stays (5d). /products?flag=costs-more: "No product costs more than before" / "Counted from the unit prices you typed in." /products?flag=cheaper-elsewhere: "No product was cheaper at another shop" / "Counted from the unit prices you typed in." No button.
- **nothing to show - search.** "No product matches \"kaffe\"" with the button "Clear search", as Vendors.jsx.
- **loading.** Skeleton rows in the list's own shape (6b: same row height, counts as short bars, never zeros), as VendorsLoading; the page uses SummaryLoading with the rail's labels and RecentLoading's shape for the purchase rows. Load more keeps the rows it has.
- **failed.** Failed component (6b, c19 problem form; Failed.jsx titles it "<what> did not load"): "Your products did not load" / "Try again"; on the page "This product did not load" / "Try again"; a product that is gone (404) offers "Back to Products" through Failed's back prop instead.
- **switched off.** Not applicable: Products has no switch and no setting. It is in Library on every account; with no product the list shows its empty state.
- **phone.** Below 640 the list is cards as 7a's Vendors frame: "Kaffe, 500 g" / "Bought 17 times · last 21/09/2026 at Netto" / "49,00"; no search field (the phone list has none, as Vendors); Sort above the list; a flag crumb above the cards. Products is a row in More after Bookmarks and keeps More current. The page is 7a's create/edit frame: back control and title in the bar, cards in the scroll, the save bar in the tab bar's place; the rail cards stack under the form (5k: below 900). The full-screen palette (7b) row keeps the name and one meta line and drops the amount, as PaletteRow already does on a screen. No FAB: it is on Home and Orders only (9h).

#### On a phone

Below 640 (9h) the list is the 7a Vendors card list: "Kaffe, 500 g" / "Bought 17 times · last 21/09/2026 at Netto" / "49,00", no search field, Sort above the cards, a flag crumb above them (5d). Products is a row in More after Bookmarks (7a) and keeps More current. The product page is the create/edit frame of 7a with the save bar in the tab bar's place and the rail stacked under the form; the chart takes the single column. The full-screen palette (7b) shows a Products row with name and one meta line, no amount. No FAB.

#### Where a tap goes

- /products - the Products list: the sidebar row under Library, the More row on a phone, "Go to Products" in the palette
- /products?flag=costs-more - the list cut to products whose unit price rose, crumb "Costs more than before" (for any card or row elsewhere that counts them)
- /products?flag=cheaper-elsewhere - the list cut to products usually cheaper at another shop you bought from, crumb "Cheaper at another shop"
- /products?q=kaffe - the list searched (desktop), from "See all 3 in Products" in the palette
- /products/:id/edit - the product page: a list row, a palette row, the row menu's "Edit product"
- /orders/:id - a row in "Every purchase" opens its order
- Per shop rows and the chart's bars are not links: the order list has no product filter, so no link could open exactly what they count

#### What it reads

- READ orders: id, user_id, vendor_id, date (a day), status, kind, refunded. refunded is written by orders.js and decorated by decorate.js but filters nothing in api/src or react/src today: this is its first use as a filter
- READ order_items: id, order_id, position, title, quantity, price, retail. url is the line's shop link (1b, migration 225), not read here. order_items has no user_id: the triggers below reach the account through orders.user_id
- READ vendors: id, name. vendor_aliases is not needed: an alias is resolved to one vendor_id when an order is saved (lib/findOrCreate.js), so the shop names are already joined
- READ settings: page_size (Vendors.jsx and Categories.jsx read it as the Load more step). list_sort is not read, see decisions. statuses is not read: the rule is on orders.status keys, and a custom status key counts
- NEW column order_items.title_key TEXT: lower(trim(title)), the key GET /api/orders/often already groups by (orders.js selectShapes); set by NEW triggers on insert and on update of title; backfilled once by the migration
- NEW index idx_order_items_key ON order_items(title_key, order_id)
- NEW table products: id TEXT PK, user_id TEXT, name TEXT (the title as first typed), times INTEGER, last_order_id TEXT, last_date INTEGER, last_vendor_id TEXT, last_unit_price REAL, lowest_unit_price REAL, lowest_vendor_id TEXT, spent REAL, old_price REAL, new_price REAL (both NULL when no comparison), usual_vendor_id TEXT, usual_price REAL, cheapest_vendor_id TEXT, cheapest_price REAL (NULL when none), stale INTEGER; indexes (user_id, times, last_date) and (user_id, name COLLATE NOCASE)
- NEW table product_titles: user_id TEXT, key TEXT, product_id TEXT NULL, UNIQUE (user_id, key); index (product_id)
- NEW triggers: after insert, update and delete on order_items, and after update of status, kind, refunded, date, vendor_id and after delete on orders (the column list migration 170's orders_revision_update already uses): INSERT OR IGNORE the key into product_titles with the user_id read from orders, and set products.stale = 1 for the key's product. demoData.js inserts lines directly (insertOrderItem), so the triggers, not the route, carry this
- NEW api/src/lib/products.js: refresh(userId) creates a product for every key with product_id NULL and recomputes stale rows in JS (medians); productPage() and productRecord() read stored columns only. NEW api/src/routes/products.js: GET /api/products (page, pageSize, q, sort, flag), GET and PATCH /api/products/:id (name, titles), POST /api/products/:id/merge. search.js gains products (up to 8, matched by name or any key) and counts.products
- NEW migration api/src/migrations/230_products.sql (the runner applies files by name, db.js; 227 is the newest today); api/scripts/check-queries.mjs REQUESTS gains /products, the two flags and a product page so the new statements are captured, then api/query-plans.json is re-blessed after review

#### How the figure is made

A line's key is lower(trim(title)), stored on the line as title_key by a trigger and backfilled once: the same key GET /api/orders/often groups by, so the two features agree on what "the same line" is; product_titles maps each key of an account to one product, a new key gets its own product row (name = the title as first typed) when the list or a page is next read, and a product is listed once its times is 2 or more. A purchase is one order, counted once however many of its lines are in the group, whose status is not Draft, Cancelled or Returned (FLOW_WHERE.expenses in lib/stats.js, which filters no kind), whose kind is not Sold and whose refunded is 0; its unit price is the group's price x quantity summed and divided by the quantity summed, its retail the same when every such line has one, its shop the order's vendor_id. Costs more: new = median unit price of the two newest purchases, old = median of the purchases dated 90 or more days before the newest purchase's date (at least one); listed when new is more than 5 percent above old, and when every purchase on both sides has a retail price only if the retail medians rise by the same rule, so a sale ending is not a rise. Cheaper elsewhere: over the 12 months before the newest purchase, the median unit price per shop for shops with 2 or more purchases; the usual shop is the one with most purchases (ties: the most recent); listed when at least two shops qualify and the usual shop's median is above the lowest, the difference being the two medians' gap. The chart is the median unit price per calendar month over the 12 months up to the newest purchase, drawn with c14 bars as Spend by month is. These figures are stored on the product row and recomputed in JS (lib/products.js) only for rows a trigger marked stale, so no visit groups an account's lines again (check-queries.mjs flags a temp B-tree sort, which that GROUP BY would be); the windows are anchored on the newest purchase, not today, so a stored figure does not go stale with the calendar.

#### How much history it needs

A product exists after two counted purchases of one key; with one it is not listed, has no page and is not in the search box's Products group. "Costs more" needs the two newest purchases plus at least one purchase dated 90 or more days before the newest; with less the summary has no "Price change" row and the product is not in /products?flag=costs-more. "Cheaper elsewhere" needs two shops with two or more purchases each in the 12 months before the newest purchase; with less the Per shop card lists the shops without the comparison sentence (and is absent with one shop) and the product is not in /products?flag=cheaper-elsewhere. The unit price by month chart draws the months that have a purchase and leaves the others empty; with every purchase in one month it is absent.

#### What it must never claim

- Never the word "Saved" and never green ink for a difference between shops or over time: nothing was saved. The words are "more" and "less", in plain ink, under the amount they belong to.
- A price change is amounts: before, now and the difference. The 5 percent is the listing rule and is not shown; no percent appears on a product (a percentage is for a limit, design/CLAUDE.md).
- Every figure is from the lines the person typed in. Where a figure is a median the copy says "usually" and "about", never "each time", and the Per shop foot says "From the prices you typed in." once.
- A shop is named only when the person bought there. Nothing claims a price at a shop they did not buy from.
- "Last" is the order's date, a day the person typed in: no time of day, no "today at 14:02", never "you were at Netto".
- "Bought 17 times" counts orders, not pieces: a line with 2 x is one time. The purchase row shows "2 x 49,00 kr." so the count and the pieces are both visible.
- Draft, Cancelled, Returned, Sold and refunded orders are left out, so a product's count can be lower than the order list finds for the same text; the page lists only the purchases it counts, so the count on the row is the count on the page.
- The grouping is a guess by spelling. The copy says "counted as this product", never "the same product", and the chips name the spellings so the person can see the guess.
- The sidebar count is the count of the list: products bought two or more times, nothing else.

#### Decisions the build makes unless overruled

- Products is the fourth Library row after Bookmarks in the sidebar (9a), a Counted row with the live count from GET /api/products?pageSize=1 (nothing until it arrives, never a zero, 9e), in the collapsed rail with icon and tooltip (9b), in More after Bookmarks (7a), and as "Go to Products" after "Go to Bookmarks" in the palette's actions (9d, Palette.jsx GO). Icon: Tabler "package", added to react/src/components/icons.js (it holds "shopping-bag" today, not "package").
- The list is 5a as Vendors.jsx builds it: c20 controls bar with search (desktop only) and Sort; no Active/Archived segmented (a product is never archived) and no create button (a product is never typed in, it comes from the lines). Columns PRODUCT / LAST BOUGHT / LAST UNIT PRICE, the sorted column carrying its arrow as 5a's SPEND ↓ does; second line "Bought 17 times"; at 880 the date folds into it as "last 21/09 at Netto" (5k); cards at 640 and on touch (2i, 7a).
- Sorts: Last bought ↓ (the list opens on it), Times bought ↓, Last unit price ↓, Last unit price ↑, Name A - Z. Settings' "Sort vendors and categories by" (11a, Lists) is not read: its copy names vendors and categories, and its values (name, spend, saved) have no meaning for a product apart from name. Paging by page_size with Load more (c8).
- The row mark is the c2 identity mark with initials from the name and the colour colourFor(name, VENDOR_PALETTE) gives (api/src/lib/palette.js), computed and never stored or picked, never a line photo: one mark per list, as 5a and 5b keep the vendor's mark initials with or without an image.
- Row menu (5a shape): "Edit product" and "Merge into..." (popover with a searched target list, then the 5j dialog with "Merge 17 purchases" in the button). No "Open in the order list" (the order list has no product filter, so it could not open exactly what the row counts), no Archive, no Delete. Both actions also live on the page (5d: nothing lives only in the menu).
- The product page is the 5c frame (RecordPage): form cards THE PRODUCT (Name; "Also counted as this product" chips with remove, the 5h alias field), UNIT PRICE BY MONTH (c14 bars as Spend by month; a column with no drill-in is a span, the state components.css documents and 4a's notes use), EVERY PURCHASE (c1 rows at page_size with Load more; a row opens its order). Rail: PRODUCT SUMMARY (c21), PER SHOP (c1 rows, not links), COUNTED AS ONE (the 5f REMOVING IT card with Merge... only). Three rail cards, the 5c ceiling. Dirty tracking per field; Save returns to the list (5c); leaving while dirty prompts.
- Flag lists follow 5d: no control on the page, a removable crumb "Costs more than before" / "Cheaper at another shop" in the Filters row, search and sort keep working, the empty state keeps the crumb. With a flag the amount cell's second line states the comparison ("37,00 kr. before" / "36,00 kr. at Netto"); without one the cell is the last unit price alone.
- Dates: the list and the page use the short numeric date (dayMonth and shortDate, as 5k and 5c); the palette row uses dayShortMonth ("21 Sep") as its order rows do.
- Which orders count: status not Draft, Cancelled or Returned (FLOW_WHERE.expenses), kind not Sold, refunded 0; custom statuses count. This is the first place refunded filters anything and the first place a kind is left out; both are stated in the brief so the rule is set once.
- The key is lower(trim(title)), exactly /often's; spellings that differ by more than case or outer spaces are separate products until merged by hand (5j), and the merged product's spellings show as chips. Removing a chip makes that spelling its own product again when it has two purchases, else it leaves the list.
- Windows are anchored on the newest purchase, figures are stored on the product row, a trigger marks rows stale and lib/products.js recomputes only those on read: no GROUP BY over an account's lines per visit. The new routes are added to check-queries.mjs REQUESTS and the new statements blessed in query-plans.json after review.
- A price difference is amounts only; the 5 percent is a listing rule. "Cheaper elsewhere" compares the usual shop (most purchases) with the lowest median, in a three-sentence foot with "usually" and "about".
- Search: a product is found by its name or any spelling in its group, the vendorIdsMatching shape over product_titles; a row matched on another spelling shows " - matched kaffe 500g" in muted 12px as 9d does for an alias. "See all N in Products" opens /products?q=... on desktop only, as Palette.jsx does for Vendors.
- Palette placement until Claude Design answers question 1: a Products group between Vendors and Items, at most three rows plus "See all N in Products"; the Items group is unchanged, including its "See the orders with these N items" row.
- react/scripts/edge-account.mjs gains the cases this needs beside its existing Returned and Refunded orders: one title bought four times at two shops with a rise and a retail price on both sides, one bought once, one on a Sold order, one spelled two ways; a case found later is added in the change that handles it.

#### Questions for Claude Design

- c24 and 9d fix the palette's group order as Orders, Vendors, Items. Where does a Products group sit, and does an Items row still appear for a title that belongs to a product? The same text would then show twice and open two different places (the order, the product page).
- Order editing layouts 1a and 1b call a line's shop link "Product link" and its field "Product page" (it opens the shop's web page in a new tab). The app now has its own product page at /products/:id/edit. Which of the two is renamed, so one word does not mean two things?
- The brief asks for a price-over-time line. design/ has bars only: c14 holds sp-bars (with sp-bars--spark, a 56px bar sparkline inside a stat) and sp-shares, and sp-plot holds an axis, gridlines and a dashed limit line, but no line series; COMPONENT-STATUS.md lists "sparkline" under c14 as Draft. The build draws c14 bars, one per month. Is a line series a new c14 state worth adding, or do the bars stand?


### 8. Payments that repeat every month

Covers: pick 6 of 12. Size: large.

Statistics gets a card called "Every month" that lists the shops where an order comes about once a month, around the same day and at about the same amount, three months in a row or more. The person says "Yes, every month" or "Not a repeat" for each; a confirmed one shows a "Repeats" line on its orders, and a hidden one stays away until the person shows it again.

#### What the person sees

- Card title: "Every month" · header meta: "last 12 months · orders only" (with more than 9 rows the meta reads "last 12 months · top 8 of 12", as Top vendors reads "top 8 of 10")
- Row: "Telia" · "about 299 kr." · pill "Not confirmed" · meta line under: "around the 3rd · next time probably 3 November"
- Row (confirmed, no pill): "Fitness World" · "about 249 kr." · "around the 1st · next time probably 1 November"
- Row where the expected day has passed: "Netflix" · "about 99 kr." · pill "Not confirmed" · "around the 2nd · no order for October yet"
- Row menu (c9, the dots button at the row's end): "Yes, every month" / "Not a repeat" / rule / "Open in the order list"; on a confirmed row: "Not a repeat" / "Open in the order list"; on a hidden row: "Show again" / "Open in the order list"
- Footer: "Show 2 hidden" (absent when nothing is hidden); with more than 9 rows also the row "Other 4 vendors" · "about 1.240 kr." and the button "Show top 10 of 12 vendors" (or "Show all 12 vendors" when 12 is at most Rows per page)
- Hidden view: header meta "2 hidden", the hidden rows with their menu, footer button "Show the list again"
- Toast with Undo (6d, c18): "Telia is marked as every month." / "Telia is hidden." / "Telia is shown again."
- Empty, under the title in the small grey type: "Nothing repeats every month in your orders yet. A payment shows here after 3 orders in 3 months in a row, at about the same amount and around the same day of the month. A fixed cost that is only in the budget is not counted."
- Order read view (1a), Order details, one row only when the order is in a confirmed repeat: "Repeats" · "About every month, around the 3rd"

#### Where it lives

Statistics 4a at rest. The lower grid in react/src/pages/Statistics.jsx arrange() is Halves: a left stack holding Top vendors then Spend vs saving, and Monthly limit as the right half, so there is no empty slot "beside" Top vendors; the card goes under Top vendors in that left stack, before Spend vs saving, and in the stacked and touch orders it follows Top vendors (7b's Statistics frame is one column: Spend by month, then Top vendors as touch rows, then the slice card). It reuses VendorsCard's shape: Card with sp-section-label and sp-meta head, Ranked rows (sp-data name, sp-amount, Gauge, thin on touch), moreFooter and ShowAll for the 4d cap, with two named additions: a meta line under the name (the c1 subtitle, sp-subtitle) and the c9 row menu at the row's end, the RowMenu of react/src/pages/vendorsCategories.jsx that the category list rows carry (5d), at the in-card width c9 fixes (214px, labels never wrap); on touch Menu (react/src/components/Overlays.jsx) already hosts a floating menu in the c13 Sheet with the same items and no title, as the order list's row menu does (OrderMenu.jsx), so the card imports nothing from Touch.jsx. Rows with a menu are not wrapped in Pick (a button cannot hold a button), as they open nothing. The brief names the read view as 1b, but in design/Order editing layouts.dc.html 1b is "Desktop - edit an item in place"; the read view is 1a, and the line is a c21 Summary row (Sum in react/src/components/Data.jsx) in the Order details card (Order.jsx, the sums stack), label "Repeats", on desktop and inside the folded details on a phone, the fold's summary line unchanged. The card is absent inside any crumb (4b: the drilled layout is the chart, one breakdown and the orders; Top vendors can be that one breakdown, this card never is) and under Refunds only (4e, as Monthly limit is at Statistics.jsx line 483). New code: api/src/lib/repeats.js, three handlers in api/src/routes/stats.js under /repeats, migration api/src/migrations/228_monthly_repeats.sql, the RepeatsCard in Statistics.jsx, a `repeat` field set in getDecoratedOrder (api/src/lib/decorate.js, decorateOrder's one caller), and two lines in mergeVendors (api/src/routes/vendors.js).

#### States

- **not enough history.** The card stays, like Monthly limit with no limits (4a; Statistics.jsx: "No category has a monthly limit yet. Give one a limit, and this card shows how close you are." under the title in sp-meta). Under the title, in sp-meta: "Nothing repeats every month in your orders yet. A payment shows here after 3 orders in 3 months in a row, at about the same amount and around the same day of the month. A fixed cost that is only in the budget is not counted." No rows, no footer.
- **nothing to show.** Same text when there are orders but no run matches. When every run found is hidden: "Every repeat found is hidden." under the title, and the footer "Show 2 hidden". The page-level empty state (no orders in the period: "No orders in October", or "No orders yet" with no orders at all) replaces every card, this one included.
- **loading.** Skeleton (6b): the card with its head, 3 skeleton rows in the Ranked skeleton shape (Ranked's rows prop; name bar, amount bar, gauge at 0), the footer button held as buttonHold holds Top vendors' button. Counts and amounts are bars, never zeros. The real row count is not known before the window answers, so 3 is the resting hold.
- **failed.** Failed variant="card" (6b, c19), label "Every month", what "The repeating payments", so the red alert reads "The repeating payments did not load" with Failed's own reason line ("Check your connection, then try again." or "Spendly had a problem. Try again.") and Try again in the footer; the card keeps its full height and nothing below it moves.
- **switched off.** No switch exists and nothing is added to Settings 11a (its eleven panes stay eleven). The card is absent under Refunds only (4e) and inside any crumb (4b); period changes do not change it, and its meta says why ("last 12 months").
- **phone.** 7a/7b Statistics, one column: the card follows Top vendors. Rows take the touch Ranked shape (Sum named: name left, amount right, thin gauge) with the meta line under them wrapping rather than cutting the date (as 1a's items header wraps on a phone). No floating menu: the row's dots button opens the c13 sheet Menu already draws on touch, the same items as rows, no title, dismissed by dragging down or pressing the dimmed page. Pill, empty text and footer as on desktop.

#### On a phone

One column after Top vendors on the Statistics tab; touch rows (name, amount, thin gauge, meta line under); the row menu is the c13 sheet Menu gives on touch; 44px targets on the row's dots button and the sheet's items; "Show 2 hidden" and the 4d footer button are the same compact outline buttons as on desktop, stacked in the footer on touch as Monthly limit stacks its two.

#### Where a tap goes

- /statistics - the Every month card, at rest only (no crumbs; lens Expenses only or Net of refunds)
- /orders?vendor=<id> - "Open in the order list": the shop's orders, the same route the read view's vendor name uses (1a, Order.jsx)
- /orders/:id - the read view; the "Repeats" row in Order details when the order is in a confirmed repeat
- GET /api/stats/repeats - { repeats: [{ vendor: { id, name, initials, colour }, day, amount, last, next, state }], hidden: [same shape] }
- PUT /api/stats/repeats - body { vendorId, day, state: 'confirmed' | 'hidden' }; 204
- DELETE /api/stats/repeats/:vendorId/:day - back to found ("Show again", and Undo after a confirm or a hide); 204
- GET /api/orders/:id - gains repeat: { day } | null

#### What it reads

- orders (read): user_id, vendor_id, date (a day, unix seconds at 00:00 UTC), status, kind, total; idx_orders_user_date (user_id, date, id) serves the one window read, as it serves totalsOver
- vendors (read): id, name, initials, colour for the row's name and the menu's label
- settings (read): page_size, the P of the 4d cap, via usePageSize as useShown() already reads it (never fewer than 10)
- FLOW_WHERE.expenses in api/src/lib/stats.js (read): status NOT IN ('Returned', 'Cancelled', 'Draft') decides which orders count; a custom status counts, as it counts in every Statistics figure; FLOW_WHERE filters no kind
- NEW table monthly_repeats (migration 228_monthly_repeats.sql): user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31), state TEXT NOT NULL CHECK (state IN ('confirmed', 'hidden')), PRIMARY KEY (user_id, vendor_id, day) WITHOUT ROWID, the shape of home_attention_rules (227); foreign keys are on (api/src/db.js). No amount column: nothing on screen reads it (see decisions)
- NEW response field on GET /api/orders/:id: repeat: { day } | null, set in getDecoratedOrder
- api/query-plans.json: one new statement (the window read grouped in code) to review with npm run queries:check and bless

#### How the figure is made

One statement reads the account's orders dated from the first day of the month 11 months before this one up to today: vendor_id, date and total, where the status is what the Expenses lens counts (FLOW_WHERE.expenses: not Returned, Cancelled or Draft; a custom status counts) and total is above 0; every kind counts, as Top vendors counts them. It is the user_id plus date range shape totalsOver already runs, so no new index. The rows are grouped by vendor in code, and a vendor with more than 24 orders in the window is skipped as a shop with many orders a month. For each remaining vendor and each day of month 1 to 31, take the orders within 3 days of that day on the ring of the month (the 30th and the 2nd are 3 apart), keep one per calendar month (the nearest), find the longest run of consecutive months, take the median of the run's totals, drop orders more than 10 percent from it, and keep the run when 3 or more consecutive months remain and the run reaches this month or last month; the day with the longest run wins, the larger median on a tie, so a vendor has at most one run. The row shows the median day of the run as "around the 3rd", the median amount rounded to whole kroner as "about 299 kr.", and the next date as that day in the month after the last order, clamped to that month's last day; a next date before today reads "no order for October yet". monthly_repeats rows join a run by vendor and day within 3: a hidden row moves the run to the hidden view, a confirmed row removes the "Not confirmed" pill, a stored row with no run is kept and shows nothing. getDecoratedOrder runs the same code for the order's vendor only and sets repeat when the order is in a confirmed run.

#### How much history it needs

A row needs 3 orders in 3 consecutive months, so about two months and a few days of orders is the floor; an account younger than that, or with no run yet, shows the card with its empty text and never a row. The window is the last 12 months (this month and the 11 before): an older run is not seen, and a run whose last order is before last month is dropped as stopped rather than shown with a date long past. A yearly repeat would need 2 years of orders and is not looked for at all.

#### What it must never claim

- A found row never states "every month" as a fact: the pill "Not confirmed" stays until the person answers, and the words are "about", "around" and "probably".
- Only orders count, and only orders someone typed in. The header meta says "orders only" and the empty text names the budget, because the card knows nothing about budget rows, bank statements or payment methods.
- A payment that has not appeared reads "no order for October yet", never "missed", "late" or "stopped": the app cannot tell an unpaid bill from an order nobody has typed yet.
- No yearly repeat, ever: it is not looked for, and no line says "every year".
- The amount is "about" the median of the run, never the last order's price shown as the price.
- The "Repeats" row on an order shows only for a confirmed run that the order is in, and goes when the run breaks or the repeat is hidden.
- No total of fixed costs in the footer: a sum over the rows would read as the person's monthly fixed costs, which the app does not know. The Other row the 4d cap requires carries its count and the sum of its rows' about-amounts, marked "about" like every row.
- No count such as "3 times" on a row, because nothing can open exactly those orders (a link opens what it counts); "Open in the order list" opens the shop's orders and is labelled as the shop's.
- No percentage anywhere on the card.
- A custom status counts as the Expenses lens counts it in every other Statistics figure; the card does not know whether a custom status means money out.

#### Decisions the build makes unless overruled

- Window and lens: the card reads the last 12 months whatever the period, and names it in its meta, as 4a draws Spend vs saving with "last 8 months" (the app's Spend vs saving names the period instead; this card's meta is fixed); absent inside a crumb (4b) and under Refunds only (4e, as Monthly limit).
- Which orders count: FLOW_WHERE.expenses statuses (custom statuses included, as in every Statistics figure), every kind, total above 0.
- "Many orders a month": more than 24 orders in the 12-month window skips the shop.
- Match rules: within 3 days on the ring of the month, one order per calendar month, 3 or more consecutive months, amounts within 10 percent of the run's median, and the run must reach this month or last month; one run per vendor.
- Day and amount shown: the run's median day as an English ordinal ("around the 3rd", "around the 31st"); the median amount rounded to whole kroner ("about 1.299 kr."); the next date clamped to the month's last day, so a 31st repeat reads "next time probably 30 November"; a month name in running text follows the language (4a).
- Ranking and cap (4d): by amount, highest first; rests at 8 rows, then "Other N vendors" with the sum of their about-amounts, then "Show top P of N vendors" / "Show all N vendors" (ShowAll); the Other row is inert; opened state is not kept across a reload.
- Rows are not drill targets: the row opens nothing and is not a Pick button; the c9 menu at its end holds the actions, in-card width 214px, labels never wrap; on touch Menu's own c13 sheet.
- Found rows carry the default (neutral) c6 pill "Not confirmed" after the amount, display only; confirmed rows carry none.
- Hidden repeats live in the card: footer "Show 2 hidden" swaps the rows for the hidden ones in place (4d's swap pattern), their menu offers "Show again", and "Show the list again" returns; the button is absent at 0. Two footer buttons follow Monthly limit, whose footer already holds Edit on category and Show top P (footerLayout fill, stack on touch).
- Confirm, hide and show again are reversible, so each gives a toast with Undo (6d, c18) and no dialog; Undo calls the DELETE or the PUT that restores the previous state.
- The read view line is a c21 row labelled "Repeats" with the value "About every month, around the 3rd", plain text, no link; the phone's folded summary line ("Decor · Expense · SPENDLY-447") is unchanged.
- Empty state: the card stays with its text under the title (Statistics' Monthly limit pattern), not absent as Home's rule would have it, because 4a keeps every resting card in place.
- The brief's `amount` column is not stored: nothing on screen reads it and the shown amount is always the current median; a stored row keys on vendor and day only.
- A vendor merge (5j) moves monthly_repeats rows to the surviving vendor before the source is deleted (mergeVendors in api/src/routes/vendors.js; INSERT OR IGNORE then delete, so a duplicate day is dropped); deleting a vendor (only possible with no orders) cascades its rows.
- Loading holds 3 skeleton rows, since the row count is unknown before the window answers.
- react/scripts/edge-account.mjs gains the cases: a 3-month run around the 3rd, a run on the 31st, a 2-month near miss, a shop with 30 orders in 12 months, a run with one amount 20 percent off, and one hidden repeat; the demo data generates no deliberate repeat (demoFill.js has no cadence), so the demo account is expected to show the empty text and this is checked at build time.
- The one new statement is reviewed with npm run queries:check and blessed if its plan uses idx_orders_user_date; no index is added for this feature.

#### Questions for Claude Design

- 4a opens with "Every chart element is a filter" and 4b removes a card that cannot express a crumb. The Every month rows cannot be crumbs (a repeat is not a filter the other cards can show) and instead carry a c9 row menu and a c1 subtitle line, which no Statistics card has today. Can a 4a card have rows that are not drill targets, with a meta line under the name and a row menu at the row's end, and will Claude Design draw the card in 4a (under Top vendors, left stack) and in the 7b Statistics frame?
- Hidden repeats need a way back and no page owns it. The closest patterns are Bookmarks' Archived filter (22a) and 4d's in-card swap; the proposal is a footer button "Show 2 hidden" that swaps the card's rows in place. Is that acceptable, or should hidden repeats live in Settings 11a, which today has eleven fixed panes and none for Statistics? The answer changes where the person can act.
- 1d says anything new in the rail has to displace something, not extend it, and 1a shares that grid. The "Repeats" row adds one line to Order details. Accept the one line in the rail, or carry it in the items header's meta beside the vendor and date ("Telia · 03/10/2026") instead?

Depends on: settings.page_size (Rows per page) for the 4d cap, read through useShown() in Statistics.jsx; FLOW_WHERE in api/src/lib/stats.js; RowMenu in react/src/pages/vendorsCategories.jsx and Menu's touch sheet in react/src/components/Overlays.jsx; Ranked, VendorsCard, moreFooter and ShowAll in react/src/pages/Statistics.jsx; getDecoratedOrder and decorateOrder in api/src/lib/decorate.js; mergeVendors in api/src/routes/vendors.js; Failed (variant card) in react/src/components/Failed.jsx, Pill in react/src/components/Pill.jsx, Sum in react/src/components/Data.jsx.


### 9. Write one sentence, get a draft order

Covers: pick 10 of 12. Size: large.

You write what you bought in one sentence, such as "milk 12 kr. and bread 30 kr. at Netto yesterday", and press Make the order. The order opens unsaved in the edit screen with the vendor, the date and the lines filled in from your words, and nothing is saved until you press Create.

#### What the person sees

- Step 1, under the receipt zone: label "Or write what you bought"; empty field showing the placeholder "milk 12 kr. and bread 30 kr. at Netto yesterday"; help line "The vendor, date and lines are taken from what you write. You check everything before it is saved."; button "Make the order".
- Step 2 card: "milk 12 kr. and bread 30 kr. at Netto yesterday" in the title slot, the gauge, then "Reading what you wrote...", then "Vendor and date found" (only when both were written), then "2 lines found", and the button "Cancel".
- Step 3, when every price was written and Netto matched: no amber bar. "Lines found · 2" / "Untick a line to leave it out" / "Milk" "1 x 12,00 kr." "12,00 kr." / "Bread" "1 x 30,00 kr." "30,00 kr." / "+ Add a line you did not write".
- Step 3, when the sentence was "milk 12 kr. and bread at Netto yesterday": amber bar "1 value needs a look." / "1 line has no price. Fill it in, or untick it to leave it out." / button "Jump to first"; the Bread row reads "price not said - fill it in" in amber, then "1 x", an empty amount field with "0,00" as placeholder and "kr." after it.
- Order details: "Vendor" "Netto" with the green note "matched existing vendor"; "Date" "05/10/2026"; "Status" and "Kind" at the account's defaults; "Categories" "Dagligvarer" with the quiet line "Filled from Netto. Remove any that do not fit."
- When the shop written has no record: the note "new vendor, created on save" under the Vendor field, the existing row "Want to add its details now?" with the button "Set it up first", and the bar counts it as a receipt's new vendor does today: "1 value needs a look." / "The vendor is new and will be created."
- When no shop was written: the Vendor field empty with the amber note "not written - pick one", and the bar counts it: "1 value needs a look." / "The vendor was not written." Create with it still empty shows the existing "Vendor is required."
- When no day was written: "Date" "06/10/2026" with the quiet note "not written - today is filled in".
- Totals card: "Totals" / "Order total" "42,00 kr." and nothing else. Footer: "Nothing saved yet" / "Discard" / "Create", and under it "Save as draft".
- After Create: green bar "Order created." with "Undo". After Save as draft: "Saved as a draft." with "Undo".
- Without the reading service: the label, field, help line and button are not there; step 1 shows the receipt zone (with its "you type in the details" wording), Empty order and Copy an order as drawn today.

#### Where it lives

Order create 3a step 1, the Start screen in react/src/pages/OrderNew.jsx: a fourth way to start, under the receipt zone and above the "or" divider, built from c3 TextField in its multiline state (react/src/components/Inputs.jsx, multiline with rows; the React components page draws it at rows 3, the build passes rows 2), the c3 help line and a c6 primary button, shown only when getCurrentUser().scanAiEnabled is true, the flag that already rewords the zone and Home's capture card. The button stores the words and moves to /orders/new?source=text&key=<id>, which OrderNew.jsx answers as it answers ?source=scan&doc=: the existing Reading card (3a step 2, no file, so no preview tile and no "Usually 5 - 10 seconds" line) and then OrderForm in its unsaved state (3a step 3) with origin { scan: answer } and answer.file null. OrderForm reads scan.file in the receipt card, the Created notice and the Undo route, so each of those takes a no-file branch: the receipt card, the attach-on-save step and the receipt-only words fall away, while the ticks, the confidence tones, Jump to first, Discard / Create and Save as draft stay. On the server the routes sit in api/src/routes/scan.js beside the document routes and share readOnce, draftOf, startingValues, selectPossibleDuplicate and findVendorIdForReceipt; the reader is a parseSentence beside parseReceipt in api/src/lib/scanParse.js. The phone FAB (9h, 7a) opens step 1, so the field is there too, and the review is the 7b phone review. Home's capture card (10a) stays as drawn until the question below is answered; the rule that only New order shows step 1 holds either way, since the field would go straight to step 2 as the drop zone does. The palette (9d) gains no action: words typed there are a search.

#### States

- **not enough history.** Absent. The field shows from the first order on. A shop name no record has is new and created on save; with no default categories to fill from, the Categories field stays empty and carries no line.
- **nothing to show.** Make the order pressed with an empty field: the field takes the c3 danger message "Write what you bought first." and nothing is sent. The reading finds no item at all: back to step 1 with the words kept in the field and the danger message "No items were found in what you wrote. Name each item, like: milk 12 kr."
- **loading.** Step 2 card with the first words of the sentence in the title slot, no preview tile, the gauge, "Reading what you wrote...", then "Vendor and date found" (only when both were written, as the progress row already works) and "2 lines found" as they arrive, and Cancel. No "Usually 5 - 10 seconds. You can keep working." line until a text read has been measured. Past 20 seconds the existing row "Reading is taking longer than usual" appears without its second line, since leaving does not file a draft here.
- **failed.** The step 2 card is replaced by the 6e card, in the c19 problem tone: "Could not read what you wrote" / "Nothing was made from it. The words are kept." with the buttons "Try again" (step 1 with the words back in the field), "Empty order" (an empty order, unsaved) and "Discard" (back to step 1, the words deleted). On a billing refusal the body is the existing sentence "The reading service is not available right now: it reports a problem with its payment." A refusal from the server when the words are sent (such as "Confirm your email first. Then you can scan receipts and import orders.") is shown as the c3 danger message under the field, in the server's own words, as the zone shows its refusals in its alert.
- **switched off.** No ANTHROPIC_API_KEY (scanAiEnabled false): the label, field, help line and button are absent from step 1, never disabled. A link /orders/new?source=text&key=... that no row answers (never made, or swept after 24 hours) shows the existing alert pattern: "This order could not be opened." with "Start again" to /orders/new.
- **line without a price.** The row keeps the amber tone "price unclear" has today: subtitle "price not said - fill it in", the inline price field empty with 0,00 as placeholder and kr. after it, counted in "N values need a look" and reached by Jump to first. Create with it still empty stops on that line with the existing "What did you pay?". Save as draft stores 0,00 kr. for it, as a draft from a scan does today.
- **price unclear.** One amount after two items ("milk and bread 42 kr."): the last item gets the amount, marked uncertain with the amber subtitle "price unclear - check what you wrote".
- **vendor or day not written.** No shop: the Vendor field empty with the amber note "not written - pick one", counted in the bar. No day: today, with the quiet note "not written - today is filled in", not counted.
- **phone.** Below 640px the field is full width under the zone and the button full width under the field; the FAB on Home and Orders opens step 1, so the way in is there. Step 3 is the 7b "Check the reading" review without the receipt row, the missing-price line reading "price not said - fill it in" and opening in the line sheet to type the price, Create in the save bar and the tab bar away while the task is open.

#### On a phone

The FAB (9h, 7a) opens 3a step 1 on Home and Orders, so the field is reachable from both: full width under the receipt zone, the button full width beneath it, and Enter in the field presses it. Steps 2 and 3 are the phone frames: the review is 7b's "Check the reading" with ticks and "untick to skip", without the receipt row; the missing-price line reads "price not said - fill it in" and is typed in the line sheet, since the phone row has no inline field; Create sits in the save bar and the tab bar is absent while the task is open. Phone Home has no capture card, so nothing is added there.

#### Where a tap goes

- /orders/new - step 1, the field and Make the order
- /orders/new?source=text&key=<id> - step 2 while it reads, then step 3 unsaved; a reload lands back here
- /orders/:id - the created order, after Create or Save as draft
- /orders/new - after Discard on step 3, or Cancel on step 2 (the stored words are deleted); Try again after a failure goes here with the words back in the field
- /orders/new?source=text&key=<id> - Undo on the created notice deletes the order and returns to the review
- /orders/new?source=empty - Empty order on the failed card
- /vendors/new - Set it up first, as a scan's new vendor offers today (5b), returning to the review with the vendor chosen

#### What it reads

- settings: default_status, default_kind read; scan_overrides read by the shared startingValues but never applied, since a sentence has no document type
- vendors: id, name; vendor_aliases: vendor_id, name (resolveVendor in api/src/lib/findOrCreate.js: exact name, then alias, then compared as vendor keys)
- vendor_default_categories: read through GET /api/vendors?name= (defaultCategories) by OrderForm's existing vendor seeding (5l)
- orders: id, vendor_id, date, item_count, total (the existing possible-duplicate lookup, selectPossibleDuplicate: same vendor within 14 days either side)
- NEW table order_text_drafts: id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, read_json TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), expires_at INTEGER NOT NULL. A new migration file; rows swept hourly by the same timer as scan_uploads (scheduleUploadCleanup).
- NEW routes in api/src/routes/scan.js: POST /api/scan/text { text } -> 201 { key } (requireConfirmed, as POST /documents); GET /api/scan/text/:key?progress=stream -> NDJSON { progress } lines then { draft }, the shape GET /draft/:key answers; DELETE /api/scan/text/:key
- NEW reader: parseSentence(text, today, onProgress) in api/src/lib/scanParse.js with a read_sentence tool; NEW line value unclearPart 'price-missing' in the draft answer, and a NEW check id 'vendor-missing' in checks when no shop was written
- No new setting. No new column on orders, order_items or scan_uploads.

#### How the figure is made

POST /api/scan/text stores the trimmed sentence (500 characters at most) in order_text_drafts and answers the key; GET /api/scan/text/:key?progress=stream reads it once through parseSentence(text, req.today): the same Anthropic client and forced tool call as parseReceipt, with a read_sentence tool asking for vendor (optional), date as YYYY-MM-DD resolved from words like "yesterday" against req.today (the reader's own day, from the X-Spendly-Today header the client already sends on the draft call), and lines with title, quantity (1 when not said), price (optional) and uncertain, and no total, VAT, website, CVR or document type. Its normalise differs from parseReceipt's in two places: a missing vendor does not void the answer, and a line with no price is kept as price null with unclearPart 'price-missing' instead of being dropped; a title gets a capital first letter and is otherwise as written. The answer is built by the existing draftOf given a row with no file: findVendorIdForReceipt on the name alone, startingValues from settings.default_status and default_kind only (FROM_DOCUMENT finds nothing without a documentType, so scan_overrides never applies), selectPossibleDuplicate, lines with ids; file, total and the total and VAT checks are null or absent, checks holds the vendor check (or 'vendor-missing'), and reconciled is not set. readOnce's one-reading-per-key, the progress stream { found, lines } and the read_json cache on the row are reused, so a reload of step 2 or 3 never reads twice, and only an answer with at least one line is kept. In OrderForm, 'price-missing' draws the inline price field and amber tone that 'price' already has, with its own subtitle, counts in "N values need a look" and is reached by Jump to first; notices() drops "no printed total was found" when scan.file is null; Create keeps the existing "What did you pay?" rule and Save as draft keeps fillDraftGaps (0 for a missing price). The new table is read by primary key with user_id, so npm run queries:check has no scan to judge.

#### How much history it needs

None needed: it works from the first order. With no matching vendor the vendor is new and created on save; with no default categories the Categories field stays empty; nothing is hidden for a new account, unlike Copy an order.

#### What it must never claim

- Never say "read clearly" on a line from a sentence: the words are what the person typed, not a document that was checked. A line shows its plain meta ("1 x 12,00 kr."), and amber words only where a price is missing or unclear.
- Never append "Everything else matched cleanly." to the bar: there is nothing it was matched against.
- Never claim a reading time ("Usually 5 - 10 seconds") until a text read has been measured in the build; until then step 2 says only "Reading what you wrote...".
- Never say "You can keep working" or "the order appears in the list when it is done" on step 2: leaving a sentence read abandons it, and no Draft order is filed.
- Never show "On the receipt", "Totals match", "no printed total was found" or the VAT check: there is no document.
- Never claim the day was read when none was written: the Date field says "not written - today is filled in". A day is a day only; the app stores no time, and "yesterday" is counted from the day the device reports.
- The reading is the same service that reads receipts and can misread a sentence (an amount put on the wrong item, a shop name taken as an item). Every value stays editable and the bar counts only a missing price, an unclear price and a vendor not matched or not written; it does not promise the rest is right.
- Never say the order exists before Create: the footer keeps "Nothing saved yet", and Discard deletes the stored words.
- Nothing on the review may say a Draft keeps the price empty: Save as draft stores 0,00 kr. for a line with no price (api/src/lib/validate.js fillDraftGaps).
- Without ANTHROPIC_API_KEY the way in is absent, never a disabled field with a promise beside it.
- The vendor spelling shown is the vendor record's own only when it matched; a name no record has is shown as typed, with "new vendor, created on save".
- The possible-duplicate notice compares vendor and day only, as it does for a receipt; two trips to the same shop in one fortnight look alike to it.

#### Decisions the build makes unless overruled

- Place: under the receipt zone, above the "or" divider, as a field with a button, not a third choice card: it is typed into, not opened. The three drawn ways keep their rank.
- The field is c3 TextField in its multiline state, rows 2, full width as Layout rules give every unbounded text field; Enter presses Make the order; the help line is the c3 quiet help. Over 500 characters it takes the c3 danger message "500 characters at most."
- Shown only when scanAiEnabled is true; absent otherwise, as the brief asks, since a sentence that is not read gives nothing to attach.
- Step 2 reuses the Reading card: the first words of the sentence in the title slot, no preview tile, the same gauge and found rows, Cancel deleting the row and returning to step 1 with the words back in the field. Leaving step 2 abandons the read; the 6e leave-as-draft path is for a file.
- Step 3 is the same OrderForm unsaved state with origin.scan and file null: the receipt card is absent, "Add a line you did not write" replaces "Add a line the scan missed", and the Discard dialog (6d, as the scan's) reads "Discard this order?" / "2 lines were made from what you wrote and are waiting to be checked. Nothing is saved if you discard." with "Keep checking" and "Discard".
- A line with no price gets the new unclearPart 'price-missing': the same inline price field and amber tone as 'price', subtitle "price not said - fill it in", counted in the bar as "1 line has no price" / "2 lines have no price". Create still needs a price; Save as draft stays and stores 0,00 kr. as today.
- A price the words leave unclear is marked uncertain with "price unclear - check what you wrote"; the 'title' and 'quantity' parts keep their existing words with "the receipt" replaced by "what you wrote".
- Status and kind come from the account's defaults; the "Let a scan override these" switch is not applied, since a sentence has no document type.
- No day written: today with the quiet note "not written - today is filled in". No shop written: the Vendor field empty with the amber note "not written - pick one" (a c3 warning, not an error, until Create is pressed), counted in the bar and reached by Jump to first. A shop no record has: "new vendor, created on save", the existing "Want to add its details now?" / "Set it up first" row, and the bar's existing "The vendor is new and will be created."
- Categories are filled by OrderForm's existing vendor seeding (5l) from the matched vendor's defaults: "Filled from Netto. Remove any that do not fit."
- The failed card keeps 6e's three slots: the retry is "Try again" (the words back in the field, in place of "Try another photo"), the manual way on is "Empty order" (in place of "Continue manually", since nothing was read to continue with and the rule says that button opens an empty order directly), and "Discard".
- The created notice is "Order created." with Undo only; no "Scan another" and no new "Write another" button. Undo returns to the review by key, as a scan's Undo does, so Create does not delete the stored row; it lives out its 24 hours.
- A sentence row lives 24 hours and is swept with scan_uploads; Discard and Cancel delete it at once.
- A title is capitalised on its first letter and otherwise as written; "2 milk", "2 x milk" and "two milks" give quantity 2 and title "Milk".
- The palette gets no new action, and Home's capture card is left as drawn until the question below is answered.
- Until the question on the review is answered, the slot the receipt card uses shows a card with the section label "What you wrote" and the sentence as plain text, so the lines can be checked against the words.

#### Questions for Claude Design

- 3a step 1 gets a way to start that is a field, not a card: no drawing covers a typed way to start. Confirm its place (under the receipt zone, above the "or" divider) and its shape (label "Or write what you bought", the example as placeholder, a help line, the primary button "Make the order").
- Home 10a's "Add an order" card: does it carry the same field, going straight to step 2 as the drop zone does, or stay with its three drawn controls? It changes the card's height and what the person can do from Home. The build leaves Home as drawn until answered.
- Step 3 from a sentence has no receipt. Should the slot the receipt card uses show the words typed ("What you wrote") so the lines can be checked against them, or stay empty? The build shows the words until answered.

Depends on: Nothing else in Brief 30. The server needs ANTHROPIC_API_KEY, as receipt reading does; without it the feature is absent by design..


### 10. Ask a question in your own words

Covers: pick 9 of 12. Size: very large.

You type a question like "How much did I spend on coffee in August?" in the search box and get one figure, with the items and orders behind it. The app shows the words, shop, category and period it looked for, so you can remove one or ask again.

#### What the person sees

- Ask this question
- Only the question is sent to Anthropic. Your orders stay here.
- Reading the question...
- ANSWER
- 462,00 kr.
- 14 items with "kaffe" or "coffee" in the name, in 11 orders in August 2026.
- Shipping is not counted.
- Shipping and the discount on 2 orders are not counted.
- "kaffe" x   "coffee" x   01/08/2026 - 31/08/2026 x   Bilka x
- ITEMS · 14
- Kaffe, Merrild 500 g   in SPENDLY-447   89,90
- See the 11 orders

#### Where it lives

The command palette: Components c24 and Navigation shell 9d on a desktop, Mobile screens 7b full screen on a phone, in react/src/app/Palette.jsx (groupsFor, actionsFor, useSearch) with Shell.jsx's Palette, PaletteGroup, PaletteRule, PaletteRow and PaletteAll. The Ask row is a PaletteRow action like "Scan a receipt", listed first when the typed text reads as a question; Palette.jsx today puts actions first only when the text starts a command's name, and 9d says the same, so that exception is asked, not assumed. The answer is a new state of c24: a block holding the figure, one sentence and removable chips (c12's applied-filter chip, List.jsx Crumb), then the existing Items group (up to 3 rows, SHOWN) and a "See the 11 orders" row (PaletteAll, as "See all 8 in Orders"). c24's rules that every row is a record or an action and that a result is opened, not previewed, do not cover such a block, so the state is asked of Claude Design rather than invented. Statistics (4a) was the alternative and is rejected: its cards sum order totals and split them evenly by category, and 4b removes any card that cannot express a filter, so a words-in-item-names filter would empty the page. The order list gets one new filter, title, shown as one chip per word above the list (2b, the From import chip precedent), so the link opens exactly what the sentence counts.

#### States

- **not enough history.** Absent as a rule: the Ask row is offered only while the account has at least one order, as Drafts is offered only while a draft exists (9d, useHasDrafts). No other minimum; the answer counts whatever is typed in.
- **nothing to show.** Nothing in your orders matches these words.  The chips stay so one can be removed; no ITEMS group and no See row, since a number with nothing behind it is not shown. A name the reader used that matched no record adds one line: No shop called "Bilka" was found in your orders, so it was left out.  /  No category called "Coffee" was found in your orders, so it was left out.
- **question not understood.** No words, shop, category or dates were found in the question. Ask with the word to look for, like "coffee in August".
- **loading.** The Ask row's second line reads Reading the question... and the rows beneath it stay as they were (9d: the list never blanks). No skeleton: nothing has a place yet.
- **failed.** Group label: Could not read the question right now. Try again.  with one row: Search all orders  -  the same shape as the palette's failed search (Palette.jsx: Could not search right now. Try again.). A refused or timed-out reading reads the same; no chips are shown, because none are known.
- **switched off.** Absent. Without ANTHROPIC_API_KEY (/api/auth/me scanAiEnabled is false) there is no Ask row and no panel; the palette is as today and nothing says the feature exists. No setting: the same server switch as receipt reading.
- **phone.** The 7b full-screen palette. Ask row first without a key cap; the answer block keeps its figure while the item rows drop their amounts as every 7b row does; chips wrap inside the phone's 16px inset. See the 11 orders replaces the search step in history (Palette.jsx navigates with replace on touch) and opens the list with the chips above it and the Filters control carrying their count (7b Orders frame). There is no keyboard foot on a phone (Shell.jsx draws it only off screen).

#### On a phone

The 7b full-screen palette, opened from the header's search field. The Ask row sits first with no key cap; the answer block keeps its figure (it is the point of the panel) while the item rows drop their amounts as every 7b row does; chips wrap to a second line inside the phone's 16px inset (Layout rules, phone layout). "See the 11 orders" replaces the search step in history, as a result does today, and opens the list with the chips above it and the Filters control carrying their count (7b Orders frame). The phone palette has no foot line, so nothing changes there. Checked against the design text and Palette.jsx only, not rendered.

#### Where a tap goes

- /orders?title=kaffe,coffee&from=2026-08-01&to=2026-08-31  -  See the 11 orders; &vendor=<id> and &category=<id> are added when the question named them, and &status=<the statuses present> only when a Draft, Cancelled or Returned order would otherwise appear in the list (the address keys are Orders.jsx FACETS: vendor, category, status, from, to)
- /orders/<id>  -  an item row opens its order, as an Items row does today
- No route for the Ask row or the answer: the palette is an overlay (9d), Esc closes it, and typing in the query line returns to the rows

#### What it reads

- orders: user_id, date, status, vendor_id, shipping, discount, search_text, reference (read; date is a day as unix seconds, filtered with >= from and <= to as buildOrderFilter does)
- order_items: order_id, title, quantity, price, position (read; price is per unit, the line is price * quantity, as the paid trigger in migrations/001_init.sql sums it)
- vendors: id, name; vendor_aliases: vendor_id, name (read, through lib/textSearch.js vendorIdsMatching)
- categories: id, name; order_categories: order_id, category_id (read)
- statuses: key (read only to know that orders.status holds a key; migrations/100_order_statuses.sql: a status the account adds is keyed by its id, so it is never one of the three FLOW_WHERE leaves out)
- NEW route POST /api/ask: body { question }, answer { words[], vendor, category, period: { month, year, relative, from, to } } - the only call that leaves the server; built on scanParse.js's getClient and MODEL. The request carries the question text only.
- NEW route GET /api/orders/sum: the list's filter parameters plus title; answers { sum, lines, orders, discounted, leftOut: { returned, draft, cancelled }, first: [3 lines] }
- NEW filter parameter title (comma-separated words) in GET /api/orders (buildOrderFilter, routes/orders.js) and in the order list address (Orders.jsx FILTERS); matched on order_items.title only
- No new table, column or setting; the switch is the existing ANTHROPIC_API_KEY, read as scanAiEnabled from /api/auth/me and receiptReading from /api/auth/options

#### How the figure is made

POST /api/ask sends only the question text through the same Anthropic client as api/src/lib/scanParse.js (getClient returns null without ANTHROPIC_API_KEY; never throws into its caller) with a forced tool call, as parseReceipt does, and gets back words to look for in both Danish and English forms, a shop name, a category name and the period as parts: a month, a year when one was said, or a relative word such as last month. The server turns those parts into a from and to day from its own clock (req.today), so nothing but the question leaves the server and "August" with no year means the latest August that has started. The app resolves the shop through vendorIdsMatching (vendors.name or vendor_aliases.name, substring, the list's own rule) and the category by categories.name with the same MATCHERS; a name that matches nothing drops out and is named in the panel. GET /api/orders/sum composes buildOrderFilter (routes/orders.js) with the new title clause, so its order set is exactly what the list opens, and adds FLOW_WHERE.expenses from lib/stats.js: status not in Returned, Cancelled, Draft, which is Statistics' resting lens "Expenses only" (Statistics.jsx line 124 defaults flow to expenses). The figure is SUM(oi.price * oi.quantity) over order_items whose title contains any of the words, matched with lib/textSearch.js MATCHERS (LIKE with ESCAPE for an ASCII word, contains_fold otherwise, mid-word so "kaffe" counts "Kaffefilter"), the orders narrowed by search_text first as search.js countItems does; the route also returns COUNT of lines, COUNT(DISTINCT order_id), how many counted orders have discount > 0, how many Returned, Draft and Cancelled orders the lens left out, and the 3 newest lines (ot.date DESC, oi.position). The sentence is written in the app from those numbers with currency() and plural() from react/src/api/format.js; the reading service never sees an amount, a name or a vendor. Removing a chip calls /api/orders/sum again with the remaining filters and never /api/ask.

#### How much history it needs

None needed. The Ask row appears once the account has one order, and the answer counts only orders already typed in; it names the period it used, with the year, so a short history reads as "in August 2026" over few orders rather than as a claim about the month.

#### What it must never claim

- Never "spent on coffee": the app knows item names containing words, so the sentence says 14 items with "kaffe" or "coffee" in the name, and the chips show every word used. A coffee bought as "Espresso" is not found, and the sentence never claims it is.
- Always names the period it used, with the year (in August 2026; between 01/08/2026 and 15/08/2026 for a partial range; in all your orders when none was found), because the month and the year were read from the question, not from the orders.
- Shipping is not counted. is always true for a line sum and is always said; the discount is named only when a counted order has one; returned, draft or cancelled orders are named only when the lens left some out: 2 returned orders are not counted.
- A status the account added itself (Settings, Statuses) is counted, as Statistics counts it: FLOW_WHERE.expenses leaves out only Draft, Cancelled and Returned by key, and a custom status is keyed by its id.
- A line counts as a row: two identical lines in one order count twice in the amount and in "14 items", unlike the palette's Items count, which shows one row per name and order. The amount needs every row.
- The app never says "I": Spendly's copy speaks about the orders, not as a person.
- See the 11 orders opens a list of exactly 11: the sum route and the list run the same buildOrderFilter and title clause, and status chips are added when a Draft, Cancelled or Returned order would otherwise appear (Home 10a: a link opens what it counts).
- A shop or category the reader named that matched no record is said to be left out, never dropped in silence.
- Only the question is sent to Anthropic. Your orders stay here. is true because the request carries the question text and nothing else; the period is resolved on the server from its own clock. The Privacy notice (Notices.jsx, What leaves the server) gains the matching sentence: When you ask a question in the search box, the question is sent to Anthropic, the company that makes Claude, so it can be read. Your orders are not sent.
- Without the key the row is absent, so nothing promises an answer the server cannot give.

#### Decisions the build makes unless overruled

- Placement: the command palette, not Statistics. Statistics sums order totals and splits them by category; 4b removes any card that cannot express a filter, so a line-title filter would empty its page.
- The Ask row is offered only when /api/auth/me scanAiEnabled is true and the account has at least one order (checked as useHasDrafts checks drafts). Absent, never disabled. It is not in the empty palette's Actions list, so 9d's count of about nine commands does not grow.
- Text reads as a question when it ends with ? or its first word is how, what, when, hvor, hvad or hvornår, case ignored. The record search keeps running beneath the Ask row, since a question can still match a note; Enter on the first row asks.
- One reading per Enter: nothing is sent while typing, because the reading costs money and leaves the server.
- The service returns words in Danish and English forms; the app looks for any of them and shows one chip per word in straight quotes ("kaffe"), as the list's empty state already quotes typed text.
- A shop name resolves through vendorIdsMatching (name or alias, substring); several matches are all included, one chip each. A category resolves by categories.name the same way. No match: no chip, one sentence saying it was left out.
- The period comes back as parts and is resolved on the server: "August" means the latest August that has started, so August 2026 today; "last month" the previous calendar month; no period means all orders. The year is always written in the sentence.
- Statuses follow Statistics' resting lens FLOW_WHERE.expenses (Draft, Cancelled and Returned out), not the brief's "Draft and Cancelled out", so the figure agrees with the Statistics page the person sees first.
- The figure is currency(sum) with øre, as palette rows show amounts; a line is price * quantity; shipping and the order discount are never part of it and the sentence says so.
- Words are matched as substrings of order_items.title with the list's MATCHERS, mid-word, as 9d wants for Danish compounds; orders are narrowed by search_text first, the countItems shape in search.js.
- Copy says "items" and "name", the words the app already uses (the line field is labelled Item name in OrderForm.jsx, the palette group is Items); "title" stays a code word.
- Chips in the panel: one per word, one per shop, one per category, and the date range labelled as the list labels it (shortDate from - shortDate to, drawn as 01/08/2026 - 31/08/2026 in 2d), so the chips read the same after See the 11 orders. Removing one re-runs the sum from the app's own filters, with no new reading. Removing the last word sums every line in the remaining filters, and the sentence drops the "with ... in the name" part.
- The items group reuses the palette's Items rows: name, then in SPENDLY-447 as today's row meta, plus the line amount on a desktop (value, dropped on a phone as c24 rows are). Then See the 11 orders.
- The link carries title, from, to, vendor and category; status is added only when the plain list would hold an order the lens left out, so the chips stay few and the count stays exact.
- The new title filter is excluded from saved views, like the From import chip, until Claude Design answers whether it gets a facet.
- Loading reuses the scan's wording shape (Reading the receipt...): Reading the question...; failure reuses the palette's failed-search shape: one label plus Search all orders.
- The Privacy notice gains one sentence in What leaves the server, shown under the same receiptReading flag; no new setting.
- react/scripts/edge-account.mjs gains a shop named Kaffebar with a line titled Kaffefilter, an order whose note says kaffe but whose lines do not, a draft and a returned order with a kaffe line, an order with two identical kaffe lines, an order under a custom status with a kaffe line, and a line titled Æg, so the count difference between the old text filter and the title filter, the row count, the custom status and the Æ fold are all on the edge account.

#### Questions for Claude Design

- c24 needs a new state, the answer: a block that is neither a record nor an action (a figure, one sentence, removable chips), followed by an Items group and a See the 11 orders row. c24 says every row is a record or an action and that a result is opened, not previewed. Please draw this state for the 520px panel and the 7b full screen: where the figure sits, how the chips wrap, and whether the desktop keyboard foot changes.
- The Ask row leads the list when the typed text reads as a question (ends with ? or starts with how, what, when, hvor, hvad, hvornår). 9d says actions rank above records only when the query matches a command name. Please confirm the exception and the wording: Ask this question, with the second line Only the question is sent to Anthropic. Your orders stay here.
- The order list gets a filter by words in item names so See the 11 orders opens exactly those orders. Should it be a chip reachable only from an answer, like From import (2b), or a facet in the rail the person can set by hand? The second changes what the person can do from the list; the build takes the first until told.

Depends on: Claude Design's answer to the three questions above (the c24 answer state, the Ask row's rank, the title chip's home); ANTHROPIC_API_KEY set on the server, read as scanAiEnabled from /api/auth/me (api/src/routes/auth.js), the same switch as receipt reading; A new title filter in GET /api/orders (buildOrderFilter in api/src/routes/orders.js) and in the order list address (FILTERS in react/src/pages/Orders.jsx), built in the same change.


### 11. Your year in a few cards

Covers: pick 11 of 12. Size: large.

In December and January, Home shows a card that opens the story of the year as a few full-screen cards: the orders you wrote in and their total, your top shop, your busiest month, your biggest order, what you saved and your longest quiet stretch. From Statistics the same story opens for the year shown, and while the year is still running every card says "so far".

#### What the person sees

- Home card (January, about the finished year): "Your 2025 is ready". Home card (December, about the running year): "Your 2026 so far". Under the title: "248 orders you wrote in, 486.320 kr. Six short cards." (the word counts the cards that exist: "Four short cards."). Footer button: "Open your year". The x in the head: "Hide your 2026".
- Statistics, Year period, beside Export: a button "Your 2026 so far" (running year) or "Your 2025" (finished year).
- Card 1 of 6: "YOUR 2026 SO FAR" / "486.320 kr." / "248 orders you wrote in, 1 January to 6 October". For a finished year: "YOUR 2025" / "486.320 kr." / "248 orders you wrote in".
- Card 2 of 6: "TOP SHOP, BY SPEND" / "Indbo Møbler" / "142.310 kr. in 38 orders you wrote in" / button "See in Statistics".
- Card 3 of 6: "BUSIEST MONTH, BY ORDERS" / "August" / "18 orders you wrote in, 61.480 kr." / button "See in Statistics".
- Card 4 of 6: "BIGGEST ORDER" / "14.910 kr." / "Hay, 28 July, 8 lines you wrote in" / button "Open order".
- Card 5 of 6: "SAVED" / "138.410 kr." / "List price minus what you paid, on lines with a list price. Discounts typed on orders are added."
- Card 6 of 6: "LONGEST QUIET STRETCH" / "23 days" / "No order written in between 3 March and 27 March." / button "Open statistics" (the last card shown carries this button).
- The last line of every card: "Counts the orders you wrote in. Returned, cancelled and draft orders are not counted." The three status names are the account's own names for those statuses, so a renamed status is named as the person named it.
- The bar under the card: "Previous", "2 of 6", "Next", "Close".

#### Where it lives

The Home card lives in react/src/pages/Home.jsx, in the notice slot at the top of DesktopHome where the monthly summary card (8b) stands, as a second Card in the summary's shape: section label, heading, one sentence, a footer button and the x that puts it away; it reads its data with useApi and shows its loading and failed states with Hold, Skeleton and Failed like the other Home cards (6b). The Statistics entry is a Button beside Export inside TopBarEnd in react/src/pages/Statistics.jsx (4e: the lens and Export sit at the top bar's right end, never in the period row), shown for the Year period only; on a phone TopBarEnd renders nothing, so there the button joins the Controls row that holds "Expenses only" under the period select. The story itself has no pattern in design/: c13's dialog holds a decision (title, what will happen, cancel and the action), not six cards to read, and 12b's image viewer is drawn for images with "three controls only", so the story is proposed to Claude Design as a named state of the viewer frame (.sp-viewer: dark --shell ground, the bar with Previous, "2 of 6", Next and Close, the whole screen on a phone with swipe between steps, as react/src/components/Attachments.jsx's Viewer already does) holding one card per step in the month card's dark look (10a, Card variant "shell", .sp-card--shell: section label, large sp-stat__figure, one sp-meta line) with one small text button where a card links out. The brief's dot stepper exists nowhere in design/ (the only .sp-stepper is the number stepper for quantities), so it is not proposed: the viewer's "2 of 6" count is the existing step indicator. The API side is one new read in api/src/routes/stats.js, yearStory() in api/src/lib/stats.js built from the helpers Home and Statistics already use under scopeOf({ flow: 'expenses' }), plus a seen table shaped like monthly_summary_seen.

#### States

- **not enough history.** Fewer than 3 months of the year hold a counted order: the busiest month and quiet stretch cards are absent and the bar counts the cards that exist ("1 of 4"). The first card's line reads "You have orders in 2 months of 2026 so far. More cards come when 3 months of the year have orders." for a running year, and "You have orders in 2 months of 2025." for a finished year.
- **nothing to show.** The year has no counted order: the Home card is absent and the Statistics button is absent. Statistics' own empty state "No orders in 2026" (6a, the words Statistics.jsx already uses) is what the person sees.
- **loading.** Home: the card keeps its resting height with skeleton bars at the text heights (Hold and Skeleton, 6b), as every Home card. Statistics: the button is disabled until the year read answers, as Export is until the view loads (disabled={!view?.orders}). The story never opens half loaded; it opens with its figures.
- **failed.** Home: the card holds its height and shows the red alert under its label, "Your year did not load" / "Check your connection, then try again." with "Try again" in the footer (6b, Failed variant card; the title and reason are the words Failed.jsx already builds, so no new sentence is written). Statistics: the button opens the frame, and the frame shows the same words and "Try again" in place of the first card.
- **switched off.** No switch exists in Settings and none is added. The x on the Home card ("Hide your 2026") puts that card away on every device and it does not come back, the rule 8b gives the monthly summary's close. The December card and the January card are two cards about the same year, so each has its own x and its own row: the table stores the month the card belongs to (2026-12 or 2027-01), as monthly_summary_seen stores the summary's month. The story stays reachable from Statistics.
- **phone.** The story is the whole screen (12b's viewer on a phone, Responsive reference row "Image viewer (12b)"): on a phone the viewer's bar draws the file name in place of the count, so the story's bar there holds the card's label ("Top shop") where the name stands, then Previous, Next and Close, and a swipe moves between cards; whether the count is drawn on a phone is part of question 1. The tab bar and the New order button hide while it is open and return on Close (7a, 9h). The Statistics button sits in the Controls row under the period select beside "Expenses only". The Home card on a phone is question 2; proposed: shown above Recent orders in December and January, in the plain phone card look (Card, as PhoneMonth) with the same x.

#### On a phone

The story is the whole screen, as the image viewer is on a phone (12b, Responsive reference): one card at a time, the bar with the card's label where the viewer draws the file name, Previous, Next and Close, swipe between cards, the tab bar and the New order button hidden while it is open and back on Close (7a, 9h). The Statistics entry is a button in the Controls row under the period select, beside "Expenses only", where TopBarEnd does not exist. The Home card on a phone is question 2; proposed above Recent orders in December and January in the plain phone card look.

#### Where a tap goes

- /statistics - "Open statistics" on the last card for the running year, and the Statistics page the running year's button belongs to (Statistics.jsx writes period only when it differs from the current year, and range only when it is not year)
- /statistics?period=2025 - "Open statistics" on the last card for a finished year
- /statistics?crumbs=vendor:<vendorId> (running year) or /statistics?period=2025&crumbs=vendor:<vendorId> (finished year) - "See in Statistics" on the top shop card, the vendor as the crumb (4b; writeCrumbs in statisticsWindows.js)
- /statistics?crumbs=month:2026-08 (running year) or /statistics?period=2025&crumbs=month:2025-08 (finished year) - "See in Statistics" on the busiest month card, the month as the crumb (the form MonthsCard in Home.jsx already writes for a month bar)
- /orders/<orderId> - "Open order" on the biggest order card, the order in read mode (routes.jsx orders/:id)
- no route of its own for the story: it opens over Home or Statistics like Copy an order (10a) and the image viewer (12b); Close, Escape and a press outside return to the page under it with focus back on the opener. 10a names Copy an order as the one exception to "every link is a real route", so whether the story gets a route is in question 1
- / - Home carries the card in December and January only

#### What it reads

- orders (read): id, user_id, vendor_id, date, status, total, saved, item_count; total and saved are the stored generated columns (total = paid + shipping - discount, saved = retail - paid + discount, migration 009), retail per line being MAX(COALESCE(retail, price), price) * quantity (migration 028), so a line without a list price and a line bought above its list price each save 0
- vendors (read): id, name, for the top shop and the biggest order's shop
- statuses (read): key, name, for the account's own names of Returned, Cancelled and Draft on the last line of every card (api/src/routes/statuses.js lets a built-in status be renamed)
- NEW table year_story_seen (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, month TEXT NOT NULL), in a new migration numbered after 227_needs_a_look.sql, shaped like monthly_summary_seen (180_monthly_summary.sql); month is the month the Home card belongs to (2026-12 for the December card, 2027-01 for the January card)
- NEW read GET /api/stats/year/:year and NEW PUT /api/stats/year/seen { month } in api/src/routes/stats.js; yearStory(userId, year, today) and markYearSeen(userId, month) in api/src/lib/stats.js, beside monthlySummary and markSummarySeen
- NEW statement: the biggest order of the window under the scope (SELECT ot.id, ot.vendor_id, ot.date, ot.total, ot.item_count, v.name FROM orders ot JOIN vendors v ON v.id = ot.vendor_id WHERE ot.user_id = @userId AND ot.date >= @from AND ot.date < @to + FLOW_WHERE.expenses ORDER BY ot.total DESC, ot.date DESC, ot.id LIMIT 1). SQLite may read one account's year through idx_orders_user_date and sort in a temp B-tree, or walk idx_orders_user_total (user_id, total, id) backwards and filter; npm run queries:check reads the plan back, and since the read is opened on demand it is blessed in api/query-plans.json rather than given an index
- no new setting and no new column on orders; months with orders, the busiest month and the quiet stretch come from dailyRowsOver's zero-filled days (one row per day of the year), which yearStory calls once as getStats does

#### How the figure is made

windowBounds(userId, 'year', '2026', today) gives the year, and scopeOf({ flow: 'expenses' }) gives the same WHERE as Home's month card (MONTH and YEAR in Home.jsx), the monthly summary (monthlySummary) and Statistics' default lens (flow defaults to 'expenses' in Statistics.jsx): FLOW_WHERE.expenses is status NOT IN ('Returned', 'Cancelled', 'Draft') with no filter on kind, so custom statuses and every kind (Expense, Gift, Sold, Work, Other) count. totalsOver gives orders, spent (SUM total) and saved (SUM saved); vendorSplitOver's first row is the top shop by spend with its order count; dailyRowsOver's zero-filled days give the months with at least one order (the 3-month rule), the busiest month (most orders, ties by higher spend then the earlier month) and the longest run of days with no order between two orders of the year (the quiet stretch; the days before the first order and after the last are not a stretch, since one end is open). The biggest order is one new statement ordering the window's orders by total. "so far" holds while today is inside the year (paceFor's running), and the span on the first card runs from 1 January to today. The last line's status names come from the account's statuses (key Returned, Cancelled, Draft), lower-cased inside the sentence as the app does for a status in running text.

#### How much history it needs

Counted months are the months of the year with at least one counted order. 3 or more months: all six cards. 1 or 2 months: the first card, top shop, biggest order and saved (when above zero) only; busiest month and quiet stretch are absent, and the first card says "You have orders in 2 months of 2026 so far. More cards come when 3 months of the year have orders." for a running year and "You have orders in 2 months of 2025." for a finished one. 0 months: no Home card and no Statistics button. "so far" is said only while the year is running; a finished year never says it, whatever its months.

#### What it must never claim

- Every card says "orders you wrote in" and "Returned, cancelled and draft orders are not counted"; it never says "you spent" or "your spending", since the app knows only what was typed in.
- The copy does not say "Ordered or Delivered" (4e's words): FLOW_WHERE excludes by status key, so custom statuses count too; the card names what is not counted, not what is.
- A built-in status can be renamed in Settings (statuses.js), so the three names on the last line are read from the account's statuses, never written as fixed words; a person who renamed Returned sees their own name for it.
- Every kind counts, gifts and sold items included, so the cards say "orders you wrote in", never "what you paid for yourself".
- Top shop is labelled "by spend" and busiest month "by orders"; never "favourite shop" or "most visited".
- Saved is an amount in kroner, never a percentage, and its card says what it is made of: a line without a list price saves 0, a line bought above its list price saves 0 (migration 028), and the order's typed discount is added (migration 009); at zero the card is absent rather than reading "Saved 0 kr." in a story.
- "so far" only while today is inside the year; "is ready" only about a finished year, never in December.
- The quiet stretch says "No order written in between ...", never "you bought nothing": a date is the order's day, often the day it was typed in, and there is no time of day.
- The dates on a card ("28 July", "3 March") are drawn by the app's own date formatting for the account's locale, so a Danish locale shows them in its own form.
- A number with nothing behind it is not shown, and a link opens exactly what it counts: the top shop and busiest month links open the Statistics slice with that crumb, the biggest order link opens that one order.

#### Decisions the build makes unless overruled

- Counting is flow 'expenses' (FLOW_WHERE): every order whose status is not Returned, Cancelled or Draft, every kind. This is what Home's month card, the monthly summary and Statistics' default lens already count, so the cards agree with them.
- Top shop is by spend, as Statistics' Top vendors orders its rows (vendorSplitOver, spend DESC), with its order count on the card; the label says "by spend".
- Busiest month is by number of orders, ties by higher spend then the earlier month; the label says "by orders".
- Biggest buy is the one order with the highest total (orders.total), labelled "Biggest order" because the record is an order and the link opens it; not a single line.
- The saved card is absent when saved is 0 (no line with a list price and no discount), by 10a's rule that a card with nothing to say is absent; otherwise the amount is green as on the month card.
- The quiet stretch is shown only when it is 14 days or more and the year holds 3 or more months; otherwise absent.
- Amounts are whole kroner (currency(n, 0)), as the month card and the monthly summary show them.
- The Home card appears in December about the running year as "Your 2026 so far", and in January about the finished year as "Your 2025 is ready"; never in other months. "is ready" is not said in December because the year is not finished and the cards inside say so far. Overrule if "is ready" is wanted in December too.
- The Home card sits in the summary slot at the top of Home, under the monthly summary when both show (January); each has its own x. The x stores the month the card belongs to in year_story_seen, as the summary's x stores its month, so hiding the December card does not hide the January card about the same year.
- The story has no route; Close, Escape and a press outside return to the page, and focus returns to the opener (c13's dialog rule, the viewer's keys). 10a lists Copy an order as the one link without a route, so the story being a second one is put to Claude Design in question 1.
- The Statistics button is an outline button beside Export in the top bar's right end (4e), shown for the Year period only, labelled with the year shown, disabled until the read answers, absent when the year has no counted order. On a phone it sits in the Controls row with "Expenses only".
- The step indicator is the viewer bar's "2 of 6" count; no dots (pending question 1).
- The link text on a card is "See in Statistics", the words 4b gives that link, and "Open order" for the order.
- A failed read inside the frame shows 6b's words and Try again in place of the first card.
- Six cards is the cap and none expands, by 10a's rule that Home cards are capped at constants.
- The edge-case account (react/scripts/edge-account.mjs, which today holds one order last year at day(-400)) gains a year with orders in 3 or more months and a year with orders in 1 or 2 months, with a saved of zero in one, so both branches render in the verification pass.

#### Questions for Claude Design

- A full-screen stepper of cards does not exist in design/. Proposed: a named state of the image viewer frame (12b, .sp-viewer on the dark --shell ground, full screen on a phone, swipe between steps) whose bar holds Previous, "2 of 6", Next and Close, with one card per step in the month card's dark look (10a, .sp-card--shell: section label, large figure, one meta line) and one small text button where a card links out. 12b says the viewer has "three controls only" and its subject is an image, and on a phone its bar draws the file name instead of the count (Responsive reference). Three parts: is this a state of the viewer or a new component; does the step indicator stay "2 of 6" (and is it drawn on a phone, where the viewer hides the count) or become dots, which exist nowhere today; and does the story get a route of its own so it deep-links and comes back with the browser button, or open over the page with no route like Copy an order, which 10a names as the one exception?
- 7a says Home on a phone has no monthly summary and nothing replaces it. The year card is a different card, but the same shape. Does the "Your 2026 is ready" card show on a phone's Home above Recent orders in December and January, or is Statistics the phone's only way in? This changes what the person can do on a phone.

Depends on: Claude Design's answer to question 1 before the story frame is built; the API read, the migration, the Home card and the Statistics button do not wait on it; Claude Design's answer to question 2 before the phone Home is touched; A new migration numbered after 227_needs_a_look.sql for year_story_seen; npm run queries:check in api/ for the one new statement, blessed if its plan is the expected read of one account's year.


## Part B - the questions for Claude Design, in one batch

These are every design question from the items above, in one place, so they can be answered in one round. Everything not asked here is a decision the build makes from an existing pattern, listed under each item, and can be overruled in one line.


**Pay day setting and its first two readers**

1. The brief rewrites the drawn limits line to "8.600 kr. left under your limits · 360 kr. a day until pay day", but 10a draws "90% of 68.000 kr. in limits" on the left of that line, while 4a's Monthly limit rows read "6.680 kr. left". The build keeps 10a's text and adds the per-day figure after it. Should 10a's left text be redrawn as an amount left ("6.520 kr. left under your limits"), the 4a shape, so Home and Statistics say the same kind of thing? Only Claude Design can change the drawn copy.

**Where this month will probably end**

2. Home 10a says "A button or row that shows a number opens a list with exactly that many items. If it cannot, the number is not shown." The new row shows "from 6 earlier months" and opens nothing. The build reads that rule as being about counts of records (the same card already shows "day 21 of 31" and "90% of 68.000 kr." as plain text) and keeps the count. If Claude Design reads it as covering this count too, the count is dropped and the line keeps only the figures; which reading holds?

**Same month last year, on Home**

3. Statistics on a phone shows no comparison at all (the 7a Statistics frame is label and figure only, and Statistics.jsx compares only when not touch). Should Home's This month card on a phone carry this line as proposed, or does the phone keep its 7a frame as drawn, with the line on desktop only?

**A limit suggested from your own months**

4. Two figures on one field: the 6c amber sentence names the 12-month average (19.480 kr., every status counted, Returned, Cancelled and Draft included) while the button under it offers 21.500 kr. from the last 6 months' middle with Home's statuses. Should 6c's sentence and its "more than 6 of 12" count move onto the same months and the same status rule as the suggestion, or keep their own? This changes settled 6c copy.
5. Length of a field help line: c3 draws "one field, one help line" and the suggestion is three short sentences at `.sp-field__help` 11px grey, longer than any help line drawn in design/ (6c's is two). Is that acceptable under the field, or should the suggestion sit in the Category summary rail as a c21 sum row beside "12-month average" with the Use button in that card?
6. Which statuses count toward a monthly limit: 5i's note says "all statuses" and points to a BEHAVIOUR.md that is not in design/ or the repo, 5d's This month column and the over-limit flag count everything but Cancelled and Draft (categoryList.js), and Home's Spent this month, the 8b summary and this suggestion count everything but Returned, Cancelled and Draft. One answer in one place, as 5i asks.

**The day a limit is likely reached**

7. Needs a look: should a count row "2 categories are likely to reach their limit before October ends" exist, and where does it rank among Categories over their limit, Categories near their limit, Orders not delivered after 2 weeks, Vendors that look like duplicates and Orders without a receipt (10a orders rows by severity, then recency, and the cap of three means a row placed high can push another off Home)? If it exists, the category list needs a filter in the Over the limit / Near the limit family, proposed as the chip "Likely to reach the limit" at /categories?flag=likely-over. In the same answer: should Home's Categories this month rows carry the day at all? They are drawn as "24.100 / 22.000" with a bar and no text line, so a line there is a row shape that does not exist today.

**Maybe this order was saved twice**

8. The brief wants Open that order on the alert while saving. Components c19 says the inline alert owns no control and has no actions of its own, while the section notices of 8a and 3a (Copied from with Discard, values need a look with Jump to first) do carry a button. May the inline alert's second line carry a text link to the other order as a state of c19, or does the alert only name it (reference and date), as proposed?
9. Both are right has no drawn home: c23 rows only filter, 2e lists the row menu's six items exactly, and 1a draws no notice. Proposed: a section notice in 6f's sense (top of the content column, the 8a Copied from shape) at the top of the order page on each order of a pair, with Open that order and Both are right in its action slot, and the same Both are right item in the row menu only while the list is filtered to Maybe saved twice. Is that right, or should the action live in one of the two places only?

**A place for products**

10. c24 and 9d fix the palette's group order as Orders, Vendors, Items. Where does a Products group sit, and does an Items row still appear for a title that belongs to a product? The same text would then show twice and open two different places (the order, the product page).
11. Order editing layouts 1a and 1b call a line's shop link "Product link" and its field "Product page" (it opens the shop's web page in a new tab). The app now has its own product page at /products/:id/edit. Which of the two is renamed, so one word does not mean two things?
12. The brief asks for a price-over-time line. design/ has bars only: c14 holds sp-bars (with sp-bars--spark, a 56px bar sparkline inside a stat) and sp-shares, and sp-plot holds an axis, gridlines and a dashed limit line, but no line series; COMPONENT-STATUS.md lists "sparkline" under c14 as Draft. The build draws c14 bars, one per month. Is a line series a new c14 state worth adding, or do the bars stand?

**Payments that repeat every month**

13. 4a opens with "Every chart element is a filter" and 4b removes a card that cannot express a crumb. The Every month rows cannot be crumbs (a repeat is not a filter the other cards can show) and instead carry a c9 row menu and a c1 subtitle line, which no Statistics card has today. Can a 4a card have rows that are not drill targets, with a meta line under the name and a row menu at the row's end, and will Claude Design draw the card in 4a (under Top vendors, left stack) and in the 7b Statistics frame?
14. Hidden repeats need a way back and no page owns it. The closest patterns are Bookmarks' Archived filter (22a) and 4d's in-card swap; the proposal is a footer button "Show 2 hidden" that swaps the card's rows in place. Is that acceptable, or should hidden repeats live in Settings 11a, which today has eleven fixed panes and none for Statistics? The answer changes where the person can act.
15. 1d says anything new in the rail has to displace something, not extend it, and 1a shares that grid. The "Repeats" row adds one line to Order details. Accept the one line in the rail, or carry it in the items header's meta beside the vendor and date ("Telia · 03/10/2026") instead?

**Write one sentence, get a draft order**

16. 3a step 1 gets a way to start that is a field, not a card: no drawing covers a typed way to start. Confirm its place (under the receipt zone, above the "or" divider) and its shape (label "Or write what you bought", the example as placeholder, a help line, the primary button "Make the order").
17. Home 10a's "Add an order" card: does it carry the same field, going straight to step 2 as the drop zone does, or stay with its three drawn controls? It changes the card's height and what the person can do from Home. The build leaves Home as drawn until answered.
18. Step 3 from a sentence has no receipt. Should the slot the receipt card uses show the words typed ("What you wrote") so the lines can be checked against them, or stay empty? The build shows the words until answered.

**Ask a question in your own words**

19. c24 needs a new state, the answer: a block that is neither a record nor an action (a figure, one sentence, removable chips), followed by an Items group and a See the 11 orders row. c24 says every row is a record or an action and that a result is opened, not previewed. Please draw this state for the 520px panel and the 7b full screen: where the figure sits, how the chips wrap, and whether the desktop keyboard foot changes.
20. The Ask row leads the list when the typed text reads as a question (ends with ? or starts with how, what, when, hvor, hvad, hvornår). 9d says actions rank above records only when the query matches a command name. Please confirm the exception and the wording: Ask this question, with the second line Only the question is sent to Anthropic. Your orders stay here.
21. The order list gets a filter by words in item names so See the 11 orders opens exactly those orders. Should it be a chip reachable only from an answer, like From import (2b), or a facet in the rail the person can set by hand? The second changes what the person can do from the list; the build takes the first until told.

**Your year in a few cards**

22. A full-screen stepper of cards does not exist in design/. Proposed: a named state of the image viewer frame (12b, .sp-viewer on the dark --shell ground, full screen on a phone, swipe between steps) whose bar holds Previous, "2 of 6", Next and Close, with one card per step in the month card's dark look (10a, .sp-card--shell: section label, large figure, one meta line) and one small text button where a card links out. 12b says the viewer has "three controls only" and its subject is an image, and on a phone its bar draws the file name instead of the count (Responsive reference). Three parts: is this a state of the viewer or a new component; does the step indicator stay "2 of 6" (and is it drawn on a phone, where the viewer hides the count) or become dots, which exist nowhere today; and does the story get a route of its own so it deep-links and comes back with the browser button, or open over the page with no route like Copy an order, which 10a names as the one exception?
23. 7a says Home on a phone has no monthly summary and nothing replaces it. The year card is a different card, but the same shape. Does the "Your 2026 is ready" card show on a phone's Home above Recent orders in December and January, or is Statistics the phone's only way in? This changes what the person can do on a phone.

## Build order

Four rounds, each one a pull request or two. A round waits only for the design answers it needs.

1. **Home and limits, no new screens.** The pay day setting and its two lines on Home (item 1), where this month will probably end (item 2), same month last year on Home (item 3), a limit suggested from your own months (item 4). All medium. Each has at most one question, and the build can start with its proposed answer.
2. **Checks that read the same curve.** The day a limit is likely reached (item 5, it reuses the curve from item 2), maybe this order was saved twice (item 6), payments that repeat every month (item 8). Medium to large.
3. **The two that talk to the reader.** Write one sentence and get a draft order (item 9), ask a question in your own words (item 10). Both need the reader key on the server and are absent without it. Item 10 waits for the answer state of the search box.
4. **The two new patterns.** A place for products (item 7, very large, and the base for three of the picks) and your year in a few cards (item 11). Both wait for their design answers.

Every round ends the same way: the change is tried on the edge-case account, the pages are rendered at desktop and phone width and measured, `npm run queries:check` is run in `api/`, and the pull request lists the decisions it made.


## Part C - the rest of the list

Not part of the brief. These are the other ideas from the sweep, one line each, so they are not lost. Each line says if the data is there today and how big it is. The ones marked "pay day" need the setting from item 1.

### Around pay day

Ideas that start from the day your pay arrives and the days until the next one.

- **Spend until pay day.** You set your pay day once. Then the app shows what you will probably spend before the next pay day, with a low and a high number. (needs new data, size M, pay day)
- **This month against your usual month.** A line shows how much you have spent so far this month, next to a line for a usual month. A usual month is the middle value of your last 6 months. You see today if you have spent more or less than usual. (data is there, size M, pay day)
- **Spending in the first and last week.** See how much of your month you spend in the first 7 days after pay, and in the last 7 days before the next pay. See which categories fill each week. Until you set a pay day, Spendly uses the first and last 7 days of the calendar month and says so. (partly there, size S, pay day)
- **Plan the next pay month.** On pay day Spendly offers a plan: money in, then bills, then a usual amount per category, and what is left per day. You can change the numbers and save them as limits. (needs new data, size XL, pay day)
- **Will your limit last until pay day.** For each limit, Spendly guesses on which day you reach it if you keep the same pace. It tells you early if that day comes before pay day. (partly there, size M, pay day)
- **Count the month from pay to pay.** A setting called 'Count months from pay day'. When it is on, Statistics, the monthly summary on Home and the category limits all use pay months. A pay month runs from one pay day to the next. (needs new data, size XL, pay day)
- **Shops you use right after pay.** A list of shops and categories where most orders come in the first 3 days after pay. You see the counts, so you can judge it yourself. (partly there, size M, pay day)
- **Months with extra money in.** Finds months where more money came in than usual, from your budget. Shows what you spent more on in those months. (partly there, size M, pay day)

### Looking ahead and repeat buys

Guesses about what comes next, and reminders for things that come back again and again.

- **Warning when the month goes too fast.** A new notice warns when you have spent much more in a category than you usually have by this day of the month. It can come before the 75 percent line. (data is there, size M, pay day)
- **Time to buy it again.** A short list of things you buy again and again, such as cat food, coffee or razor blades. It shows the ones where the usual time between purchases has almost passed. (partly there, size L)
- **Warning before a costly month.** A month before a month that cost much more last year, the app reminds you and shows how much more it cost. Gifts are shown on their own line. (data is there, size M)
- **Did you forget to add an order.** If you shop at a place on a regular rhythm and nothing has come in for much longer than usual, the app asks you gently if you forgot to add an order. (partly there, size M)
- **Next month, category by category.** A table shows what you will probably spend next month in each category, with a low and a high number when there is enough history. One button copies a middle number into the matching row of your budget sheet, after you confirm. (partly there, size L)
- **Yearly costs spread over the months.** The app finds costs that come only once or twice a year. It shows what to put aside each month to be ready. (data is there, size M)
- **Dates to remember with gift history.** You add birthdays and other yearly dates once. When a date is two weeks away, Home reminds you and shows what you spent on gifts around that date last year. (needs new data, size L)
- **Shops you order from in a regular rhythm.** Finds shops where you order about every few days, or often on the same weekday. Shows the number of orders and what an average order costs. (data is there, size M)
- **When can I buy the bookmark.** On a bookmark with a price, the app says how many months it takes to fit it, using the free money in your own budget sheet. (partly there, size M)
- **What if you spend less next year?.** Sliders let the person spend more or less at a shop or in a category. The app shows what the next 12 months would cost if everything else stays the same. (data is there, size M)
- **Show how right the forecasts were.** At the end of each month, the app shows what the forecast would have said on day 10 and day 20, and what really happened. You can see if the forecasts are worth trusting. (partly there, size M)
- **Things you buy once a year.** The app looks for items you bought at the same shop about a year apart, such as a yearly software licence. About a month before the usual time, it shows a note with what you paid last time. You can press 'not relevant'. (partly there, size XL)

### Limits and budget

Help to set, follow and understand your category limits and your budget sheet.

- **Budget rows that are always wrong.** The budget sheet shows which rows were over or under the plan in most months, and by how much on average. It offers to change the expected amount. (data is there, size S)
- **Why did I go over the limit.** When a limit is over, the app shows the orders behind it. It says if one big order did it or many small ones. (data is there, size S)
- **Does this bookmark fit my limit.** Each bookmark with a price shows how it fits in the limit of its category, this month and next month. You see how much would be left, or how much too much. (partly there, size M)
- **Do my limits fit my income.** The app adds up all your limits and checks them against what is left after your fixed costs. It tells you if the limits are too high or if there is room. (data is there, size M)
- **Costs that went up since last year.** The app compares the rows of your budget that stay the same every month between two years. It lists the rows that cost more each month than last year. (data is there, size S)
- **Goal planner for holiday, car or move.** You add a goal with a name, an amount and a month. The app shows what to put aside each month and checks it against the free money in your budget sheet. (needs new data, size L)
- **Bank money that is not in your orders.** You link a budget row, like Groceries, to one or more categories. The app then shows how much of the bank amount is in your orders and how much is not. (needs new data, size L)
- **Unused limit moves to next month.** A category can be set to move what is left over to the next month. The category then shows the new room. (needs new data, size L, pay day)
- **Limit history: one small chart per category.** A grid with one small chart for each category that has a limit. Twelve small bars, one per month, with a line at the limit. Months over the limit are marked. (data is there, size M)
- **Your limits at retail price.** For each category with a monthly limit, shows how much you saved. It marks the months where you stayed under the limit, but would have been over it if you had paid the retail price. (data is there, size M)
- **A goal for your saved kroner.** Pick a goal, or a bookmark, and see how many of the kroner you saved on orders have added up since you set it. The app compares this with the price. It does not move any money. (needs new data, size L)
- **Where my income went.** A flow picture for one month or one year. On the left is your income from the budget sheet. The flow splits into your categories from orders, and the rest is shown as 'not in your orders'. (partly there, size L, pay day)

### Prices over time

See how the prices of the things you buy change, and where they are lowest.

- **Your own price rise since last year.** One number that shows if the products you buy often cost more or less than a year ago. It uses only products you bought in both periods, and the ones you spend most on count most. (data is there, size L)
- **Check the price while you type.** When you type a line, the app warns if the price looks like a typing slip, for example 10 times more than you usually pay for the same item. It is only a question. You can still save. (partly there, size M)
- **Price per kilo and per litre.** The app reads the pack size in the title, like 500 g or 6 x 33 cl, and shows the price per kilo or litre. You can compare a small pack and a big pack of the same product. (data is there, size M)
- **Smaller pack, higher price per kilo.** The app shows when the pack size you typed went down and the price per kilo went up. You see the old size, the new size and the price per kilo for both. (partly there, size M)
- **Price watch on bookmarks.** For bookmarks you choose, the app looks at the web page about once a day and tells you when the price falls. A small chart shows the prices it has read. (needs new data, size XL)

### Your products

Look at what you buy item by item, not only order by order.

- **Have you bought this before?.** When you look at a bookmark, the app tells you if you bought something like it before. You see how many times, the total, and the last time. (data is there, size M)
- **Your top products and usual amount.** A top list of the products you buy most, by number of times and by kr. For each one you see how many you usually buy at a time and how often you buy it. (data is there, size M)
- **Brands you buy most.** The app finds the brand in the line titles, like Arla, Lurpak or Samsung, and shows how much you spend on each brand. Lines with no brand in the title are counted apart. (partly there, size L)
- **A list of your valuable things.** One list of the valuable things the person bought, with price, date, photo and receipt, for an insurance claim. It shows the price paid, not today's value. (partly there, size L)
- **What a thing really cost to own.** When something is sold, the person links the sale to what was bought. The app shows what was paid, what it was sold for, and the cost per month of owning it. (partly there, size M)

### Savings, shipping and returns

What you save, what shipping costs, and what happens when you send things back.

- **Is your saving figure complete?.** Shows what share of your spending is on lines where you wrote a retail price. Lines without one count as no saving, so the saving shown may be higher than the real one. (data is there, size S)
- **Shipping you paid, by shop.** One number for how much you paid in shipping this year, and which shops took most of it. It also shows shipping as a share of the goods. (data is there, size S)
- **Shops where you paid shipping twice in a week.** Finds orders from the same shop, a few days apart, that both had a shipping fee. Shows how much shipping you might have saved by ordering together. (data is there, size M)
- **Free shipping level from your own orders.** When you type an order, the app shows the order size from which this shop had no shipping fee in your earlier orders. It also shows how far this order is from that size. (partly there, size M)
- **Shops where you paid less than the retail price.** A list of your shops, sorted by how far under the retail price you paid. Each shop shows the kroner saved, the percent, and how many orders the number is based on. (data is there, size M)
- **Returned, but no money back marked.** On Home, you see orders you sent back where you have not marked that the money came back. One tap marks it as paid back. (partly there, size M)
- **Shops where you wrote no saving.** Shows at each shop how many of your orders had a saving: a discount on the order, or a retail price above what you paid. For a shop with none, the app asks if there is a code or member offer you could look for. (data is there, size S)
- **Months when you save most.** Shows which calendar months you save most in, once your orders cover two years. For your favourite shops, it shows which months gave you the biggest saving. (data is there, size M)
- **Return window countdown.** For each order, the app counts the days left to return it, from the day it was marked Delivered. The person sets the number of days for each shop, and the count shows only for shops with days set. (partly there, size M)
- **A scorecard for each shop.** A card for each shop with plain numbers: how much you save against list price, what shipping costs, and how often you return. Each number says how many orders or lines it rests on. (partly there, size M)
- **Usual waiting time per shop.** For each order that has not arrived, the app shows how long you usually wait at that shop and a likely arrival day. It says so when an order is much slower than usual. (partly there, size M)
- **How often you send things back.** For each shop, shows how many of your orders are marked as sent back. The words are calm: some people order two sizes on purpose. (data is there, size S)
- **Your returns at this shop.** When the person starts a new order at a shop, the app shows how many earlier orders from that shop they marked as Returned. It shows only the count. (data is there, size S)
- **What rounding up would give you.** Shows how much you would have put aside if you had rounded up each order to the next 10 kr. You can try 5, 10 or 50 kr. (data is there, size S)

### Buying habits

Learn how and why you buy, and set small rules for yourself.

- **Are you glad you bought it?.** A few weeks after an order is marked as delivered, the app asks one small question: are you glad you bought it? Over time you see which shops you are happy with. (needs new data, size L)
- **Wait a few days before big buys.** Bookmarks with a high price show a small countdown, such as "Day 3 of 7". When it ends, the app asks: do you still want it? (partly there, size M)
- **Mark a bookmark as bought.** When you save an order with a link that matches a bookmark, the app asks if this is that bookmark. One tap moves it out of your list. You can also start an order from a bookmark, with its name, price and link already filled in. (partly there, size M)
- **How long you wait before buying.** Shows how many days passed between saving a bookmark and buying the thing. It also shows how many of the things you bought with a link had been saved first. (partly there, size M)
- **What your year costs in work hours.** Next to a shop or category total, the app shows how many hours of work it cost. The person types their hourly pay after tax once, and can switch the hours off. (partly there, size S, pay day)
- **Your busy shopping periods.** Finds weeks when you bought much more than in a normal week, and shows how big they were. It shows the shops and the total, with no judging. (data is there, size M)
- **Gifts compared with normal buys.** Shows month by month how much was marked as gifts and how much as normal buys, next to the same month one year earlier. (data is there, size M)
- **Trip mode with a daily cost.** The person adds a trip with a name and dates. The app collects the orders in those days and shows cost per day and per category. (partly there, size M)
- **Gift memory for each person.** When a Gift is saved, the person writes who it is for. The app then shows what each person got before, so the same gift is not given twice. (needs new data, size M)
- **A pause you choose yourself.** You choose a pause, such as 30 days without Zalando or without all shopping. Home counts the days. If you buy, the app just offers to start again. (needs new data, size L)
- **Your own treat categories.** You mark which categories feel like a treat, such as sweets or restaurants. The app shows how much you spend on them and on which weekdays. (needs new data, size M)

### Compare periods and seasons

Set this month, this season or this year next to an earlier one.

- **What moved since last month.** A short list that explains why this month is higher or lower than last month. Both months count the same days. It names the categories, shops and single orders that caused most of the change. (data is there, size M)
- **Each category: now, last month, last year.** A table with one row for each category. Each row shows this month so far. Next to it are the same days of last month, the same days one year ago, and the average for those same days over the last 12 months. (data is there, size M, pay day)
- **Which days of the month cost most.** Bars for day 1 to day 31 show the average spent on each day of the month. One switch changes the bars to Monday through Sunday. (data is there, size S, pay day)
- **Spending at holidays and seasons.** A page that shows what you spent around Easter, the summer holiday, Black Friday and Christmas, year by year. Each season is set next to a normal stretch of the same length. Accounts in kroner also get school start and the autumn holiday. (data is there, size M)
- **A look back before each season.** About six weeks before a season starts, such as Christmas, Easter or the summer holiday, Home shows what you spent in that season last year and which two weeks were busiest. A button opens last year's orders, and you can close the card. (data is there, size M)
- **Which months each category peaks.** A table with your categories down the side and the months across. Dark cells show the months where a category costs much more than its normal month. (data is there, size M)
- **Savings in sale weeks.** For Black Friday, the January sale and the summer sale, the app compares how much you saved in those weeks with the rest of the year. It also shows how much more you bought in those weeks. (partly there, size M)
- **How often you visit each shop.** On each shop's page, you see how often you buy there, how long ago your last order was and your longest break. (data is there, size S)
- **Me against an average Danish household.** For each spending group such as food, clothes, home and electronics, the app shows what you typed in for a year next to the average for Danish households. You can say what kind of household you live in. (needs new data, size L)

### Pictures and charts

New ways to see your spending as a picture.

- **Your year in plain facts.** One page with simple facts about a year or a month: busiest day, biggest order, shop with the most orders, longest time without orders, most lines in one order. Each fact opens the orders behind it. (data is there, size M)
- **Year calendar coloured by spending.** One small square for every day of the year. A darker square means more spending that day. Open a square to see the orders from that day. (data is there, size M)
- **Top 10 lists with rank changes.** Top 10 shops and top 10 categories for a month or year. Each row has an arrow: up, down, new, or same place as the period before. A third list shows the 10 biggest single orders. (data is there, size S)
- **Tiny monthly bars on every shop and category.** In the shop list and the category list, each row gets a very small chart with one bar for each of the last 12 months. You see at once which shops and categories you use more or less. (data is there, size M)
- **A timeline for each shop.** On a shop's page, a line of dots from the first order until today. Each dot is one order and a bigger dot is a bigger amount. Gaps show when no order was written down for that shop. (data is there, size M)
- **Wall of receipts and photos.** A grid of all receipt pictures and photos of things you bought, newest first. Filter by shop or year. Open a picture to see its order. Orders with no receipt show as empty tiles. (data is there, size M)
- **Category bands month by month.** A picture where each category is a coloured band, month after month. A wider band means more spending in that category that month. Orders with no category get their own grey band. (data is there, size L)

### Fun and stories

Playful cards, games and small rewards made from your own orders.

- **A daily fact about your own spending.** A small card on Home shows one true fact about your own orders each day. It changes tomorrow. Each fact links to the orders behind it. (data is there, size M)
- **A look back at this day.** A small card on Home shows what you wrote in around this day in an earlier year, with your note and a receipt preview if you have them. It only shows when there is something to show. (data is there, size S)
- **A year ago this week.** A small card on Home shows what you bought in the same week one and two years ago. It is a fun memory and a quick look at what comes back every year. (data is there, size S)
- **A passport with a stamp per shop.** Every shop you have ordered from gets a stamp with the date of your first order and how many orders you have written in. Tap a stamp to see your story with that shop. A new stamp appears when you save an order in a new shop. (data is there, size M)
- **A picture made from your year.** Each day of the year becomes a small square, coloured by your biggest category that day. Days with no order are pale. You get a picture that is only yours, and you can save it as an image. (data is there, size L)
- **A short quiz about your own orders.** Ten quick questions made from your orders, like 'Which cost more?' or 'Which shop was this?' from the item names. There is no timer and no prize. It is a small game that shows you your own past. (data is there, size M)
- **A monthly letter about your spending.** In the first days of the month, Home shows a short, friendly letter about last month. You can open a list of the exact numbers it is based on. If the letter cannot be written, you see a plain text with the same numbers. (partly there, size L, pay day)
- **A playful name for how you shop.** Each quarter the app gives you a friendly name, like Regular, Bargain Hunter or Weekend Shopper. It always shows the three facts behind the name, and you can see all the names and what it takes to get each one. (data is there, size M)
- **A shelf of badges to earn.** Small badges for things you have really done: your 100th order, a month with every receipt saved, three months inside all your limits, your first return. Badges you have not earned show how far you are from them. (partly there, size L)
- **Small monthly challenges you choose.** You pick a challenge for the month, like 'Matas under 300 kr.' or 'every order typed in within 3 days'. A small bar on Home shows how it goes, and at the end of the month you see if you made it. (needs new data, size L, pay day)
- **Weeks in a row with every receipt.** A counter shows how many weeks in a row you attached a receipt to every order. Weeks with no orders are skipped. Your best run is kept. You switch it on in Settings. (data is there, size S)
- **Share cards without private details.** You can make a small picture to send to a friend. By default it shows only counts and weeks, never shop names or amounts. You see a preview and choose what is on it before you save it. (data is there, size M)

### Faster order entry

Less typing when you add orders, receipts and bank payments.

- **Fill in a line from your own history.** When you type a line title, the app offers your earlier lines. One tap fills in the title, the last price and your usual quantity. The list price stays empty. If the price you type is far from your usual price, the app asks if it is right. (data is there, size M)
- **Suggest categories from the line titles.** When you add an order, the app suggests categories from the words in the line titles and the shop. You accept or change the suggestion with one tap. (data is there, size M)
- **Shop fills in kind and categories.** When you pick a shop, the form fills in the kind and the categories you usually use at that shop. You can change every choice. (data is there, size S)
- **Match bank payments to orders.** When you import a bank statement, each payment is shown with the order it most likely belongs to. You confirm with one tap, and payments with no order and orders with no payment are listed. (partly there, size L)
- **Make draft orders from payments.** Payments on your statement that match no order can become draft orders in one tap, with shop, date and amount filled in. You add the lines later, or never. (needs new data, size L)
- **Forward a receipt by email.** Each account gets a private email address. You forward a receipt or an order email to it, and a draft order appears in the app for you to check. (needs new data, size XL)
- **Clean titles for scanned receipt lines.** Scanned receipts print short shop text like 'ARLA LMJ 1L'. The app suggests a clear title in the way you write your own lines. You can accept it or change it, and the receipt text stays visible. (data is there, size M)
- **Add a receipt to an old order.** You typed only a total, and later you find the receipt. Attach it and the app proposes the real lines. You see the difference to your total before anything changes. (data is there, size M)
- **Ask before making a second shop.** When you type a shop name that is close to one you already have, the app asks before it makes a new shop. If you say yes, the typed name is kept as another name for that shop. (data is there, size M)
- **Send a receipt from the share menu.** On an Android phone you can send a photo or a PDF to Spendly from the share menu. On an iPhone you do the same with a Shortcut you add once. The new order page opens with the file ready to read. (partly there, size L)
- **Clean up lookalike line titles.** One page groups line titles that mean the same thing but are typed in different ways. You choose the title you like and all lines in the group change in one step. (data is there, size L)

### Checks on your data

Warnings and lists that help you find mistakes and gaps in your orders.

- **This order is much bigger than usual.** When you save an order that is far above what you normally spend at that shop, the app tells you. On Home, the biggest surprises of the month are listed with the usual amount beside them. (data is there, size M)
- **A list of gaps in your data.** One page lists what is missing in your orders: no receipt file, no category, still a draft, a price of 0, and shops that look alike. Each line shows a count and opens those orders. (data is there, size M)
- **Show what each number is based on.** Next to an average or a limit warning, a small Why link opens the orders behind it. It says in plain words how the number is made, and how many orders and months it uses. (data is there, size L)
- **Big purchase with no receipt.** The app lists your larger purchases that have no receipt saved, with the age of each. You can add the receipt now, so you have it if the item breaks. (data is there, size M)
- **A category now costs more or less every month.** The app finds a lasting change in a category, not just one big month. It shows the month it began and how much more or less you spend per month now. (data is there, size M, pay day)
- **Which months have no receipts.** A row of months shows how many orders in each month have a receipt file. Tap a month to see the orders that have none. (data is there, size S)
- **You are back at a shop after a long time.** When you add an order at a shop you have not used for a long time, the app shows what you bought there last time. This helps you remember and compare. (data is there, size S)
- **See how often you change what the reader wrote.** A small page counts the receipts the reader has read, and how many of them now differ from what it wrote. It also reminds you that scanned pictures go to an outside company when reading is on. (partly there, size M)

### Your data and your files

Take your data out, clean it up, share it or remove it safely.

- **Take everything with you in one file.** One button makes a zip file with your orders and lines as a spreadsheet, plus your shops, categories, budget, bookmarks and all receipt files. Orders and their files can be read back into Spendly. (data is there, size L)
- **Remove data for good, with a preview.** Choose what to remove: one shop, a date range, the saved reader copies, or the whole account. Before anything goes, the app says how many orders, lines and files will go. (data is there, size L)
- **A year pack for your accountant.** Pick a year and a kind such as Work. You get a spreadsheet and the receipt files, named so they match the rows. Orders with no receipt file are listed first. (data is there, size L)
- **Show odd dates and amounts before importing.** Before the file is saved, the app shows the first and last date in the file, how many dates are in the future, and how many prices are 0. If the dates can be read two ways, it shows one date both ways. (data is there, size S)
- **More filters and smarter search for orders.** New filters for the order list: weekday, day of the month, number of lines, shipping paid, has a note, has a link, refunded. Search also understands 'over 300' and 'under 50'. (data is there, size L)
- **Shared household with two accounts.** Two people link their accounts and mark only some orders as shared. Both see the shared total, and private orders stay private. (needs new data, size XL)

### Work costs, claiming money back and tax help for freelancers and employees

- **Your work costs this month and year.** One card shows how much you spent on orders marked Work this month and this year. A page shows each month, each shop and each category. (data is there, size M)
- **A work cost list for your employer.** Pick a month and get one clean list of your Work orders: date, shop, what you bought, amount and order number. Print it or save it as a spreadsheet, and send it to your employer. (data is there, size M, pay day)
- **Mark work costs as paid back.** On a Work order you say if you are waiting for money back, and on which day it came. Spendly shows how much you still wait for and how much has come back this year. (needs new data, size M)
- **A reminder for work costs not paid back.** On Home, a line tells you when Work orders have waited a long time for money back. You choose how many days to wait before the line shows. (needs new data, size S)
- **The VAT part of Work orders.** Spendly shows how much of a Work order is VAT (moms), using the rate you set. A page adds up the VAT for a month, a quarter or half a year. (needs new data, size L)
- **Work costs and a yearly tax amount.** Some tax rules only count work costs above a set yearly amount. You type that amount once. Spendly shows how far your Work orders are from it. (partly there, size M)
- **Work costs for each client.** Give a Work order a client or project name. Then see one list per client with the sum, so you can add the costs to your invoice. (needs new data, size M)
- **Add a drive as a work cost.** A short form for a drive: from, to, kilometres and how many times. It makes a Work order with one line: kilometres times your rate per kilometre. (partly there, size M)
- **Orders that may be Work orders.** Spendly shows orders marked Expense that look like orders you marked Work before, for example from the same shop. You look at each one and change the kind with one tap. (partly there, size M)

### Things you sell, second-hand buying and net cost after resale

- **What you earned from selling.** A small page adds up the orders you marked as Sold, by month and by year. It shows the number of sales and the shop or website named on each one. (data is there, size M)
- **Spending with your sales taken out.** A switch in Statistics and limits counts a Sold order as money back, not as spending. The month then shows what you spent, what you sold and what is left. (data is there, size L)
- **Link a sale to what you bought.** On a Sold order, each line can point to the line you bought earlier. Spendly suggests likely matches from the titles, and you confirm with one tap. (needs new data, size L)
- **What it cost after you sold it.** On a bought line that you have sold, Spendly shows what you paid, what you got and what is left. It also shows how long you had it. (needs new data, size M)
- **Old things you paid a lot for.** If you switch it on, Home shows things you bought long ago for a high price and have not sold. You can open the list, mark one as sold, or say it is not for sale. (partly there, size L)
- **What you usually get back when you sell.** For each category, see what share of the price you got back when you sold, and how many sales it rests on. A bookmark with a price shows a careful range for its cost after you sell it. (needs new data, size M)
- **How much you buy second-hand.** Mark a shop or website as second-hand, for example DBA or Trendsales. Then see how much of your spending is second-hand, by category and by year. (needs new data, size M)
- **Draft a sale text for an item.** On any bought line, a button writes a short sale text in Danish or English. It uses only what you stored. You add the condition, read it and copy it. (data is there, size S)
- **Your sales and your bookmarks.** One line on the sales page compares your sales this year with the prices of your bookmarks. It names the cheapest bookmarks that fit inside that amount. (data is there, size S)

### What happens after you order

- **Orders not marked as delivered yet.** See every order that is not marked as delivered, with the days since you ordered. Each row has a button to say it arrived and to pick the day. (data is there, size M)
- **Drafts you never finished.** Home tells you when you have drafts older than 7 days. You open the list of drafts and finish, cancel or delete them. (data is there, size S)
- **Orders you cancelled and their value.** See how many orders you marked as cancelled, at which shops, and what they were worth. Cancelled orders are left out of all totals, so they are easy to forget. (data is there, size S)
- **Write to a shop about a missing refund.** When a returned order is not marked as paid back after some days, Spendly shows how long you have waited. It also gives you a short message to copy and send to the shop. Each returned order gets a box to tick when the money is back. (partly there, size M)
- **When the 2 years to complain end.** For bigger things you bought, Spendly shows the day your 2 years to complain about a fault end. You get a note 60 days before, and a check that a file is saved on the order. (data is there, size M)
- **A reminder day on an order.** Add an optional day and a short note to an order, for example the day a free trial ends or the last day to return. Spendly shows it on Home when the day is near. (needs new data, size M)

### Projects and life events across categories

- **Gather orders into one project.** Make a project like Moving or Baby. Add any orders and bookmarks to it and see one total. (needs new data, size L)
- **Use a saved search as a project.** Save a search, for example the word "maling" from March to May. Next to the saved search you see how many orders match and what they cost. You do not have to tag anything. (data is there, size S)
- **Find past projects in your history.** Spendly looks back for short periods with many orders at a few shops or in a few categories. It asks if this was a project, and you can name it in one tap. (partly there, size M)
- **Plan against paid, part by part.** Give a project parts, like Venue, Food and Flowers, with a planned amount for each. See what is paid, what is left and which part is over. (needs new data, size L)
- **See what is still on the list for a project.** Put bookmarks into a project. See what you have already bought, what is still on your bookmark list and what the project may cost in all. (needs new data, size M)
- **See a month with and without a big project.** Mark a project as a one-off. Home and Statistics then show the month with it and without it. A wedding month does not look like a failed month. (needs new data, size L)
- **Before and after a life event.** Tell Spendly the day of a baby, a move or a new job. See which categories cost more or less in the months after, compared with the months before. (partly there, size M)
- **Settle up a shared project.** For a project you share with a partner, type in what your partner paid and choose your share. See one number: who owes whom. (needs new data, size M)

### Places outside the app

- **Hide all amounts with one tap.** A button in the top bar covers every amount with stars. Tap one amount to see it for a few seconds, then it hides again. (data is there, size L)
- **Choose how much a notice may tell.** One setting for every message sent outside the app: phone notices, calendar lines and widget lines. The lowest level, which is the start level, shows no shop, no category and no amount. (needs new data, size S)
- **Shortcuts when you press the app icon.** Press and hold the Spendly icon on the home screen. A short list opens with New order, Scan receipt and Search. (data is there, size S)
- **Left in each limit, readable with no signal.** A plain page with big lines: each limit with a bar and what is left this month. It keeps the last figures on the phone, so it opens without signal, and it always shows the date of the figures. (partly there, size L, pay day)
- **A private link for a phone widget.** Make a private link in Settings. A widget app on your phone or watch shows one short line from it, with no amounts unless you allow them. (needs new data, size L, pay day)
- **A phone notice when a draft is ready.** You send a receipt to be read and leave the app. When a draft order is ready, your phone shows a short notice. (needs new data, size XL)
- **A weekly reminder on the day you choose.** Choose a weekday. On that day Spendly sends a short message with plain counts of what needs a look. If the counts are zero, nothing is sent. (partly there, size L)
- **Your dates in the phone calendar.** Add a private calendar link to your phone calendar. It shows a line on the day an order has waited 14 days for delivery, and on the first day of each month. (partly there, size M)
- **Ask short questions by voice or by typing.** Type a short question, or press the microphone and say it. Spendly shows the answer and can say it aloud. (data is there, size L)
- **Listen to last month in 20 seconds.** A Listen button on last month's summary card reads it aloud: money spent, money saved and which limits went over. It helps a person who finds listening easier than reading. (data is there, size S, pay day)

### Fast, low-effort logging that forgives gaps, for ADHD-style, busy and forgetful users

- **Add an order in five seconds.** Pick a shop, type an amount and press Enter. The day is today. The shop's usual categories are added if you have set them. You can add details later. (data is there, size M)
- **Same order again in one tap.** Home shows the orders you repeat, as buttons. One tap saves a new order with today's date and the same lines. You can undo it or change it at once. (data is there, size M)
- **Press and hold the app icon to start fast.** Add Spendly to your phone's home screen. Then press and hold its icon to see a short menu: Add order, Add receipt and Copy an order. You skip the first screens. (data is there, size S)
- **Pick a recent day with one tap.** Under the date, small buttons show the last seven days, for example Today, Yesterday and Friday. One tap sets the day. When you add more orders in a row, the day you used last is offered as a button too. (data is there, size S)
- **Keep the order you were typing.** If something interrupts you, the half-typed order is kept. When you open New order again, Spendly offers to continue. (data is there, size S)
- **A short catch-up once a week.** One page shows the small jobs left from the last 7 days, one at a time, with Done and Later. It stops after 10 jobs and says that is enough for now. (data is there, size M)
- **How many weeks you typed in orders.** A small line shows in how many of the last weeks you added an order. It is a count, not a streak. A quiet week is only a quiet week, and nothing ever shows zero or a broken streak. (data is there, size S)
- **A calm view with fewer numbers.** One switch in Settings gives a quiet Home. It shows one sentence about the month and hides percentages, red colours and limit warnings. (partly there, size L)
- **Add a whole pile of receipts.** Pick many receipt photos or PDFs in one go. Each one becomes a draft order with the receipt attached, and you check them one by one. (data is there, size L)

### What each account size gets

- **What Spendly can show you so far.** A page lists each insight and says if it is ready. A locked one says how many months or orders are missing, and offers to import older orders. (data is there, size M)
- **Only show changes that matter.** Home lists up to five changes from last month. It shows a change only when it is big for your account. A big account needs a bigger change than a small one. (data is there, size M)
- **All your years in one table.** One row for each year: orders, spent, saved, shops and biggest month. Click a row to open that year. (data is there, size S)
- **Fold away shops you stopped using.** In a long list of shops, the shops with no order for 12 months fold into one line. Search still finds them. (data is there, size M)
- **Group everyday orders by week.** A list view where orders from one shop in one week, with the same status and kind, become one row. Open the row to see each order. (data is there, size L)
- **Tidy old orders, one shop at a time.** Spendly finds orders with no category. For each shop it asks one question: give them the category you usually use for this shop? (data is there, size M)
- **Records since you started.** A page of records from your own orders: the biggest order, most orders in one day and the longest time without an order. Each record shows when it unlocks. (data is there, size M)
- **Take old receipt files out of Spendly.** Spendly shows how much space receipt files use in each year. You can download an old year, then remove its big files. The orders stay, and so does a small preview where there is one. (partly there, size XL)
- **A clear label on demo data.** When the account holds demo data, Home, Statistics and the lists say so. One button removes only the demo orders, and what you typed in yourself stays. (partly there, size L)

### Facts from outside the person's own orders

- **Your prices against national prices.** For each category, see how the price of things you bought more than once changed over about a year. Next to it, see how Danish prices changed for the same kind of goods, with the source and the date. The page also says how many things it used. (needs new data, size L)
- **Orders in other currencies.** Add an order in pounds, dollars or euros. Spendly keeps the amount you typed and shows what it was in your own currency on the day you bought it. You can type the exact amount your bank took instead. (needs new data, size L)
- **Late warning without weekends and holidays.** The late-delivery warning on Home counts working days only. Weekends and Danish public holidays do not count. A long Easter or Christmas then does not give a false warning. (data is there, size S)
- **Holidays marked on your charts.** On the charts that show days or weeks, Danish public holidays and school breaks are marked with a thin band and a short name. A high week then has something next to it to look at. It only marks the days and does not say they caused the spending. (partly there, size M)
- **Last year's spending in today's prices.** Compare a month or a year with the same time one year earlier, after Danish prices in general are taken out. You see how much of the change may come from higher prices. It is a rough guide, not an exact answer. (needs new data, size M)
- **Things you can still complain about.** A list of the things you bought that you can probably still complain about if they are faulty. Each one shows the last day we are sure of and has a button to open the receipt. (data is there, size M)
- **Check your orders against product recalls.** When a Danish authority recalls a product, Spendly looks at your orders from the last months. If a line may be the same product, you get a note and a link to the notice. (needs new data, size XL)
- **Electricity bill next to the market price.** Pick the budget row that holds your electricity bill. Spendly shows the average market price of electricity for each month next to it. This gives you something to look at when a bill is high. It does not say the price is the reason. (needs new data, size L)
- **How much of your spending was VAT (moms).** A small figure on the statistics page: about how much of what you paid in a month or year was Danish VAT. For orders marked Work, it also shows the part you may be able to get back if you have a company with VAT. (data is there, size S)
- **Do you shop more when it rains?.** A playful chart that puts your order days next to the weather. See if you order more on rainy, cold or dark days. It shows a link, not a reason. (needs new data, size L)

### Left out on purpose

- **Does the weekend after pay cost more.** Groups of 4 to 6 months are too small to tell a habit from chance, and the data cannot show that the weekend is the cause.
- **Let Spendly guess your pay day.** The person can give the pay day in one answer, a bank file is rarely open, and a jump in spending is not a pay day, so the guess would often be wrong.
- **A pay-day letter with last month.** Spendly cannot send email today (the server only writes to its own log and no code uses the email switch), and the Home card repeats the pay month summary in the pay month idea.
- **Pay day countdown on Home.** The next pay day is already shown in the pay day setting and in the limit-per-day idea, and the pay month length is a number that changes nothing the person does.
- **Quiet days and longest break.** It measures gaps in typing, not in spending, it rewards typing in fewer receipts, and the year calendar already shows empty days.
- **Last day to order for Christmas.** A new order is pre-filled as Delivered with the typing day as delivery date, so most delivery dates are not real and cannot be told apart from real ones.
- **Chance of a big buy next month.** An order over 3 times the median is hit in almost every month for accounts with many small orders, and the range in the month forecast already shows room for big buys.
- **A smarter forecast for big accounts.** Two years of weekly spend is about 100 points per account, too few for a trained model, the order date may be the typing day, and the simple same-month-last-year mix in the other forecasts gives most of the gain for a fraction of the cost.
- **What a product costs per month of use.** The product page already shows both dates and prices, and a tap on every line plus rare matching titles for long-lasting things make it not worth building.
- **Is this the same product?.** It is the confirm step already inside 'One page for each product', not a separate idea.
- **Days in a row without a purchase.** A streak game rewards leaving purchases out of the app, which damages the record it depends on, and idea 10 gives the same count when the person chooses it.
- **Reasons hidden in your notes.** Most orders have no note, it sends private text to an outside company for a small gain, and a simple reason tick chosen by the person gives the same figures.
- **Buy more, pay less per piece?.** It needs 3 single-piece and 3 multi-piece lines with the same title at one shop, which almost no account has, and a price gap over time or from offers looks the same as a gap from buying more.
- **Wait-for-sale hint on bookmarks.** It stacks three guesses (the shop from the web address, a month pattern from two years of orders, a sale that may not repeat), needs 24 months of history, and a bookmark has no shop field, so a plain line inside the saving months idea does the same job more honestly.
- **What if my limit was different.** The category form already warns when a typed limit would have been passed in most of the last 12 months, and a count for any value fits as one line in budget-1.
- **Free money for each month.** The budget sheet already has a Left over row for every month, in red when it is below zero.
- **Your spending in everyday things.** The app keeps accounts in kroner, euro, dollar or pound, and a price list kept by hand goes out of date and compares a person's spending to cinema tickets, which can feel like blame.
- **A timeline of your months.** The month headlines repeat the year cards, the records and the shop stamps, and a long page of rule-picked sentences is thin for a small account and needs paging for a large one.
- **Price fell after you bought it.** It needs a daily check of other shops' web pages, which the app cannot read reliably or prove shows the same size, colour and price, and few lines have a web address.
- **Orders that look different from the rest.** It repeats idea 1 and the rare-shop part of idea 4 with a method that cannot give a true reason for each order, so the plain words could not be trusted.
- **My own prices against inflation.** The personal price rise rests on free-text titles and 14 months of history that few accounts have, and the national figure needs a public table kept up to date by hand, so the number cannot be shown as a fact.
- **Me against other users, if I agree.** It answers the same question as the household average idea, but needs hundreds of opted-in accounts to reach a safe group size and puts private data into shared numbers, while the household average is cheaper and carries no privacy risk.
- **What others pay for the same thing.** It needs at least 10 accounts per item, shop and month on free-text titles, which is out of reach, and different pack sizes under one name would make the shown price range untrue.
- **A day-by-day bar for this month.** Statistics already draws every day of this month with today marked and shows the same days of last month beside each figure, so only a faint overlay would be new.
- **Rough carbon guess per category.** The data cannot tell what was bought, so a carbon number from kroner can be wrong by several times and even a wide range would give false comfort.
- **The app notices big life changes.** Guessing a baby, a pet or a move from item titles is creepy and often wrong (a baby gift is not a baby), and it only tells the person what they already know.
