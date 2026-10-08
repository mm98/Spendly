# Brief 34 answers - other card title rows a button makes taller, and the 34px in the Brief 33 rule

## 1. The same rule on every card

Yes, on every card, on a phone and on desktop, whatever sits beside the name. A card's head, the row that opens with its name, is now the list toolbar's height (`--card-header-h`, 54px) with the name centred in it, in components.css on c10. It takes the card's top padding and the 12px gap below into itself, so a card's content starts where a list's rows start. The name sits at the same height on a card and on a list, with or without a link, an outline button, the extra-small Edit in the side panels or Budget's year control: all of them fit inside 54px.

This replaces the desktop link margin from the first answer to this brief. The touch link rule from Brief 33 stays; inside the fixed head it changes nothing visible. A card head still has no rule under it; a list toolbar keeps its own. Whether the card head takes the rule too is open.

## 2. The 34px

It is a token now: `--btn-h-small: 34px` in tokens.css, beside `--control-h` and `--control-h-touch`. components.css uses it for the small button's height, xsmall on touch, the add row, and the four places in the Brief 33 rule (the margin twice, the touch area inset twice). No `34px` is left in a height, margin, padding, gap or inset rule. Values are unchanged, so nothing moves.

If the app's check accepts only `--sp-*` names in spacing, it should also accept a calc of a control-size token: the touch area inset there has used `--control-h-touch` the same way since Brief 32. styles/check.js asserts the token, the desktop rule, and that no raw 34px returns.
