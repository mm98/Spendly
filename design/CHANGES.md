# Spendly - changes since handoff_2026_10_14c_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes, handoff_2026_10_14_changes, handoff_2026_10_14b_changes and handoff_2026_10_14c_changes applied. This answers brief 40.

## 1. The fix (styles/components.css, c3 token field)
- `.sp-tokens` padding top and bottom is `calc((var(--control-h) - var(--field-trail)) / 2 - 1px)` (5px), was `var(--sp-6)`. Left and right stay `var(--sp-10)`.
- `.sp-tokens` gains `align-content: flex-start`, so lines pack to the top.
- `.sp-tokens__add` gains `height: var(--field-trail)` (30px), the height of a value.
- `.sp-touch .sp-tokens` gains `padding-block: calc((var(--control-h-touch) - var(--field-trail)) / 2 - 1px)` (8px).
- The trail button rules are unchanged.

## 2. What it measures to
- Computer: 42px empty and with one line of values. The first line's middle is 21px from the top, level with the bulb's.
- Phone: 48px empty and with one line. The first line's middle is 24px from the top, level with the bulb's.
- More lines add 6px gap plus 30px each below the first line, which does not move.

## 3. Every place it reaches
- All drawn by `TokensField` in `react/src/components/Inputs.jsx`; no component code changes, only `components.css`.
- Categories on an order (with the bulb), categories on a bookmark, a vendor's default categories, a vendor's other names.
- Remove the entry for this fault from `problems.md` in the same change.

## 4. In the design
- Order create 3a: the categories field drawn with no category, one category and three lines, on a computer and on a phone, with the bulb, and notes for implementation on the field's height.

## 5. Check (styles/check.js)
- New assertion "a token field keeps its height": the base and touch padding, `align-content`, and the add input's height.
- Clean: 0 findings across 26 pages.

## Files
- Order create.dc.html
- styles/components.css
- styles/check.js
- styles/COMPONENT-STATUS.md
