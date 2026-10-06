# Spendly - changes since handoff_2026_10_05j_changes

Copy these files over handoff_2026_10_05j_changes. Answers to brief 29 are in `Brief 29 answers.md`.

## 1. Home, Needs a look: orders not delivered after two weeks (Home 10a, Mobile screens 10a)

### Rule
- Counts orders with status Ordered dated 14 or more days ago. A count of zero is no row.

### Row
- The existing `.sp-list-item` count row: count, text, chevron. No `data-color`; it is not a warning row.
- Desktop: "4 orders ordered over 2 weeks ago and not delivered" ("order ordered ..." for one).
- Phone: "not delivered after 2 weeks".

### Order and cap
- Categories over their limit, categories near it, this row, orders without a receipt, vendors that look like duplicates.
- The cap of three rows stays. Home 10a now draws over limit, not delivered, missing receipt; the duplicate vendors row is fourth and does not show. Mobile 10a draws the same three.

### Route
- Opens `/orders?status=Ordered&to=<day>`, the cutoff day 14 days before today (`to=2026-08-07` on 21 August). The list shows exactly the orders the count counts. Added to Home's routes note and to the Mobile screens notes.

## 2. Product link on an order line (Order editing layouts 1b notes)
- Saving: the address is cleaned as a bookmark's is. Tracking parts such as `utm_` and `fbclid` are removed, and a missing `https://` is added.
- Copies: a copy of an order keeps each line's link, in every way of copying (Home's Copy an order, the create screen's, an order's own Duplicate).

## 3. Not changed
- No CSS, tokens or components. Every component is used as it already is.

## 4. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- Home.dc.html - row drawn in Needs a look, notes and routes note
- Mobile screens.dc.html - row drawn in Needs a look, route note
- Order editing layouts.dc.html - two Product link notes
- Brief 29 answers.md
