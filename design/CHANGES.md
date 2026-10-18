# Weekly and monthly status email

## Fixed from design_handoff_status_email

- Status email is now its own card in Account and profile, under the account card, rather than a field inside it.
- The switch spans the card: a new variant, `.sp-segmented--fill`, documented in Components c5.
- A Send a test email button in the card's footer, and a Send a test email row under the inline switch on the phone.

The brief: a status email the user can set to None, Weekly or Monthly, with a fast overview of stats, categories, orders, bookmarks and limits exceeded, plus the budget in the monthly one, without income.

## 1. The status email

**The problem.** Spendly sent only transactional emails. There was no way to get an overview of a period without opening the app, and 8b stated that alerts arrive in the app only.

**What changed.** One template for both frequencies, on the layout picked from five candidates (1a: tiles, then one card of lists). In order:

- the period ("Your month, September 2026" / "Your week, Week 42, 12 - 18 Oct 2026")
- three tiles: Spent with the comparison by amount ("4.210 kr. less than August"), Saved (green, grey when 0), Orders
- limits exceeded, in the amber attention box: "12.640,00 kr. of 10.000,00 kr.", "+26% over the limit", and a bar. In a weekly email the limit is the calendar month so far: "11.260,00 kr. of 10.000,00 kr. in October so far"
- Budget, monthly only, costs only: last month's real costs against expected ("7.612,40 kr. of 7.946,98 kr. expected", "334,58 kr. under"), and the costs expected in the new month. Income and Left over are never sent
- top 5 categories with amounts and bars
- the latest 5 orders, each with its saving under the amount ("Saved 995,00 kr.", green; "Saved 0,00 kr.", grey)
- bookmarks added in the period
- Needs a look (drafts, orders not delivered after 2 weeks, possible duplicate vendors)
- Open Spendly, then a footer naming the setting, with Change it in Settings and Stop these emails

A section with nothing in it is left out. A period with no orders sends `status-quiet` instead: "Nothing spent this week", "No orders were added between 19 and 25 October.", any limits, the budget (monthly) and Needs a look.

Weekly is sent Monday at 08:00 for Monday to Sunday just ended; Monthly on the 1st at 08:00 for the month just ended, both in the account's time zone.

**Where.** `emails/status.html`, `status.txt`, `status-quiet.html`, `status-quiet.txt`, `status-sample.json`; fields and rules in `emails/README.md`. Drawn as specimens 5, 6 and 7 in `Auth and first run.dc.html` 20f, with notes. Built like the auth emails: tables, inline styles, VML button and mark for Outlook, the dark block mapped to the dark tokens. The templates use Mustache sections; the 20f specimens merge the sample JSON with a minimal renderer in the page's logic.

**Decided.** The tile figure is 24px, a size new to the emails (the auth emails top out at 15px). Both emails are sent at 08:00 in the account's time zone.

## 2. The setting

**The problem.** There was no place to choose the email, and no way to see it without waiting for Monday or the 1st.

**What changed.** A Status email card in Account and profile, directly under the account card. It reads "What you spent and saved, limits passed, your latest orders and bookmarks, sent to mikkel@example.net. Weekly arrives on Monday, Monthly on the 1st." Under it, None, Weekly and Monthly on a Segmented that spans the card, the options sharing the width. None is the default for every account; the drawing shows Weekly selected. It saves on change. Stop these emails in the email sets it to None without signing in, from a single-use link.

Send a test email, a block outline button in the card's footer, sends the email for the period just ended to the account's address now, with the real figures, in the frequency selected (the weekly one on None). The subject starts "Test:". While sending it reads Sending... with the spinner, disabled; then a toast, "Test sent to mikkel@example.net", or the danger toast "The test could not be sent. Try again." The server allows one test a minute.

On a phone the same Segmented sits inline in the Settings list after Passkeys, with a Send a test email row under it that behaves the same.

**Where.** `Settings and import.dc.html` 11a (card and notes); `Mobile screens.dc.html` (Settings frame, the two rows, and a note); `Components.dc.html` c5 (the Fill note); `styles/components.css`, `.sp-segmented--fill`. App: `react/src/pages/Settings*` account pane; a server job for the two schedules at 08:00 in the account's time zone; the test and unsubscribe routes.

## 3. The alerts note

**The problem.** 8b said "There is no email", which this change makes untrue.

**What changed.** The note now says there is no phone notification and no email per alert, and that a limit passed is also listed in the status email when one is chosen.

**Where.** `Duplicate and alerts.dc.html` 8b, notes.

## 4. First run cards stand the same height

**The problem.** In 20d, the This month and Your categories cards beside each other were different heights.

**What changed.** The row stretches its cards to the taller one. A new utility, `.sp-stretch { align-items: stretch; }`, beside `.sp-top`; no component rule changed.

**Where.** `Auth and first run.dc.html` 20d; `styles/components.css`, `.sp-stretch`.

## later.md

Read on main before the task. Its one entry (51 design checks not held against the app) is app-side, not a design fix, so nothing here settles it.

## Files

- `README.md` - the design's overview, unchanged
- `CHANGES.md` - this note
- `Auth and first run.dc.html` - 20f status email specimens and notes, 20d equal-height cards
- `Settings and import.dc.html` - 11a Status email card, test button and notes
- `Components.dc.html` - c5, the Fill variant of Segmented
- `Mobile screens.dc.html` - Settings frame, Status email row and test row
- `Duplicate and alerts.dc.html` - 8b note
- `emails/` - the four auth emails (loaded by 20f), `status.*`, `status-quiet.*`, `status-sample.json`, `README.md`
- `support.js`, `components.js`, `icons.js` - loaded by the pages
- `styles/tokens.css`, `styles/components.css` (adds `.sp-stretch` and `.sp-segmented--fill`), `styles/doc.css`
- `styles/pages/auth-and-first-run.css`, `settings.css`, `budget.css`, `mobile-screens.css`, `duplicate-and-alerts.css` - linked by the pages above

## Check

`styles/check.js`: 0 finding(s) across 26 pages.
