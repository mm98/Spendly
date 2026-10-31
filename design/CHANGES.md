# One bank statement check, for the budget or for orders

## Fixed from handoff_orders_bank_check_fixed_4

**The problem.** The payment menu was drawn open inside the table, but the mockup closes any open menu on the first click on the page, so the menu was not visible to read.

**What changed.** Order list 2j has a PAYMENT MENU specimen beside the others: the row menu from 2e, unchanged, with its two items, Always leave out (`refresh`) and Leave out once (`x`). The note says what each item does: Always leave out saves the text to the left-out list and the line shows Saved: Always left out.; Leave out once moves the line to Left out for this file only.

**Where.** `Order list 2j`, specimen PAYMENT MENU, and the Columns note. App: `react/src/pages/OrdersCheck.jsx`.

## Fixed from handoff_orders_bank_check_fixed_3

**The problem.** The two icon buttons at the end of a payment line in Order list 2j, Always leave out (`archive`) and Leave out once (`minus`), did not say what they do. Their column was also the only place in the system with two icon buttons at a row's end, and needed its own width rule.

**What changed.** They are now the order list's row menu: the ⋮ button in `sp-col-menu`, exactly as in 2b, labelled "Payment menu", with two items, **Always leave out** (`refresh`) and **Leave out once** (`x`). A line already left out has no menu, only Undo in its vendor cell. The `.sp-col-actions` column and its rule are gone, so the width fix in fixed_3 is gone with it, and `app.css` drops its own `.sp-table .sp-col-actions` rule as well.

**Where.** `Order list 2j`: Not registered table (menu drawn open on the MOB.PAY*HOS REBAR line) and the Selected specimen. `styles/components.css`: `.sp-table .sp-col-actions` removed. App: `react/src/pages/OrdersCheck.jsx`, `app.css`.

**What is still open.** The two menu icons, `refresh` for Always and `x` for Once, are from the register; please confirm.

## Fixed from handoff_orders_bank_check_fixed_2

Answers `Brief-bank-check-column.md`.

**The problem.** In Order list 2j the last column holds two 32px icon buttons, Always leave out and Leave out once, 70px with the gap between them. The column was `calc(var(--menu-col) * 2)`, 80px, but the table is fixed and border-box, so the cell's 12px left and 16px right padding came out of those 80, leaving 52px. The right button stuck out past the table's right edge, in the drawing and in the app.

**What changed.** The column is as wide as what it holds: `.sp-table .sp-col-actions { width: calc(32px * 2 + var(--sp-6) + var(--sp-12) + var(--sp-16)); }`, 98px. That is the same 98px as the app's rule, written from its parts, so `app.css` can drop its own `.sp-table .sp-col-actions` rule. The buttons now sit 12px after the amount column and 16px from the table's right edge, the inset every row has there. Nothing else uses `.sp-col-actions`.

**Where.** `styles/components.css`, `.sp-table .sp-col-actions`; seen in `Order list 2j` (Not registered table and the Selected specimen). App: `react/src/pages/OrdersCheck.jsx`, and remove the rule from `app.css`.

**Built on.** `design/` from main at 2026-10-31T10:40Z. Main does not have 2j yet, so this package still carries the whole bank check below.

## Fixed from handoff_orders_bank_check_fixed

**The problem.** A payment line was a tall card: text, two buttons under it, a picker with a help line, a check under the picker, and the move offer on the line. Too messy, and too tall for a file of 200 payments.

