# Show a payment that matches an order with a close amount (Order list 2j)

Built on `design/` from `mm98/Spendly` main, pulled 2026-10-31T11:26Z. `later.md` on main was read first: its one entry, Recently deleted, is an idea kept for later and is not touched.

## 1. Two sliders: Days apart and Amount difference

**The problem.** The matching window was fixed in code at 3 days either side and the exact total. Carsten wants to set both himself, so a payment with no exact order can still find its order.

**What changed.** Two sliders, Days apart and Amount difference, each 0 to 5 in steps of 1, both starting at 3 each time the page opens. Amount difference is in percent of the payment. They are for Not registered only: they sit in the stats card above the four stats, side by side (`sp-halves`), and are drawn only while Show is Not registered. In Registered, Left out and All the card starts with its stats. The label is `sp-section-label`, the readout `sp-meta`: Up to 3 days, Up to 3%, and at 0 Same day only, Same amount only. Moving a slider checks the file again at once, with no button; the stats, the gauge, the lists and Orders with no payment follow. Lines a reader has changed (a picked vendor, a ticked box) keep their state while they stay in Not registered. Not on a phone, as the whole bank check.

**Where.** `Order list 2j`, stats card, and the notes Matching and Days apart and Amount difference. `styles/components.css`: `.sp-card--shell .sp-track`, `.sp-card--shell .sp-track__span`, `.sp-card--shell .sp-track__handle` (the rail on the dark card takes the gauge's ground and fill). App: `react/src/pages/OrdersCheck.jsx`, `react/src/api/bankStatement.js` (`checkOrderPayments` takes the two values).

## 2. RangeSlider with one value

**The problem.** `RangeSlider` (`Inputs.jsx`) only takes two bounds, `[low, high]`, and always draws its entry fields. Each slider here is one value, on the dark stats card with no field.

**What changed.** A state of the existing component, not a second one. `value` may be a number: one handle, the span runs from the lowest end to it, `onChange` is called with a number, and the entry is one field named by the label alone. A new prop `entry` (on by default) leaves the fields out, for either shape. JSDoc updated.

**Where.** `Components c3`, specimen RangeInput - one value, and its note under States. `styles/components.css`: `.sp-track__handle[data-at="60"]`, `.sp-track__span[data-span="0-60"]` (specimen positions only). `react_handoff/Inputs.jsx` (`RangeSlider`), to go into `react/src/components/Inputs.jsx`.

## 3. Matching rule, the note in 2j

**The problem.** The Matching note said "3 days before to 3 days after", which is no longer fixed.

**What changed.** An exact total always wins first. Failing that, a payment matches an order whose total is up to Amount difference away, in percent of the payment, dated up to Days apart from the bank date, before or after. The closest amount wins, then the closest date. One order matches one payment. The bank's amount is always the right one.

**Where.** `Order list 2j`, note Matching. App: `react/src/api/bankStatement.js` (`checkOrderPayments`). `api/src/routes/ordersBankCheck.js` unchanged.

## 4. A close match on its line

**The problem.** A payment a little off its order (568,00 kr. paid, 568,38 kr. on the order) showed as Not registered, and its order under Orders with no payment.

**What changed.** A close match is a Registered line like any other. The order cell's subtitle ends with the difference, from the order's side: `SPENDLY-450 · 8 Oct · 0,38 kr. more`, or `12,50 kr. less`, the difference on its own amber span (`sp-ink-warning`) so the number and date stay grey. The Amount column is always the bank's amount. In All the line is the same. An exact match shows no difference. A close-matched order leaves Orders with no payment.

**Where.** `Order list 2j`, specimen SHOW · REGISTERED (two close lines: Bilka, IKEA), note A close match. App: `react/src/pages/OrdersCheck.jsx` (Registered and All lists, Orders with no payment).

## 5. The head and the stats card

**The problem.** The brief asked whether a close match counts with Registered or as its own figure.

**What changed.** It counts as Registered, in the stat, the gauge and the toolbar's count. The Registered stat's meta says how many were close: Found as an order, 2 close; with none it stays Found as an order. Show has no view of its own for close matches.

**Where.** `Order list 2j`, stats card, note A close match counts as Registered. App: `react/src/pages/OrdersCheck.jsx` (stats card and gauge).

## New words

`language/en.json` and `language/da.json`:

- `bank.match.daysLabel` - Days apart / Dage imellem
- `bank.match.percentLabel` - Amount difference / Forskel i beløb
- `bank.match.days` - Up to # days, Same day only at 0 / Op til # dage, Kun samme dag
- `bank.match.percent` - Up to #%, Same amount only at 0 / Op til # %, Kun samme beløb
- `bank.closeMore`, `bank.closeLess` - {amount} more, {amount} less / {amount} mere, {amount} mindre
- `bank.stat.registeredMetaClose` - Found as an order, {close} close / Fundet som en ordre, {close} næsten ens

## What is still open

- The sliders start at 3 each time the page opens, as the brief says; nothing is saved. Please confirm.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order list.dc.html` - 2j: sliders, close lines, stats meta, notes.
- `Components.dc.html` - c3: RangeInput - one value, and its note.
- `react_handoff/Inputs.jsx` - `RangeSlider` one value and `entry`.
- `language/en.json`, `language/da.json` - the new words, on main's files.
- `styles/components.css` - the one-value specimen positions and the rail on the dark card.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-list.css` - loaded by the pages.
- `support.js`, `view.js`, `components.js`, `icons.js`, `index.html` - to open the pages from the folder.

## styles/check.js

0 finding(s) across 28 pages.
