# Answers to "Brief: questions from building Make invoice and the CVR lookup" - fixed 6

Replaces `design_handoff_invoice_cvr_fixed_5`. Fixed since that package: the Files list below named the wrong points for some files and listed two stylesheets apart from the rest; no page changed. Before that, `design_handoff_invoice_cvr_fixed_5` replaced `design_handoff_invoice_cvr_fixed_4`, fixing: Country, CVR and Address move into a collapsed Invoice details card (G). Before that, `design_handoff_invoice_cvr_fixed_4` replaced `design_handoff_invoice_cvr_fixed_3`, fixing: one help line for CVR and Address (F). Before that, `design_handoff_invoice_cvr_fixed_3` replaced `design_handoff_invoice_cvr_fixed_2`, fixing: Country and CVR share a line (E). Before that, `design_handoff_invoice_cvr_fixed_2` replaced `design_handoff_invoice_cvr_fixed`, fixing: the order page's actions are regrouped, with Duplicate and Make invoice as icons (D). Before that, `design_handoff_invoice_cvr_fixed` replaced `design_handoff_invoice_cvr`. Fixed since that package: the recipient is one remembered view with a live CVR field (A), the borderless swap buttons are gone (B), and Add them no longer opens a new tab (C). Points 1-7 below are unchanged unless A says otherwise.

## G. Invoice details: a collapsed card on the vendor form

**The problem** - Country, CVR and Address sat in THE VENDOR card at full weight, though they are only used on an invoice, which is rarely made.

