# Find photos: a product photo for every order line that has none

Answers `Brief-found-line-photos.md`, and settles the later.md entry "Reconcile's matching notes in the design are out of date". Built on `design/` from main at 2026-10-31T14:44Z.

## 1. The vendor chooses a photo finder

**The problem** - Finding photos fits some shops (a supermarket's bread and milk) and not others (a furniture shop's own photos). More finders may come later for other kinds of goods, so the choice must not be a one-off food switch.

**What changed** - The vendor form gets a select, **Find photos**, in the Defaults for its orders card, after Default categories. Options: **Off** (the default) and **Groceries**, the one finder today. A later finder is one more option in this list, with no other change to the page or the order. Help text: "Adds a product photo to each line that has none when an order from this vendor is saved. Lines that have a photo are left as they are." Turning it Off removes no photo already found.

**Where** - Vendors and categories 5b (drawn Off) and 5c (drawn with Groceries), note on 5b. Same combobox as Kind on an order (Components c5). App: the vendor form page and the vendors table (a nullable finder key per vendor).

**What is still open** - Nothing.

## 2. A new order finds its photos when first saved

**The problem** - The brief asked how the search is started on new orders.

**What changed** - When a new order is first saved and its vendor has a finder, Spendly finds a photo for every line that has none. The user lands on the saved order with the waiting lines showing the spinner, then the done toast. A line given a photo in the form is skipped. Nothing is searched before the save.

**Where** - Order create, notes ("Photos on save"). App: `react/src/pages/OrderForm.jsx` (after the create succeeds).

**What is still open** - Nothing.

## 3. The Find photos button on an existing order

**The problem** - The brief asked where the button goes on desktop and phone, and whether it hides or turns off when no line lacks a photo.

**What changed** - An outline icon button at the right of the Items card head, icon `photo`, tip and label "Find photos". It shows only when the order's vendor has a finder and at least one line has no photo; otherwise it is not there. It sits in the same place in the read view and in edit, after the hint in edit and before Reorder on a phone. A line that already has a photo is always skipped. A found photo is a normal line photo, replaced or removed like any other; a removed one leaves the line empty, so the next Find photos searches it again.

**Where** - Order editing layouts 1a (specimens "1a Find photos" under the screen, notes), 1d (note), 1c (note). App: `react/src/pages/Order.jsx`, `react/src/pages/OrderForm.jsx`. Lines without a photo are searched in the order they appear in.

**What is still open** - Nothing.

## 4. While it works, and when it is done

**The problem** - Filling takes a few seconds per line; the brief asked what the order shows meanwhile and when done.

**What changed** - The button shows the spinner (`sp-spinner`) and is disabled. Each line still waiting shows the spinner in its empty photo box (`sp-mark--medium sp-mark--empty` with `sp-spinner`, `aria-busy`), and takes its photo the moment it is found. The search runs on the server and keeps going if the user leaves the order. When done, the toast (c18, check icon) reads **"Photos found for 2 of 3 lines."**, counting only lines that had no photo, and shows on whatever page the user is on. A line with nothing found stays empty, and the button stays while such a line exists. No new component or CSS: the spinner in a mark is the upload state already in Components.

**Where** - Order editing layouts 1a specimens: ready, finding, done. App: `react/src/pages/Order.jsx`, the toast; filled photos show unchanged in `react/src/app/orderRow.jsx`, `react/src/pages/OrderParts.jsx`.

**What is still open** - Nothing.

## 5. later.md: Reconcile's matching notes in the design are out of date

**The problem** - The later.md entry "Reconcile's matching notes in the design are out of date": the 2j Matching note said a payment matches an order "before or after" the bank date, and the Days apart note said both sliders start at 3.

**What changed** - Matching now says an order dated on the bank date or up to Days apart before it, never after, since a bank never takes the money before the order. Days apart starts at 5 and Amount difference at 3; the drawn Days apart slider and its readout show Up to 5 days. Two position rules added in `styles/components.css` for the full-span handle (`.sp-track__handle[data-at="100"]`, `.sp-track__span[data-span="0-100"]`), beside the existing one-value positions; no appearance changed.

**Where** - Order list 2j, the Matching and the Days apart and Amount difference notes, and the stats card's Days apart slider. Please remove the entry from `later.md`.

**What is still open** - Nothing.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Order editing layouts.dc.html` - Find photos button, states and notes (1a, 1c, 1d).
- `Order create.dc.html` - Photos on save note.
- `Vendors and categories.dc.html` - Find photos select (5b, 5c) and note.
- `Order list.dc.html` - 2j notes and Days apart slider (later.md).
- `styles/components.css` - two slider position rules.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-editing.css`, `styles/pages/order-create.css`, `styles/pages/order-list.css` - what the pages load.
- `support.js`, `components.js`, `view.js`, `language/en.json`, `language/da.json` - what the pages load.

## styles/check.js

0 finding(s) across 28 pages.
