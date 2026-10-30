# One dialog when an order repeats one you have

Brief: a scan of a file you already have, or a scan that matches an existing order, opened the review (the unsaved order) instead of asking. Make it one flow: one dialog, used the same way everywhere.

## Added since handoff_one_duplicate_dialog_fixed

**The problem.** Open that order in the dialog opened the matched order in the same window, taking him away from the scan or form he was deciding about.

**What changed.** Open that order and Open that draft always open in a new window, on desktop and phone. The dialog and the scan or form stay as they were behind it, so he can look and come back to Create anyway or Discard. Opening one creates and discards nothing. No icon is added; the button looks as drawn.

**Where.** `Order create 3c`, the note on Open that order. App: `react/src/pages/OrderNew.jsx` and the dialog's use in `react/src/pages/OrderForm.jsx`, the row's Open link (`target="_blank"`, `rel="noopener"`).

**What is still open.** Nothing.

## Fixed from handoff_one_duplicate_dialog

**The problem.** In the 3c dialog for a same-file scan, the first record row was wider than the 420px dialog: its middle column could not shrink below its two buttons, so the amount ran past the row's padding and did not line up with the draft row's amount.

**What changed.** Every record row in the 3c dialogs uses the app's `SeenBefore` row markup: the middle column is `sp-stack sp-gap-8 sp-grow`, its buttons `sp-row-flex sp-gap-8 sp-wrap`, the amount `sp-stacked sp-cell-amount sp-flex-none`, with no spacer. No style values changed.

**Where.** `Order create 3c`, both desktop dialogs. App: none; `react/src/pages/OrderNew.jsx` already draws it so.

**What is still open.** Nothing.

## 1. One dialog, "You already have this order"

**The problem.** The same warning was said three ways. A same-file scan replaced step 2 with a full 3c screen; a reading that matched an order by vendor, date and total opened the review with only an amber row in the Totals card, easy to miss; orders typed, copied or edited showed the same amber row. In the app the 3c screen also listed a draft holding the file before the order, so "Open that draft" came first.

**What changed.** One dialog (`sp-dialog`, a sheet on a phone), heading "You already have this order", for both kinds of match, on every way of making an order:
- It opens the first moment the order's vendor, date and total are known: a scan when its reading is ready (a same-file match on upload, since its reading is saved), an order typed or copied on Create, an edit on Save.
- One list: orders holding the same file first, newest first, then look-alike orders (same vendor, date up to 3 days away, total within 10%), then a draft holding the file. Up to three orders, "and 2 more" in the body. Each row: mark, vendor, facts line, why it matched ("Same file - scanned 12 Aug, 14:32", "Same file", "Same vendor - 2 days earlier"), amount.
- The first row's Open that order is the one primary; other rows outline; a draft's reads Open that draft. Compare the files on same-file rows only.
- Foot: Create anyway and Discard, outline. On an edit: Save anyway and Discard changes. Read it again on the left only when a listed same-file record has a saved reading.
- Create anyway on a scan opens the review from the saved reading, or reads the file first; on a typed or copied order it creates the order. Discard on a scan deletes the upload and returns to step 1; on a new order it throws it away. Escape returns to where he was (the form, or step 1 with the upload kept 24 hours).
- Asked once per scan or form for the same orders; asked again only when a change makes it match a different order.
- No draft is made by the dialog; a scan still becomes a draft at the first change or Create in the review.

**Where.**
- `Order create 3c`: section retitled "You already have this order", the flow table, two desktop dialogs and the phone sheet, the notes. The old stage-2 screen and its never-read state are gone.
- `Order create 3a`: the amber row specimens (Totals card, phone) and their notes are replaced by one note pointing to 3c. The limits notice (8b) is unchanged. The draft note's 24-hour sentence now points to the dialog.
- `Mobile screens 7a`: the 3c phone frame is the sheet.
- App: `react/src/pages/OrderNew.jsx` (`SeenBefore` becomes the dialog over step 1 or step 2; `Scanned` asks it when the reading is ready, from `seen` plus the look-alike), `react/src/pages/OrderForm.jsx` (`lookalikeNotice` removed; Create and Save ask the dialog), `api/src/routes/scan.js` (`seenBefore` also returns the look-alike once read), `api/src/routes/orders.js` (`GET /lookalike`).

**What is still open.** No new component: the dialog, sheet, list row and buttons are the existing c13, c23 and button markup.

## 2. Every order that holds the file is found

**The problem.** `selectOrdersWithFile` in `api/src/routes/scan.js` joins `vendors` with an inner join and matches only `a.order_id`, so an order with no vendor, and a file attached to one of an order's lines, are never found: that scan went straight to the review.