**What changed.** Each payment is one table line (the order list's table, toolbar and bulk bar from 2b): select box, date, bank text, vendor, amount, and two icon buttons, Always leave out (`archive`) and Leave out once (`minus`), with tooltips. Past 50 lines, Load more (c8).
- The vendor cell is the vendor combobox followed by a keep toggle, the `tag` icon button, off by default, replacing the check under the picker. Disabled with no vendor or when the text already matches the picked vendor.
- A suggested vendor only fills the picker; its tooltip reads "Matched from the bank text". No help line.
- A kept text another vendor already has is asked once at Create, in one dialog listing every such text, each with a small Segmented: Move it to Muuto / Keep it on Hay (default). The move offer is no longer on the line.
- Create N orders is the primary button in the list's toolbar, in place of the card footer.
- Registered and Orders with no payment use the same table, with Open order as a `chevron-right` icon button.
- The fix in `handoff_orders_bank_check_fixed` (a check in the field tinting the row) is gone with the check; its rule and `.sp-list-item__field` are removed.

**Where.** `Order list 2j`. `styles/components.css`: `.sp-table .sp-col-picker { width: 240px; }`, `.sp-table .sp-col-actions` (98px, see the fix at the top), `.sp-icon-btn[aria-pressed="true"]` (primary tint, primary ink). New words: `bank.textTaken.title`, `bank.textTaken.body`, `bank.textTaken.line`, `bank.moveTo`, `bank.keepOn`, `bank.th.bankText`, `bank.th.order`, `bank.notRegisteredTotal`; `bank.vendorMatched` now "Matched from the bank text"; `bank.selectEveryPayment` removed.

**What is still open.** Settled in fixed_4: the leave-out buttons became the row menu.

Answers `Brief-orders-bank-check.md`. Built on `design/` from `mm98/Spendly` main at 2026-10-31T09:36Z. Read `later.md` on main first: its one entry, Recently deleted, is an idea for later and not a design fix, so nothing in it is settled here.

## 1. Entry point on Orders, and the button's name

**The problem.** Orders had no way to check a bank file. Budget's button read "Check a bank statement".

**What changed.** Orders gets the button in its controls bar, after Rows / Cards, the same outline button as on Budget. On both pages the button now reads **Reconcile**, in Danish **Afstem** (new key `bank.check`). The page and section titles stay "Check a bank statement" / "Tjek et kontoudtog" (`page.checkABankStatement`). Route `/orders/check`.

**Where.** `Order list 2b` (controls bar), `Budget 21a` and `21b` (controls bar), `Order list 2j` note. App: `react/src/pages/Orders.jsx`, `react/src/pages/Budget.jsx` (button label only), `react/src/routes.jsx`, `language/en.json`, `language/da.json`.

**What is still open.** Nothing.

## 2. One check, two targets

**The problem.** The bank check existed only for the budget (`Budget 21g`, `21h`).

**What changed.** The orders check is the Budget check's parts: file drop, Columns (21h unchanged), stats card and gauge, Show segmented, line row, saved line, Always leave out / Leave out once, bulk bar. A target supplies its matching, its view names and stat labels, and the action on a line. The orders file drop uses `bank.dropBodyOrders` in place of `bank.dropBody`. Left out is kept per target. Budget looks and works exactly as before; only a note was added to 21g.

**Where.** `Order list 2j`, `Budget 21g` (note "One check for every target"). App: `react/src/api/bankStatement.js` (shared column reading), `react/src/pages/BudgetCheck.jsx` (only if parts are made shared, same look).

**What is still open.** Nothing.

## 3. Matching

**What changed.** Only money out is read. A payment matches an order with the same total, dated 3 days before to 3 days after the bank date. One order matches one payment; the closest date wins and the other order stays free. Each payment is its own line, not grouped by text as on Budget, newest first.

**Where.** `Order list 2j` notes. API: `api/src/routes/orders.js`.

## 4. The result: four views and Orders with no payment

**What changed.** Show is Not registered (default) / Registered / Left out / All. Stats: Not registered, Registered ("Found as an order"), Left out, No payment ("Orders the file does not show"); gauge "45 of 50 payments have an order". Registered lines show the bank date, then the order number, vendor and date, with Open order. **Orders with no payment** is a second list below the result, not a view (answer to question 1), shown whenever there is one; with none, its stat and card are absent.

**Where.** `Order list 2j` (main frame, SHOW · REGISTERED specimen).

## 5. Creating the order

**What changed.** The vendor picker is a column of the line (answer to question 2, made compact): the vendor combobox from Order create unchanged, in `sp-col-picker` (240px). A match on a vendor's name or other names fills it; no match, nothing filled. Selecting lines replaces the toolbar with the bulk bar: Set vendor (popover with the combobox, as Set status in 2a), Always leave out, Leave out once. "Create N orders" counts lines with a vendor; each order takes the bank date and total, the vendor, and the default status and category from Settings, Defaults. Toast "3 orders created" with Undo, 6 seconds; Undo deletes the orders and the other names added or moved.

**Where.** `Order list 2j`. API: `api/src/routes/orders.js`.

## 6. Remember the vendor

**What changed.** The keep toggle at the end of the picker (`tag` icon button, off by default), tooltip `Keep "MOB.PAY*HOS REBAR, BRORUP" as another name for Rebar`. Saved with Create. A text another vendor already has is settled in one dialog at Create.

**Where.** `Order list 2j`. API: `api/src/routes/vendors.js`.

## 7. Phone

**What changed.** Not offered on a phone, as Budget: below 640px the Reconcile button is not drawn on Orders either.

**Where.** `Mobile screens` note, `Order list 2j` note.

## New words

`bank.check`, `bank.dropBodyOrders`, `bank.view.notRegistered`, `bank.view.registered`, `bank.stat.registeredMeta`, `bank.stat.noPayment`, `bank.stat.noPaymentMeta`, `bank.outRead`, `bank.haveOrder`, `bank.toRegister`, `bank.shareRegistered`, `bank.registerHelp`, `bank.pickVendor`, `bank.vendorFor`, `bank.vendorMatched`, `bank.keepOtherName`, `bank.createOrders`, `bank.ordersCreated`, `bank.setVendor`, `bank.setVendorHelp`, `bank.openOrder`, `bank.registeredLine`, `bank.noPayment`, `bank.noPaymentHelp`, in en and da.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Order list.dc.html` - Reconcile in 2b, new section 2j with one-line payment rows.
- `Budget.dc.html` - button renamed in 21a and 21b, note in 21g.
- `Mobile screens.dc.html` - phone note covers both checks.
- `index.html` - 2j listed, 112 screens.
- `styles/components.css` - `.sp-col-picker`, `.sp-icon-btn[aria-pressed="true"]`.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-list.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `support.js`, `view.js`, `components.js`, `icons.js` - loaded by the pages, unchanged from main.
- `language/en.json`, `language/da.json` - `react/src/language/` from main with the new words.

## styles/check.js

0 findings across 28 pages.
