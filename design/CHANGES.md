# Spendly - changes since handoff_2026_10_05f_changes

Copy these files over handoff_2026_10_05f_changes.

## 1. Copy an order (brief 26)

- The label is "Copy an order" everywhere: Home's button, the create screen's third card, the 3b dialog and its section title, the Actions inventory, the Mobile screens notes. It was "Duplicate last order" on Home and "Copy a previous order" elsewhere.
- Home's button (`sp-btn--outline sp-btn--small`, beside "Empty order") opens the 3b dialog over Home. Escape or Cancel closes it and stays on Home. Picking an order opens the unsaved copy. Hidden when there are no orders.
- Home's routes note: the `/orders/new?duplicate=447` route is removed; the note states this button is the one control on Home that opens a dialog.
- Order create 3b, "Two entry points, one dialog": Home's button now opens the dialog.
- Actions inventory: the Home row and the resolved note describe one action with one set of rules. An order's own Duplicate (order page, row menu) still goes straight to the copy.

## 2. HEIC removed

- Home's receipt drop: `accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"`.
- Images and files 17e and COMPONENT-STATUS.md no longer name HEIC.
- `styles/check.js` fails any page that names HEIC.

## 3. Mobile screens

- 5b (vendor create) matches desktop 5b: Image field under Name, plain "Also matches" label (count removed), colour help text.
- 21b phone frame removed. There is no whole year on a phone: below 640px the Months / Whole year switch is not drawn and Budget shows Months only.
- 21a phone: amount lines are `sp-sum--edits`; tapping one turns the amount into the NumberField in place (`sp-input--cell`). Electricity is drawn mid-edit.
- 21a phone: the "Months 2026" label is removed and the month window is full width, using the existing `.sp-touch .sp-window` state.
- 21a phone: the bar holds the year and an Edit button (`sp-btn sp-btn--outline`). The menu is removed; checking a bank statement is not offered on a phone.

## 4. Budget

- 21b and 21g each carry a "Not on a phone" note.

## 5. Check

- `styles/check.js` adds the HEIC assertion. Its typographic-tell list now writes the dashes as `\u` escapes and the entities split, so the file passes its own sweep. Clean run: 0 findings across 26 pages.
- No component changed appearance; `styles/components.css` is unchanged.

## Files
- Home.dc.html - Copy an order, routes note, file drop accept list
- Order create.dc.html - Copy an order label, 3b entry points
- Actions inventory.dc.html - Copy an order row and note
- Images and files.dc.html - 17e type note
- Mobile screens.dc.html - 5b, Budget (21a, 21b removed), notes
- Budget.dc.html - 21b and 21g notes
- styles/COMPONENT-STATUS.md - change log entry
- styles/check.js - HEIC assertion
