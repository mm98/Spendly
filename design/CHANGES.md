# Spendly - changes since handoff_2026_10_07d_changes_fixed

Copy these files over handoff_2026_10_07d_changes_fixed.

## 1. Edit order: Status is a select, and each status has its own date (Order editing layouts 1d)
- Status is a combobox (`sp-combobox`), not a segmented control. Statuses are custom per user, set up in Settings: names, count and order differ between users. The options are that user's statuses in Settings order. The names in the mockup (Draft, Ordered, Delivered, Returned, Cancelled) are example data; no status name is special in code.
- Each status is mapped to a date in Settings: either the order's Date, or a date of its own.
  - A status mapped to the order's Date (Ordered in the example) shows nothing extra.
  - A status with its own date shows a date field under Status, labelled with the status name ("Delivered"). Date only, no time.
- Picking a status with no date yet fills in today, with the help line "Set to today. Change it if it happened earlier." Picking a status that already has a date restores the saved one. Nothing is written until Save.
- Validation on blur and on save: a status date before the order's Date is an error ("Can't be before the order date, 08/08/2026.") and blocks the save. A future date is allowed.

## 2. Edit order: Kind is a select (Order editing layouts 1d)
- Kind is the same combobox as Status and Vendor, options Expense and Income.

## 3. Order read view (Order editing layouts 1a)
- Status moved from a pill in the Items header to a plain-text row in Order details.
- New row under Status: the current status's date, labelled with the status name ("Delivered 09/08/2026"). A status mapped to the order's Date has no extra row.
- Order details rows follow the edit screen's field order: Vendor, Date, Kind, Status, status date, Categories, Reference, Note.
- Note is shown only when the order has one. Its text sits in a full-width `sp-well` (bordered, no ground) at regular weight, line breaks kept.

## 4. styles/components.css
- Added: `.sp-sum--stacked > .sp-well { align-self: stretch; }`, so a well under a stacked sum label takes the full width. No existing rule changed.

## Open
- Order create still draws Status as a segmented control. Same component as 1d, so it should become the same combobox.
- Home's "Orders not delivered" rule depends on a status named Ordered. With custom statuses it needs a rule that does not depend on a name.
- Bulk "Set status" in the order list does not ask for the status date.
- Phone edit (1c) still shows the status as a pill in the top bar.
- Whether earlier status dates (Delivered, then Refund) should stay visible once the status moves on.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- Order editing layouts.dc.html
- styles/components.css
