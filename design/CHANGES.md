# Remove Make invoice, the invoice PDF, and the vendor's company details

Brief: remove the invoice and the vendor address and CVR work. It will not be used. The one change kept is the order page's actions: Delete order and Edit order as the footer pair, and Duplicate as an icon button.

This replaces everything in `design_handoff_invoice`, `design_handoff_invoice_cvr` to `design_handoff_invoice_cvr_fixed_6`, and `design_handoff_invoice_simple` to `design_handoff_invoice_simple_fixed_2`, except point D of `design_handoff_invoice_cvr_fixed_6` as amended below.

## 1. The invoice PDF and the Make invoice dialog are removed

**The problem** - The app makes an invoice PDF from an order (PR #485). It will never be used.

**What changed** - No invoice. Make invoice is gone from the order row menu and the card menu, which are back to six items: Open order, Duplicate, Download receipt, Set status, Add category, Delete. The dialog, its CVR lookup, the remembered recipient and the PDF go with it.

**Where** - `Invoice.dc.html` (24a-24d) deleted. Order list 2b and the card menu note; Duplicate and alerts 8a (menu and note); Dark mode and image viewer (the same menu); Actions inventory 16a (row removed); Icon legend 19a and `icons.js` (`file-invoice` removed). `index.html` and `checks.html` no longer list the page. App: the invoice dialog, the PDF renderer and the order menu items in `react/src/`, and the cvrapi.dk lookup and the recipient storage in `api/`.

**What is still open** - Nothing.

## 2. Vendors have no Country, CVR or Address

**The problem** - The vendor form's Invoice details card (Country, CVR, Address), the CVR register sync and the vendor list's No address marking only served the invoice.

**What changed** - The vendor form is THE VENDOR (Name, Image), then Aliases, as before. No Invoice details card, no CVR lookup, no background job, no register name or address history. The vendor list's grey line shows the order count only, and the Active / Archived control has its two choices again. The CVR alias chip in 5c ("CVR 12345678") is an alias, not this field, and stays.

**Where** - `Vendors and categories.dc.html` 5a (No address note, segment and two grey lines removed), 5b and 5c (Invoice details card and its note removed), 5m deleted. `Mobile screens.dc.html` 7a, the vendor form. App: the vendor form and list in `react/src/pages/`, the vendor model's country, cvr, vat number, address, register name and address history (drop the columns), and the CVR job in `api/`.

**What is still open** - Nothing.

## 3. The order page keeps Delete / Edit order and the Duplicate icon

**The problem** - The order page's Totals card carried Duplicate and Make invoice as icon buttons in its head.

**What changed** - The Make invoice icon is removed. The rest of point D stays: the footer is the split pair Delete order (outline, danger colour) and Edit order (primary, right); Duplicate is the one outline icon button at the right of the Totals head, `copy`, tip "Duplicate", label "Duplicate order".

**Where** - `Order editing layouts.dc.html` 1a (Totals head, lede, notes); `Mobile screens.dc.html` (the card head note). App: the order read view's rail.

**What is still open** - Nothing.

## 4. Two component variants removed

**The problem** - Two variants existed only for the invoice.

**What changed** - `sp-dialog--preview` with `sp-dialog__split`, `sp-dialog__fields`, `sp-dialog__preview` (c13), and `sp-alert--field` (c19) are removed. No other component changed.

**Where** - `styles/components.css`; `Components.dc.html` c13 (Variants note) and c19 (specimen and States note); `styles/COMPONENT-STATUS.md` (the 2026-10-17 entry). `styles/pages/invoice.css` deleted. `styles/check.js` no longer exempts a print stylesheet from the spacing scale. App: the matching styles in `react/src/`.

**What is still open** - Nothing.

## later.md

The one entry ("51 of the design's checks are not held against the app") concerns `react/scripts/check-design.mjs` and is not a design fix. Nothing settled here.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Vendors and categories.dc.html` - point 2.
- `Mobile screens.dc.html` - points 2 and 3.
- `Order editing layouts.dc.html` - point 3.
- `Order list.dc.html`, `Duplicate and alerts.dc.html`, `Dark mode and image viewer.dc.html`, `Actions inventory.dc.html` - point 1, Make invoice removed.
- `Icon legend.dc.html`, `icons.js` - point 1, `file-invoice` removed.
- `Components.dc.html`, `styles/components.css`, `styles/COMPONENT-STATUS.md` - point 4.
- `styles/check.js`, `checks.html`, `index.html` - the Invoice page out of the checks and the start page.
- `support.js`, `components.js`, `styles/tokens.css`, `styles/doc.css` - loaded by the pages, unchanged.
- `styles/pages/budget.css`, `mobile-screens.css`, `order-editing.css`, `duplicate-and-alerts.css`, `dark-mode.css`, `order-list.css`, `icon-legend.css`, `actions-inventory.css` - linked by the pages above, unchanged.

## styles/check.js

0 findings across 26 pages.
