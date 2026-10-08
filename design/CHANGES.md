# Spendly - CardHeader

Copy these files over handoff_2026_10_08i_changes.

A card's head is now one component, CardHeader, rendered as `.sp-card__head`. Before this it was a structural rule (a row helper whose first child is the name, or the name standing alone), so it had no name of its own and code built from the design could not tell a head from any other row: 191 heads in two shapes with three different gaps.

- components.css: `.sp-card > .sp-card__head:first-child` is the head. Only a card's first child is a head; the class anywhere else draws nothing. The structural selectors are gone. Same box as before (--card-header-h, transparent 1px bottom border, card top padding given up); the gap is now --sp-12, the list toolbar's gap, on every head.
- Every page: all 191 heads moved to `<div class="sp-card__head">`, the 129 lone names wrapped in it. Moved by the unified gap: the meta beside the name on Home Categories this month and Mobile Drafts and Recent orders, and the two buttons on the Showing bar, sit 4px further apart.
- react_handoff/Card.jsx: CardHeader. Only a child of Card: Card renders it first wherever it was written, inside a context only Card provides, so a CardHeader outside a card or nested inside a card's content renders nothing and reports the call. Every view is a named slot with one place: name, meta beside it; at the right end aside (default, note, danger), control, status, actions (at most two, always the small outline button), dismiss. No children, no className, no style. Also fixed: Toolbar used a TOOLBAR set that was never defined.
- Components c10: one specimen per view, and the rule in the notes. React components r5: the same views from the real CardHeader.
- check.js: a card name not in a CardHeader, a CardHeader not a card's first child, a CardHeader carrying another class or not opening with the name, a structural head selector, and a CardHeader that renders outside Card, are findings.
- checks.html: the same, rendered. Also fixed: three Order editing layouts inputs referenced help text that is not on screen (now only when it is); two Mobile screens option rows drew a sentence in a title stack (now the desktop Order create markup); Type specimen and Playground were reported as not rendering (the gate waited for a card neither has); Playground's inline chrome is exempt, as check.js already had it.

## Check
- styles/check.js: 0 findings across 26 pages.
- checks.html: clean, 23 rules over 26 pages.
- Every CardHeader view rendered and checked at 400px and 280px, in the library and from the React component.

## Open
At the 280px card minimum three heads do not fit on one line: Showing (two buttons), Spend by month (the switch), Categories this month (meta and a button). At 400px and on a phone all fit.

## Files
- Actions inventory.dc.html
- Bookmarks.dc.html
- Budget.dc.html
- Components.dc.html
- Dark mode and image viewer.dc.html
- Duplicate and alerts.dc.html
- Home.dc.html
- Icon legend.dc.html
- Images and files.dc.html
- Mobile screens.dc.html
- Navigation shell.dc.html
- Order create.dc.html
- Order editing layouts.dc.html
- Order list.dc.html
- Order statistics.dc.html
- Responsive reference.dc.html
- Settings and import.dc.html
- States and confirmations.dc.html
- Vendors and categories.dc.html
- React components.dc.html
- styles/components.css
- styles/check.js
- checks.html
- react_handoff/Card.jsx
- react_handoff/README.md
