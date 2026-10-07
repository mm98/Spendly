# Spendly - changes since handoff_2026_10_07e_changes_fixed

Copy these files over handoff_2026_10_07e_changes_fixed.

## 1. A receipt added to an existing order (Order create 3d)
Built from 3a (scan review) and 3c (upload interruption). No new components.

- Dialog 1, always asked when a receipt is added to an existing order: "Compare with this receipt?" - Attach only / Compare. A file whose hash is already on the order goes to 3c instead.
- Dialog 2, after reading, when the receipt's vendor is not the order's vendor or its total is more than 25% away: "This receipt may belong to another order" - Compare anyway / Attach only (primary).
- The comparison is 3a's review screen with the order on one side:
  - Amber banner: "4 lines differ from the receipt." with Jump to first.
  - "Lines that differ" card lists only differing lines; matching lines are counted under it.
  - Item lines only. Lines are paired by normalised name, then amount.
  - Four cases, receipt wins by default: price or quantity differs (Order / Receipt, Receipt picked), name differs (same choice), only on the receipt (ticked, added), only on the order (unticked, removed).
  - Amount column shows the result; a replaced value is struck through beneath it (`sp-void`), a removed line's amount is struck through.
  - "Accept all from receipt" resets every line to its default.
  - Totals panel: Order now, After changes, On the receipt, with 3a's Totals pill.
  - Footer: Cancel / "Apply 4 changes". The count follows the picks; at zero it reads "Mark validated".
  - Nothing changes until Apply. Cancel keeps the file attached and the lines as they were.
  - When nothing differs the comparison is skipped and the order is marked validated.
- Phone: the same rows; the Order / Receipt choice sits under the line's subtitle, the total moves into the save bar.
- After Apply: green banner "Validated against receipt-0910.jpg." and a "Validated" row with the date in Order details. It stays when lines are edited later; removing that receipt removes it.
- With unsaved changes on the order, Compare is disabled ("Save your changes first.").

## 2. Edit order (Order editing layouts 1d)
- New note: adding a file to Attachments asks whether to compare it (links to 3d).

## Open
- Read view 1a does not draw the Validated row yet.
- The 25% total threshold for "may belong to another order" is a proposal.
- Bulk "Set status" in the order list does not ask for the status date.
- Home's "Orders not delivered" rule depends on a status named Ordered.
- Phone edit (1c) still shows the status as a pill in the top bar.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- Order create.dc.html
- Order editing layouts.dc.html
