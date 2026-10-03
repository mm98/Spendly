# Spendly - brief 8 answers (fixed)

Replaces the first brief 8 package. Fixed since: in 8a the row menu under "Where it is reached from" now shows open (`data-open="true"` on its `.sp-cell-menu`); it rendered empty before.

Copy these files over the brief 7 package (handoff_2026_10_03g_changes).

**Notes that disagreed**
- **2a bulk status / category:** applied at once with an Undo toast, whatever the count (6f, 16b win). Only destructive actions ask first. The "above 10 orders" line is gone.
- **2a bulk export:** the 16b format - one row per item line, in the import's columns.
- **2e caption:** "Create makes the category from what is typed and ticks it on this order at once."
- **8a Duplicate:** the dialog goes. Duplicate opens the copy in the edit screen, unsaved, with 3b's copy rules. The dialog drawing is removed; 8a keeps "where it is reached from" and the copy in the edit screen ("After Duplicate"). A copy that takes a category over its limit shows the limit notice in the edit screen, as any order does.

**Decisions**
- **11b See the orders:** the order list filtered to that import, shown as one removable chip in the filter row, "From import 3 Oct 2026" (c12 chip). Not a saved view. Noted in 2b and 11b.
- **8b Open statistics:** the month the summary is about, no crumb.
- **4a Edit on the limit card:** opens the categories overview (5d). Inside a category crumb, Edit opens that category (5f) with the limit field focused.
- **3a Jump to first:** shows on a phone too.
- **Category toast:** "Decor added to 2 orders." with Undo - confirmed.
- **Undo after "Also set delivery date to today":** restores the delivery date as well.
- **Row menu Create a category with six or fewer categories:** the search field shows, focused - confirmed.
- **Palette "Scan a receipt":** opens the file picker at once, like the sidebar row; the file goes to 3a step 2. Noted in 9d.
- **Month names:** a month that stands alone or starts a label is capitalised in every locale, Danish included (crumbs, ticks, row labels, readout heads). Inside running text it follows the language.

**7b filter sheet layout:** as drawn; no change from us.

## Files

- `Order list.dc.html`
- `Settings and import.dc.html`
- `Duplicate and alerts.dc.html`
- `Order statistics.dc.html`
- `Order create.dc.html`
- `Navigation shell.dc.html`

`styles/check.js` now reports 83 known findings (the removed dialog took one with it).
