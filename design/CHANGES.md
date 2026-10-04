# Spendly - changes since handoff_2026_10_04g_changes

Copy these files over handoff_2026_10_04g_changes.

## 1. Line editor (c15): Line total is a read-only field

Line total was bold text with no box. It is now a read-only amount field, the same markup as Unit price, so it sits in the row of boxes beside it:

```html
<div class="sp-field">
  <label class="sp-field__label" for="ID-total">Line total</label>
  <span class="sp-field__wrap">
    <input class="sp-input sp-input--unit sp-number" id="ID-total" type="text" readonly value="1.780,00">
    <span class="sp-field__unit">kr.</span>
  </span>
</div>
```

- It takes the established read-only look from `.sp-input:read-only` (surface-2 fill, line border). No new style.
- The label is now a `<label for>`.
- Before an amount exists (States and confirmations, the new-line state) the field is empty.
- `.sp-line-editor__computed` is removed from `styles/components.css`; nothing uses it.
- Applies wherever the line editor appears: Order editing layouts (1b, 1c), Components c15, Dark mode and image viewer, States and confirmations, Responsive reference.
- Logged in `styles/COMPONENT-STATUS.md`.

An interim right-aligned version of the total was made and reverted in this round; nothing of it ships.

**What the app changes**
- Render Line total as the read-only field above, updated as quantity and unit price change. Remove the computed-text element and its CSS.

## 2. Responsive reference: duplicate id

The two line editors on the page now have distinct total ids (`rr-total-a`, `rr-total-b`).

## Files

- `Order editing layouts.dc.html`
- `Components.dc.html`
- `Dark mode and image viewer.dc.html`
- `States and confirmations.dc.html`
- `Responsive reference.dc.html`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js`: 84 finding(s) across 26 pages, the same known set as handoff_2026_10_04g_changes.
