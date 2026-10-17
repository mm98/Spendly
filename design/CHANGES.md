# Answers to "Brief: questions from building Make invoice and the CVR lookup"

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
- `Invoice.dc.html` - points 1-7.
- `Order editing layouts.dc.html` - Make invoice on the order page (1a).
- `Duplicate and alerts.dc.html` - 8a note on where Make invoice lives.
- `Icon legend.dc.html`, `icons.js` - where `file-invoice` is used.
- `support.js`, `components.js` - needed to open the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/pages/invoice.css` - the two no-photo states.
- `styles/pages/order-editing.css`, `styles/pages/duplicate-and-alerts.css`, `styles/pages/icon-legend.css` - loaded by those pages, unchanged.

## Check

`styles/check.js`: 0 findings across 27 pages.
