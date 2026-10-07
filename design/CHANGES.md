# Spendly - changes since handoff_2026_10_06h_changes

Copy these files over handoff_2026_10_06h_changes.

## 1. Category suggestions on the order (Order create 3a, Order editing layouts 1d)
- Categories stay on the order. Vendor defaults still fill the field ("filled from Indbo Møbler"); suggestions are extra.
- Suggestions sit in a row under the Categories field, labelled "Suggested from the items", as dashed chips (`sp-chip sp-chip--dashed`). Nothing is added until a chip is tapped; tapped, it becomes an ordinary chip in the field.
- An existing category reads "+ Lighting". A category that does not exist yet reads "+ New: Seating"; tapping it creates the category and adds it to the order.
- At most three suggestions, only confident ones. No row when there is nothing to suggest. No suggestion repeats a category already in the field; one removed from the field is not offered again on this order.
- Two sources:
  - Item names matched against earlier orders. Runs by itself on every order edit screen and is recalculated when lines change.
  - A model given the item names, the vendor and the user's category list. Runs only when the bulb button is pressed, and is the only source that can propose a new category.
- Scanned order: the scan's own model call returns the suggestions. The bulb shows there only when the scan found none.

## 2. Suggest categories button
- A bulb icon button at the right end of the Categories token field (`sp-field__wrap` + `sp-field__trail`), the same trail pattern as the password field's eye button.
- Tooltip and aria-label: "Suggest categories". No visible text.
- Pressed: the icon becomes the spinner and the row reads "Looking at the items..."; then the result, or "No suggestions for these items". The button stays in place and can be pressed again.
- On every order Categories field: Order create 3a (typed, saved) and Order editing layouts 1d. Not on filter or alias token fields (Bookmarks, Vendors and categories, Mobile screens).
- Four specimens in Order create 3a: from earlier orders, working, result, nothing confident.

## 3. One field order for Order details (Order create 3a, Order editing layouts 1d)
- Every Order details form, create or edit, lists: Vendor, Date + Kind, Status, Categories, Reference + Note, Discount + Shipping fee.
- Order create gains the Note field it was missing.
- Matches the read view (1a).

## 4. Component and icon documentation
- Components c6: the dashed chip now has two documented uses, "Empty" in a filter and a suggestion to add under a token field ("+ Lighting", "+ New: Seating"). Same chip, same states.
- Icon legend: new row for `bulb`, "Suggest categories", linked to Order create 3a.

## CSS (styles/components.css)
- One rule added: a token field followed by a trail button gets right padding, so chips never slide under the bulb.
  `.sp-field__wrap > .sp-tokens:has(+ .sp-field__trail) { padding-right: calc(var(--field-trail) + 2 * var(--sp-6)); }`
- No other component changed.

## Check (styles/check.js)
- New: every order Categories field has the Suggest categories bulb, except one that already shows suggestions.
- New: every "Order details" card lists its fields in the order above.
- New: no page still references the removed monthly letter.
- Result: 0 findings across 26 pages.

## Files
- Order create.dc.html
- Order editing layouts.dc.html
- Components.dc.html
- Icon legend.dc.html
- styles/components.css
- styles/check.js
