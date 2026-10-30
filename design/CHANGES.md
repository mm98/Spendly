# The vendor field is drawn as the searchable combobox

## Fixed from handoff_vendor_field_chevron_fixed

**The problem.** `handoff_vendor_field_chevron_fixed` was built from `design/` on main before the merge of the shop offers removal (`handoff_remove_shop_offers`). It put back `.sp-mark--logo`, `.sp-link-out` with its `.sp-stacked:has(> a.sp-link-out)` rule, `.sp-chat__file > .sp-chat__price`, their specimens and notes in `Components.dc.html`, and `assets/shop-logo.svg`. That removal is now on main, so those parts were taken out on purpose and must not come back.

**What changed.** This package is built again from `design/` on main as pulled at 2026-10-30T06:21:42Z, with the removal and the combobox list width change merged. The three parts and `assets/shop-logo.svg` are not in it. Only the five vendor fields and the c5 chevron below are applied on top; every other file is main's, unchanged.

**What is still open.** Nothing.

## 1. A chevron on the vendor field

**The problem.** The order form's vendor field is the searchable combobox (mode 2, Components c5), whose list offers Favourites, Recent and the other vendors. Five drawings showed it as a plain text input with no chevron, so it read as a field you can only type in.

**What changed.** Each of the five is now drawn as the closed searchable combobox from c5: `.sp-combobox` around `.sp-field__wrap`, the input `.sp-input--trail` with `role="combobox"`, `aria-expanded="false"`, `aria-autocomplete="list"`, and the `.sp-field__chevron` at its right end, pointing down. No style values or components changed; this is the existing c5 markup.

**Where.**
- `Order create`, the vendor field in the screen at the top of the page (`oc-fv`) and the one further down (`oc-f5`).
- `Order editing layouts`, the vendor field (`oe-lbl5`).
- `Responsive reference`, the vendor field (`rr-f1`).
- `States and confirmations`, the vendor field in its "A vendor is required" error state (`sc-f3`).
- App: none. The order form's vendor field is already a searchable `Combobox` with the down chevron (`react/src/pages/OrderForm.jsx`, `VendorPicker`).

**What is still open.** Nothing.

## 2. The c5 searchable specimen's chevron points down

**The problem.** The c5 specimen "Combobox - mode 2, searchable" was drawn closed with its chevron pointing up. The rule beside it says a closed chevron points down and turns up only for a list placed above.

**What changed.** The chevron points down, as on every closed dropdown.

**Where.** `Components c5`, the "Combobox - mode 2, searchable" specimen. App: none; the component already draws it down.

**What is still open.** Nothing.

## later.md

Read on main before this task. Its one entry, a deleted record kept for a while, is an idea for later and is not a design fix.

## Files

- `Order create.dc.html` - a page that changed.
- `Order editing layouts.dc.html` - a page that changed.
- `README.md` - the design's overview, unchanged.
- `Responsive reference.dc.html` - a page that changed.
- `States and confirmations.dc.html` - a page that changed.
- `components.js` - loaded by the changed pages.
- `icons.js` - loaded by the changed pages.
- `styles/components.css` - loaded by the changed pages.
- `styles/doc.css` - loaded by the changed pages.
- `styles/pages/order-create.css` - loaded by the changed pages.
- `styles/pages/order-editing.css` - loaded by the changed pages.
- `styles/pages/responsive-reference.css` - loaded by the changed pages.
- `styles/pages/states.css` - loaded by the changed pages.
- `styles/schemes.css` - loaded by the changed pages.
- `styles/tokens.css` - loaded by the changed pages.
- `support.js` - loaded by the changed pages.
- `view.js` - loaded by the changed pages.
- `Components.dc.html` - the c5 specimen's chevron, on main's copy.
- `CHANGES.md` - this note.

## styles/check.js

0 finding(s) across 28 pages, run in the design project with these same changes applied.
