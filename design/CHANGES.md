# Spendly - changes since handoff_2026_10_05i_changes

Copy these files over handoff_2026_10_05i_changes.

## 1. Product link on an order line (Order editing layouts)

### Edit (1b desktop, 1c mobile sheet)
- A link icon button in the Item field's trailing slot (`.sp-field__wrap` + `.sp-input--trail` + `.sp-icon-btn--field .sp-field__trail`, the date field's pattern). The input keeps its full width.
- The button opens a Product page field (`type="url"`) directly under Item and focuses it.
- Field empty: the button opens and closes it. Field holds a link: the button only focuses it, so a link is never hidden.
- Label: "Add a product link" without a link, "Edit product link" with one. `aria-expanded` follows the field.
- A line that already has a link opens with the field showing. 1b draws a line without one, 1c a line with one.
- In edit mode the item name is never a link.

### Validation
- On blur and on save, as every field (c3).
- An address without a scheme ("hay.dk/palissade-chair") is valid and saved with `https://` in front.
- Anything else: `aria-invalid="true"` on the input and `.sp-field__help[data-color="danger"]` "Not a link." under it. The line does not save until it is fixed or cleared. Empty is valid.

### Clearing
- Emptying the field and saving removes the link. The read view shows the name as plain text, and the editor opens with the field closed.

### Read view (1a)
- A line with a link shows its name as `<a class="sp-title sp-truncate" target="_blank" rel="noopener">`, opening the product page in a new tab. It takes the base link colour; no new CSS.
- Only the name is the link; the row opens nothing. On touch a tap on the name opens the page.

## 2. Not changed
- No CSS, tokens or other pages. Every component is used as it already is.

## 3. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- Order editing layouts.dc.html - all of the above, with notes beside 1a and 1b
