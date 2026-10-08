# Spendly - changes since handoff_2026_10_08d_changes_fixed

Replaces handoff_2026_10_08g_changes_fixed. Copy these files over handoff_2026_10_08d_changes_fixed.

New in this package: a head is one line whatever the data puts in it, built into the component. In a card head and a list toolbar alike, the name keeps its whole width and never breaks, and a meta, note or subtitle beside it stays on one line and takes the cut with an ellipsis. Controls and buttons keep their width. No page or app part adds a class for this; the component does it. Components c10 States note updated. checks.html asserts it: a name that breaks or is cut, or text beside it that can wrap, is a finding. 0 across 26 pages, and a stress run with a long vendor list in Spend by month kept the head at 54px on one line.

- components.css: the touch and below-640 text link head rules (Briefs 32, 33) are removed; nothing uses them.
- tokens.css: --btn-h-small: 34px.
- Every button in a card head or list toolbar is sp-btn--outline sp-btn--small: Home (5), Mobile screens (2), Components (1), Navigation shell (2), Order list (9).
- Order statistics 4a and Dark mode: the Spend by month legend moved below the head.
- Budget: Budget 2026 and Columns heads are list toolbars.
- Duplicate and alerts, Mobile screens: the August summary and Spend, August put the name in the head.
- checks.html: new rendered rule "a card name sits in the head"; the style gate also accepts a 16px side inset, since a card with a head has no top padding.
- check.js: asserts the head rule, the token, no raw 34px, and no text link head rule.

## Check
- styles/check.js: 0 findings across 26 pages.
- checks.html, "a card name sits in the head": 0 findings across 26 pages. The other findings it reports (title stacks, three aria-describedby references in Order editing layouts, Type specimen and Playground load time) are not about the card head.

## Files
- Components.dc.html
- styles/pages/order-editing.css
- Home.dc.html
- Mobile screens.dc.html
- Components.dc.html
- Order statistics.dc.html
- Dark mode and image viewer.dc.html
- Duplicate and alerts.dc.html
- Budget.dc.html
- Navigation shell.dc.html
- Order list.dc.html
- styles/components.css
- styles/tokens.css
- styles/check.js
- checks.html
- Brief 34 answers.md
- Brief 35 answers.md