**What changed.** Both count as holding the file and open the dialog. An order with no vendor is named by its reference.

**Where.** `Order create 3c`, note "Every order that holds the file is found". App: `api/src/routes/scan.js` (`selectOrdersWithFile`: left join vendors, and attachments reached through `order_items`).

**What is still open.** Naming a vendorless order by its reference: please confirm.

## later.md

Read on main before this task. Its one entry, a deleted record kept for a while, is an idea for later and is not a design fix.

## Files

- `Order create.dc.html` - a page that changed (3a, 3c).
- `Mobile screens.dc.html` - a page that changed (7a, the 3c frame).
- `README.md` - the design's overview, unchanged.
- `support.js`, `components.js`, `icons.js`, `view.js` - loaded by the pages.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css` - loaded by the pages, unchanged.
- `styles/pages/order-create.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - linked by the two pages, unchanged.

## styles/check.js

0 finding(s) across 28 pages

## Also: The vendor field is drawn as the searchable combobox

## Fixed from handoff_vendor_field_chevron_fixed

**The problem.** `handoff_vendor_field_chevron_fixed` was built from `design/` on main before the merge of the shop offers removal (`handoff_remove_shop_offers`). It put back `.sp-mark--logo`, `.sp-link-out` with its `.sp-stacked:has(> a.sp-link-out)` rule, `.sp-chat__file > .sp-chat__price`, their specimens and notes in `Components.dc.html`, and `assets/shop-logo.svg`. That removal is now on main, so those parts were taken out on purpose and must not come back.

**What changed.** This package is built again from `design/` on main as pulled at 2026-10-30T06:21:42Z, with the removal and the combobox list width change merged. The three parts and `assets/shop-logo.svg` are not in it. Only the five vendor fields and the c5 chevron below are applied on top; every other file is main's, unchanged.

**What is still open.** Nothing.

## 1. A chevron on the vendor field

**The problem.** The order form's vendor field is the searchable combobox (mode 2, Components c5), whose list offers Favourites, Recent and the other vendors. Five drawings showed it as a plain text input with no chevron, so it read as a field you can only type in.

**What changed.** Each of the five is now drawn as the closed searchable combobox from c5: `.sp-combobox` around `.sp-field__wrap`, the input `.sp-input--trail` with `role="combobox"`, `aria-expanded="false"`, `aria-autocomplete="list"`, and the `.sp-field__chevron` at its right end, pointing down. No style values or components changed; this is the existing c5 markup.

**Where.**
- `Order create`, the vendor field in the screen at the top of the page (`oc-fv`) and the one further down (`oc-f5`).
- `Order editing layouts`, the vendor field (`oe-lbl5`).
- `Responsive reference`, the vendor field (`rr-f1`).
- `States and confirmations`, the vendor field in its "A vendor is required" error state (`sc-f3`).
- App: none. The order form's vendor field is already a searchable `Combobox` with the down chevron (`react/src/pages/OrderForm.jsx`, `VendorPicker`).

**What is still open.** Nothing.

## 2. The c5 searchable specimen's chevron points down

**The problem.** The c5 specimen "Combobox - mode 2, searchable" was drawn closed with its chevron pointing up. The rule beside it says a closed chevron points down and turns up only for a list placed above.

**What changed.** The chevron points down, as on every closed dropdown.

**Where.** `Components c5`, the "Combobox - mode 2, searchable" specimen. App: none; the component already draws it down.

**What is still open.** Nothing.

## later.md

Read on main before this task. Its one entry, a deleted record kept for a while, is an idea for later and is not a design fix.

## Files

- `Order create.dc.html` - a page that changed.
- `Order editing layouts.dc.html` - a page that changed.
- `README.md` - the design's overview, unchanged.
- `Responsive reference.dc.html` - a page that changed.
- `States and confirmations.dc.html` - a page that changed.
- `components.js` - loaded by the changed pages.
- `icons.js` - loaded by the changed pages.
- `styles/components.css` - loaded by the changed pages.
- `styles/doc.css` - loaded by the changed pages.
- `styles/pages/order-create.css` - loaded by the changed pages.
- `styles/pages/order-editing.css` - loaded by the changed pages.
- `styles/pages/responsive-reference.css` - loaded by the changed pages.
- `styles/pages/states.css` - loaded by the changed pages.
- `styles/schemes.css` - loaded by the changed pages.
- `styles/tokens.css` - loaded by the changed pages.
- `support.js` - loaded by the changed pages.
- `view.js` - loaded by the changed pages.
- `Components.dc.html` - the c5 specimen's chevron, on main's copy.
- `CHANGES.md` - this note.

## styles/check.js

0 finding(s) across 28 pages, run in the design project with these same changes applied.
