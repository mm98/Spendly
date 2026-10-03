# Spendly - date field on iOS

Copy these files over handoff_2026_10_03n_changes_fixed_fixed.

On iOS the date field had three faults: the date was centred, the field was shorter than the fields around it, and it ran past the card's right edge.

**Stylesheet changes the app takes (components.css)**
- `.sp-input::-webkit-date-and-time-value` - `text-align: left; margin: 0;`. iOS 15+ draws the value in this pseudo-element, which defaults to full width and centred text, and `text-align` on the input does not reach it.
- `.sp-input[type="date"]`, `[type="time"]`, `[type="month"]`, `[type="datetime-local"]` - `appearance: none` so the field takes `.sp-input`'s own min-height, border and radius instead of the native height; `min-width: 0` and `-webkit-min-logical-width: 0` so iOS's intrinsic minimum width no longer pushes the field past its column. Tapping still opens the native picker.

Blink and Gecko already left-align and size these fields correctly, so nothing changes off WebKit.

**What the app changes**
- Drop any app-side workaround for the date value alignment (the old `.field-shell > input::-webkit-date-and-time-value` rule); the stylesheet covers it.
- The date field in the order form shows no calendar icon. It should sit in `sp-field__wrap` with the `sp-field__trail` button, as in Components (Date - touch keeps the native picker).

## Files

- `styles/components.css`

`styles/check.js` reports the same 84 known findings as handoff_2026_10_03n_changes_fixed_fixed.
