# Spendly - the budget amount field on touch

Copy these files over handoff_2026_10_08m_changes.

**Fixed: the 16px touch rule made the budget amount field wider.** A cell field has no width of its own and takes it from its font, so at 16px the field on a budget line (`sp-input--cell` in `sp-sum--edits`) grew, pushed the line's name aside and, with a long name, went past the card and scrolled the page sideways. It already went past at 12px.

- components.css: on touch, the amount field on a budget line holds ten characters (`10ch` at its 16px, an amount up to 999.999,99, plus its padding and border: 110px), and the line's name and its meta take the cut with an ellipsis however long they are. The field still hangs its 4px padding outside the figure column, so its figures line up with the plain amounts above and below.
- checks.html: the 16px check leaves out a colour field (`type="color"`, the custom swatch in Components c7): it opens a picker, not a keyboard, and the phone does not zoom on it.
- Components, Notes for implementation (the opening section): both rules.

## Tested
- Mobile 7a, as drawn: the three budget lines are 53px each; the field is 110px at 16px; nothing past the card.
- The same line with an 83-character name: the name ends in an ellipsis, the field is 110px, nothing past the card, no sideways scroll.
- The 16px rule switched on and off and measured on every page with touch frames: Mobile screens (1 field changes, now no reflow), Layout rules, Order create, Order editing layouts, States and confirmations, React components (no field changes size). Components is covered by checks.html.
- check.js: 0 findings across 26 pages. checks.html: clean, 24 rules over 26 pages.

## Files
- styles/components.css
- checks.html
- Components.dc.html
