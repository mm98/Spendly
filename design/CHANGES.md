# Spendly - changes since handoff_2026_10_08d_changes_fixed

Replaces handoff_2026_10_08e_changes. Copy these files over handoff_2026_10_08d_changes_fixed. Answers in Brief 34 answers.md.

## Changes
- components.css c10: a card's head (the first row, opening with `sp-section-label`) is `--card-header-h` tall, the list toolbar's height, with the name centred. It takes the card's top padding and the gap below, so content starts where a list's rows start. Cards and lists side by side carry their names at the same height, whatever sits beside the name.
- components.css: the desktop head link margin from 08e is gone; the fixed head covers it.
- tokens.css: `--btn-h-small: 34px`, used for the small button, xsmall on touch, the add row and the touch head link rule. Values unchanged.
- Home 10a and Mobile screens 7a: notes on the head height.
- Components c6 and the add row note name the token.
- check.js: asserts the card head height, the token, and no raw 34px in height, margin, padding, gap or inset.

## Open
- Whether a card head takes the toolbar's rule under it.

## Check
- 0 findings across 26 pages.

## Files
- Home.dc.html
- Mobile screens.dc.html
- Components.dc.html
- styles/components.css
- styles/tokens.css
- styles/check.js
- Brief 34 answers.md