**What changed** - They move into their own card below THE VENDOR, "Invoice details", the existing toggle card (`sp-card sp-card--flush` with `sp-list__toolbar sp-list__toolbar--toggle` and `sp-card__chevron`, as the phone's Order details in Order editing layouts 1c), its body a 12px stack. It always starts collapsed and is not remembered. The summary line says what is set: "Not added"; "Denmark · CVR 12345678"; "Sweden · VAT SE556677889901"; "Denmark · address only". A name match waiting to be confirmed reads "A company match is waiting", and the "Is this the company?" suggestion stays inside the card. Add them in the invoice dialog opens the vendor's edit page with the card open. The fields inside, and the 5m states, are unchanged. No component changed.

**Where** - `Vendors and categories.dc.html` 5b (new vendor, "Not added"), 5c (edit, "Denmark · CVR 12345678"), the six 5m states drawn open with their summaries, and a 5m note; `Mobile screens.dc.html` 7a (new vendor); `Invoice.dc.html` 24d, the Add them note. App: the vendor form.

## F. One help line for CVR and Address on the vendor form

**The problem** - With Country and CVR on one line, the CVR help ("The address comes from the CVR register within a day of saving, and is kept up to date.") wrapped in its half, and said the same thing as the help under Address.

**What changed** - The CVR field has no help line. The help under Address now reads: "Printed on an invoice made from its orders. With a CVR number it comes from the CVR register within a day of saving, and is kept up to date." Same text in every vendor form that showed the old Address help. The CVR field's error lines (no match, unknown number) are unchanged.

**Where** - `Vendors and categories.dc.html` 5b, 5c and the 5m states; `Mobile screens.dc.html` (the vendor form). App: the vendor form.

## E. Country and CVR share a line

**The problem** - Country and CVR were two full-width fields one under the other, though together they state one fact: which register the number belongs to.

**What changed** - They sit side by side in `sp-fields` (the existing two-column field row, 12px gap), Country on the left; outside Denmark the right half is VAT number. A help or error line under CVR stays under its own half. On touch the pair stacks, as `sp-fields` always does, so the phone is unchanged. No component changed.

**Where** - `Vendors and categories.dc.html` 5b, 5c and the 5m states (8 places, and a 5m note); `Invoice.dc.html` 24c (both states) and 24d; `Mobile screens.dc.html` (the vendor form, stacked). App: the vendor form and the invoice dialog.

## D. The order page's actions: Edit and Delete as the pair, the rare ones as icons

**The problem** - 1a's rail mixed a Duplicate / Edit order pair with Make invoice and Delete order stacked below at full width, so the actions read as a mess of grouped and stacked buttons, and Make invoice and Duplicate, both rarely used, carried as much weight as Edit order.

**What changed** - The Totals card's footer is the split pair Delete order and Edit order: Edit order the one primary on the right, Delete order outline in the danger colour. Duplicate and Make invoice are outline icon buttons (`sp-icon-btn sp-icon-btn--outline`) at the right of the Totals card head, in that order: `copy` with tip "Duplicate" and label "Duplicate order", `file-invoice` with tip and label "Make invoice". They do what the row menu items do. No component changed. This replaces point 5's placement of Make invoice; the Totals card still moves with the rail, so the phone reaches both.

**Where** - `Order editing layouts.dc.html` 1a, the Totals card, the lede and the notes; `Icon legend.dc.html` 19a, where `copy` and `file-invoice` are used. App: the order read view's rail.

## A. The recipient is one view: the vendor's fields, with a live CVR lookup

**The problem** - 24c led with a CVR lookup, as if the recipient were always a company, and swapped between a lookup mode and a typed mode. The recipient is usually the user of the app, typed once and reused.

**What changed** - One view, no modes. The fields are the vendor's own, in its order: Name, Country, CVR, Address, Att., all optional. CVR shows when Country is Denmark; outside Denmark it is VAT number, printed as typed and not looked up. Eight digits in CVR look the company up at once: Address becomes the register's name and address with "From the CVR register." under it, and Name is filled with the register name if it was empty; the PDF prints the register name, address and CVR. Clearing CVR turns Address back into a field. There is no search by name. The lookup's other states are the help line under CVR, with Address staying a field: "Looking up…"; "No company has CVR 87654321 in the register. Check the number."; "The company could not be looked up. Try again, or type the address."; "Company lookup is not available until tomorrow. Type the address instead." This replaces point 3's places.

One recipient is remembered per account: the one on the last downloaded invoice, filled in and edited in place; Download PDF saves edits as the new remembered recipient. The first invoice opens with the fields empty. With every field empty, To prints the account's name and email, as they are in Settings when the PDF is made.

**Where** - `Invoice.dc.html` 24c (two states of the one view: the remembered person, and a company found by CVR), 24d (Name, Country Sweden, VAT number), 24b (To shows the account's name and email). App: the invoice dialog and the PDF's To box.

## B. No borderless buttons in the dialog

**The problem** - "Look up a company" and "Type the address instead" were text buttons with no edge, so they read as loose text until hovered.

**What changed** - With the one view in A there is nothing to swap, so both buttons are gone. The text button component (`sp-btn--text`) is unchanged and still used elsewhere (Components c6, the phone palette's Cancel and the filter sheet's Reset in Mobile screens). Please confirm whether those should become `sp-btn--outline`.

**Where** - `Invoice.dc.html` 24c, 24d.

## C. Add them opens in the same tab

**The problem** - 24d said Add them opens the vendor's edit page in a new tab, unlike the rest of the app.

**What changed** - Add them, and Check the number (point 4), close the dialog and open the vendor's edit page (5c) in the same tab. Back on the order, Make invoice opens the dialog again with what was saved.

**Where** - `Invoice.dc.html` 24d notes.

**What is still open** - Order editing layouts 1a says the vendor and category links on the order page "open in a new tab like any other". Please confirm they should also open in the same tab; 1a is not changed here.

---

PR https://github.com/mm98/Spendly/pull/485. The six points take the brief's recommended choice; one more fix, the item photo on the invoice, came from the built PDF. `later.md` on main is empty, so no entry is settled here.

## 1. Page 1 of 24b drew a line that did not fit

**The problem** - 24b drew 9 lines on page 1; the 9th ran under the page foot. The app, correctly, moves it to page 2.

**What changed** - 24b now draws 8 lines on page 1 and 6 on page 2. The note says a line that does not fit above the foot goes whole to the next page, so the count follows the lines' heights (fewer when names wrap). The app's behaviour is right; no app change.

**Where** - `Invoice.dc.html` 24b.

## 2. The order number

**The problem** - "Order 538" in 24d is the only place an order number appears.

**What changed** - Kept on the invoice only. Every order has a number, counted per account from 1; the order page, the order list and search do not show it. No app change.

**Where** - `Invoice.dc.html` 24b, the "Without a Reference" note.

## 3. A lookup that fails, and a lookup that is running

**The problem** - 24c did not cover these.

**What changed** - The app's texts and places are now the design: while running, the help line under Recipient reads "Looking up…"; when the register does not answer it reads "The company could not be looked up. Try again, or type the address instead." When no lookups are left, the typed fields open and the message is the help line under Company. No app change.

**Where** - `Invoice.dc.html` 24c notes.

## 4. A CVR number the register does not know

**The problem** - 24d's alert covered a missing address or CVR number only.

**What changed** - Kept as built: the number is not printed; the alert reads "The CVR number of X is not in the register", link "Check the number", opening the vendor's edit page like Add them. No app change.

**Where** - `Invoice.dc.html` 24d notes.

## 5. Make invoice on the phone

**The problem** - The phone's order list has no row menu, so the phone had no Make invoice.

**What changed** - Make invoice is now on the order page, in the rail under the Duplicate / Edit order pair: `sp-btn sp-btn--outline sp-btn--small sp-btn--block`, no icon, the same size as Delete order below it. It opens the same dialog as the menus. Below 900px it moves with the rail above the items, which is how the phone reaches it; below 760 the dialog has no preview (already in 24c). The note in 8a that said "not on the read view" is replaced.

**Where** - `Order editing layouts.dc.html` 1a (rail and notes); `Invoice.dc.html` 24c lede and the below-760 note; `Duplicate and alerts.dc.html` 8a note; `Icon legend.dc.html` 19a (where `file-invoice` is used). App: the order read view page in `react/src/pages/`.

## 6. A company that has ceased trading

**The problem** - 5m draws "Ceased trading", the dialog had nothing for it.

**What changed** - Kept as built: no alert, the invoice prints the last address and CVR number. No app change.

**Where** - `Invoice.dc.html` 24d notes.

## 7. A line with no item photo printed an empty cell

**The problem** - In the built PDF, lines without a photo left a blank 44px space, as the 24a note said.

**What changed** - The invoice follows the order list's thumbnail rule: no item photo but a vendor image prints that image faded to `--fade-standin` (0.6); no image at all prints the empty photo box, a 1px dashed `--line-3` edge on `--surface-2` with the photo icon (18px) in `--ink-6`. Never a blank cell.

**Where** - `Invoice.dc.html` 24a (Linen cushion cover: vendor image), 24b (Storage basket, Candle holder set: empty box), 24c preview. `styles/pages/invoice.css` `.iv-photo--faded`, `.iv-photo--none`. App: the invoice PDF renderer.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Invoice.dc.html` - points 1 to 7, A (the recipient), B (no borderless buttons), C (same tab), E (Country and CVR on one line) and G (Add them opens Invoice details).
- `Order editing layouts.dc.html` - point 5 and D, the order page's actions (1a).
- `Vendors and categories.dc.html` - E, F and G: Country and CVR on one line, one help line, the Invoice details card (5b, 5c, 5m).
- `Mobile screens.dc.html` - E, F and G on the phone's vendor form (7a).
- `Duplicate and alerts.dc.html` - point 5, the 8a note on where Make invoice lives.
- `Icon legend.dc.html`, `icons.js` - D, where `copy` and `file-invoice` are used (19a).
- `support.js`, `components.js` - needed to open the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/pages/invoice.css` - point 7, the two no-photo states.
- `styles/pages/order-editing.css`, `styles/pages/duplicate-and-alerts.css`, `styles/pages/icon-legend.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - loaded by the pages above, unchanged.

## Check

`styles/check.js`: 0 findings across 27 pages.
