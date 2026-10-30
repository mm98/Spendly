# The status email names the period of a yearly limit

The brief: the package "A category limit for a month or a year" (`handoff_limit_period`, section 5) says the weekly email states each limit for its own period, but `design/emails/` was not changed. A yearly row reads "64.300,00 kr. of 60.000,00 kr." with no period.

The emails are main's `design/emails/` as of 2026-10-30T13:17Z with only this package's changes. `Auth and first run.dc.html` is the copy from `handoff_limit_period`, which is not on main yet, with this package's note added. Take that package first.

## 1. status.limitSpent names a yearly limit's year

- **The problem:** the phrase only knows the email's period. A yearly row has no period, and in a monthly email it reads as that month's spend.
- **What changed:** a yearly row names its year in both the weekly and the monthly email: "64.300,00 kr. of 60.000,00 kr. in 2026 so far", in Danish "i 2026 indtil nu". A monthly row is unchanged: "... in October so far" in the weekly email, no period in the monthly email.

  English:

      {spent} of {limit}{limit_period, select, year {{limit_year_ended, select, yes { in {limit_year}} other { in {limit_year} so far}}} other {{period_kind, select, week { in {scope_month} so far} other {}}}}

  Danish:

      {spent} af {limit}{limit_period, select, year {{limit_year_ended, select, yes { i {limit_year}} other { i {limit_year} indtil nu}}} other {{period_kind, select, week { i {scope_month} indtil nu} other {}}}}

- **Where:** `emails/language/en.json` and `emails/language/da.json`, `status.limitSpent`. It is used by `status.html`, `status.txt`, `status-quiet.html` and `status-quiet.txt`, and their markup does not change. Auth and first run 20f, the weekly email note.
- **What is still open:** nothing.

## 2. Once the year has ended, the row drops "so far"

- **The problem:** in the December monthly email the year is over, so "so far" is wrong.
- **What changed:** a new row value, `limit_year_ended`, is `yes` when the email's period ends on 31 December of `limit_year`, and `no` otherwise. That covers the December monthly email and a weekly email whose Sunday is 31 December. Then the row reads "64.300,00 kr. of 60.000,00 kr. in 2026", in Danish "i 2026". `limit_year` is the calendar year of the period's last day, so a week from Monday 29 December to Sunday 4 January measures the new year. It is passed as a string, "2026", so the number format never writes "2.026".
- **Where:** `emails/README.md`, the status values (`limits[]` gains `limit_period`, `limit_year` and `limit_year_ended`; the `scope_month` line no longer says limits are monthly). `emails/status-sample.json` gives every limit row `limit_period: "month"`, `limit_year: "2026"` and `limit_year_ended: "no"`. App: the status email's row builder, which already carries `limit_period` and `limit_year` and now adds `limit_year_ended`.
- **What is still open:** nothing.

## later.md

Read on main before the task. Its only entry, "A deleted record should not be removed for good at once", is marked as an idea for later and is not part of this package.

## Files

- `README.md` - the design overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `emails/language/en.json`, `emails/language/da.json` - `status.limitSpent`.
- `emails/README.md` - the three row values and the rule.
- `emails/status-sample.json` - the new row values in the samples.
- `Auth and first run.dc.html` - 20f note. It is the `handoff_limit_period` copy plus this note.
- `support.js`, `view.js`, `components.js`, `icons.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/auth-and-first-run.css` - loaded by the page, main's, unchanged.

## styles/check.js

0 finding(s) across 28 pages
