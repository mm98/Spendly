# Spendly - changes since handoff_2026_10_08d_changes_fixed

Copy these files over handoff_2026_10_08d_changes_fixed. Answers in Brief 34 answers.md.

## Changes
- tokens.css: new `--btn-h-small: 34px`, the small button's height.
- components.css: the small button, xsmall on touch, the add row and the Brief 33 head link rule use `--btn-h-small` in place of 34px. Values unchanged.
- components.css: a text link in a card's head takes no height in the row on desktop as well, so the name sits 17px below the card's top edge with or without it.
- Home 10a: note on the head link.
- Components c6 and the add row note name the token.
- check.js: asserts the token, the desktop rule, and no raw 34px in height, margin, padding, gap or inset.

## Open
- Outline buttons in a card head (Download all, Edit on category, Views Edit) still make the head taller. See Brief 34 answers, question 1.

## Check
- 0 findings across 26 pages.

## Files
- Home.dc.html
- Components.dc.html
- styles/components.css
- styles/tokens.css
- styles/check.js
- Brief 34 answers.md
