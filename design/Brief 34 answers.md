# Brief 34 answers - other card title rows a button makes taller, and the 34px in the Brief 33 rule

## 1. The same rule on every card

Yes for a text link, on a phone and on desktop. components.css now gives a text link in a card's head `margin-block: calc(var(--btn-h-small) / -2)` without the touch scope, so on desktop "All 9" on Categories this month and "Statistics" on Last 8 months take no height in the row and the name sits 17px below the card's top edge, as on a card with nothing beside it. On desktop the 34px box is the hit area; it reaches 8.5px into the 16px padding above and the 12px gap below. The phone rule is unchanged. Note added to Home 10a.

Not yet for the outline buttons: Attachments "Download all", Monthly limit "Edit on category" and the Views "Edit". An outline button draws its border, so a 34px box beside a 17px name reaching outside the row would sit 7.5px from the card's top border and 3.5px above the first row, against 16px on the other three sides. A text link draws nothing until hovered, which is why the same margin works for it. Two ways to get the name to 17px on these cards:

- A. The action beside a card's name is always the text link (`sp-btn--text`), as on every Home card. One component for a card head action instead of two, and the rule above covers it with no new CSS.
- B. Keep the outline and let these heads stay taller, as now.

A changes how three buttons look, so it waits for your go-ahead. Recommended: A.

The side panel titles at 19.5px (desktop, extra-small outline at 22px) and Budget at 29.5px (the year control): Budget is on purpose, the year is a field the card's content follows and it keeps a field's height. The side panel titles follow the answer above: with A their Edit and Cancel become text links too and the titles move to 17px; with B they stay at 19.5px.

## 2. The 34px

It is a token now: `--btn-h-small: 34px` in tokens.css, beside `--control-h` and `--control-h-touch`. components.css uses it for the small button's height, xsmall on touch, the add row, and the four places in the Brief 33 rule (the margin twice, the touch area inset twice). No `34px` is left in a height, margin, padding, gap or inset rule. Values are unchanged, so nothing moves.

If the app's check accepts only `--sp-*` names in spacing, it should also accept a calc of a control-size token: the touch area inset there has used `--control-h-touch` the same way since Brief 32. styles/check.js asserts the token, the desktop rule, and that no raw 34px returns.
