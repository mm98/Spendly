# Spendly - changes since handoff_2026_10_07e_changes_fixed

Fixed in this copy: several behaviours of 3d were described here but not drawn. They are now drawn (3d specimens 6, 7 and 8, and the Validated row in 1a), and the review of Claude Code's choices is settled in section 3.

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

- Specimen 6: dialog 1 when the order has unsaved changes - Compare disabled, help line "Save your changes first."
- Specimen 7: every line kept from the order - footer reads "Mark validated", Totals shows the amber pill "381,00 kr. more than the receipt".
- Specimen 8: nothing differs - green banner "Validated against receipt-0910.jpg. The lines match the receipt. Nothing was changed."

## 2. Order editing layouts
- 1d: new note, adding a file to Attachments asks whether to compare it (links to 3d).
- 1a: "Validated 07/10/2026" row in Order details, after the status date. Shown only on a validated order. Read only, not a field in 1d.

## 3. Decisions on Claude Code's choices
- Amber totals pill: rejected the amber text line. The amber pill exists: `sp-pill[data-state="progress"]`, the in-progress status pill. Use it (3d specimen 7).
- Struck-through amounts on every left-out line, receipt-only lines included: accepted, now in the 3d notes.
- Line order - changed, then to add, then to remove: accepted, now in the 3d notes.
- Top bar: accepted for desktop (the search field, as 3d specimen 3 draws). Rejected for the phone: it uses the touch top bar with Back and a title, as 1c does.
- Matching lines named only when 3 or fewer, counted otherwise: accepted, now in the 3d notes.
- Validated row in the read view: accepted, now drawn in 1a.
- Compare stores the file at once, so Cancel leaves it attached; Attach only saves the file with the order: accepted. Apply also writes the line changes and the marker at once, since Compare is only offered with no unsaved changes. Now in the 3d notes.

## Open
- The 25% total threshold for "may belong to another order" is a proposal.
- Bulk "Set status" in the order list does not ask for the status date.
- Home's "Orders not delivered" rule depends on a status named Ordered.
- Phone edit (1c) still shows the status as a pill in the top bar.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- Order create.dc.html
- Order editing layouts.dc.html
