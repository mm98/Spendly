# Spendly - design brief 12 answers

Copy these files over handoff_2026_10_03o_changes.

## 1. The date value on iOS

**Stylesheet (components.css)**
- `.sp-input[type="date"]`, `[type="time"]`, `[type="month"]`, `[type="datetime-local"]` - now also `display: flex; align-items: center`, in the same rule as `appearance: none`. WebKit leaves the value at the top edge once the native appearance is gone; this centres it at any field height.

**What the app changes**
- Remove the workaround from `app.css`.

**Documented**
- Components c3, the date field note: why the four rules are there, and that the fault shows only in WebKit, so a drawing or a check in Chromium cannot show it. Check in WebKit with the iPhone 15 profile.
- Input types, DateField row: the same point.
- COMPONENT-STATUS.md: dated entries for this and for the earlier iOS date field change.

## 2. The order filters' custom dates on a phone

One date range sheet for the whole app. On a phone, Custom in the order filters opens the c14 range sheet, the same one Statistics uses: heading, From and To side by side, the months scrolling, the day count and Apply. It replaces the two stacked native date fields.

- Inside the filter sheet, the range sheet's Apply sets From and To and returns to the filter sheet. The filter sheet's Apply runs the filter, with everything else in it.
- On Statistics, which has no filter sheet around it, the range sheet's Apply applies the range at once.

No markup or CSS change: the sheet is `sp-sheet` with `sp-calendar--sheet` as drawn in c14. Documented in the notes of Components c12 and c14 and Order list.

## Files

- `styles/components.css`
- `styles/COMPONENT-STATUS.md`
- `Components.dc.html`
- `Input types.dc.html`
- `Order list.dc.html`

`styles/check.js` reports the same 84 known findings as handoff_2026_10_03o_changes.
