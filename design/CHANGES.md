# Spendly - changes since handoff_2026_10_13b_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes applied. This answers brief 37 (a faded part must not fade a list that opens inside it) and adds the saving to Home's Recent orders. The resting look of every component is unchanged; two open states were added beside existing fades.

## 1. A faded part is at full strength while a list or a menu inside it is open (brief 37)
- A fade (`opacity`) thins everything inside the part and makes the part a layer of its own, so the parts after it drew over an open list.
- New states in `styles/components.css`, each beside the fade it belongs to:
  - `.sp-muted:has([data-open="true"]) { opacity: 1; }`
  - `.sp-table tbody tr[data-void="true"]:has([data-open="true"]) > td:not(.sp-col-status) { opacity: 1; }`
  - `.sp-record[data-void="true"]:has([data-open="true"]) { opacity: 1; }`
- The part fades again when the list closes.
- Reaches: the "Don't import" row in the column map (Settings and import 11a), a cancelled order's row (Order list 2b) and card (2c). On a phone the field list opens as a sheet outside the row, so nothing changes there.
- Settings and import 11a draws the state: "A column not imported, its field list open", five "Don't import" rows with Kundenr's list open over the rows below. A note was added to 11a's notes for implementation.

## 2. Home, Recent orders shows the saving under the total
- Each row's amount cell is now `sp-cell-amount` with the total and, under it, `sp-amount-secondary` with `data-color="success"`: "Saved 995,00 kr.", "Saved 2.170,00 kr.", "Saved 3.280,00 kr.", "Saved 690,00 kr.". Same markup as the Order list.
- A row that saved nothing reads "Saved 0,00 kr." on plain `sp-amount-secondary`.

## 3. In the app
- Add the three open-state rules wherever the fades are applied. The combobox and the row menu already set `data-open="true"` on their wrapper when open; if a component signals open another way, set `data-open` too.
- Home's Recent orders card: render the order's saving under its total with the same amount-cell component the Orders table uses.

## 4. Check (styles/check.js)
- New assertion: every fade on a part that can hold a list (`.sp-muted`, a cancelled table row, a cancelled card) has its full-strength open state.
- Clean: 0 findings across 26 pages.

## Files
- Settings and import.dc.html
- Home.dc.html
- styles/components.css
- styles/check.js
