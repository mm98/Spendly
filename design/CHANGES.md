# Spendly - changes since handoff_2026_10_07d_changes_fixed

Fixed in this copy: Status and Kind were changed to a combobox only in Order editing layouts 1d. Every other page still drew Status as a segmented control or text input and Kind as a text input. They are now the same combobox everywhere (section 5), and styles/check.js asserts it.

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

## 5. Status and Kind are the same combobox on every page
- Order create: Status (both places, was a segmented control) and Kind (both places, was a text input).
- Responsive reference: Status in the field grid specimens (two were segmented controls, one a text input). The one-off status "Received" is gone; options match 1d.
- States and confirmations: Kind (was a text input).
- Markup is identical to 1d (`sp-combobox`, trigger, panel, check on the selected option).

## Open
- Home's "Orders not delivered" rule depends on a status named Ordered. With custom statuses it needs a rule that does not depend on a name.
- Bulk "Set status" in the order list does not ask for the status date.
- Phone edit (1c) still shows the status as a pill in the top bar.
- Whether earlier status dates (Delivered, then Refund) should stay visible once the status moves on.

## Check (styles/check.js)
- New rule "Status and Kind are selects": every field labelled Status or Kind must be an `sp-combobox`. Swept on the label text, not on a class. Run against the previous Order create it flags all 4 fields.
- Result: 0 findings across 26 pages.

## Files
- Order editing layouts.dc.html
- Order create.dc.html
- Responsive reference.dc.html
- States and confirmations.dc.html
- styles/components.css
- styles/check.js
