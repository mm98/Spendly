# Spendly - changes since handoff_2026_10_08h_changes

Copy these files over handoff_2026_10_08h_changes, applied on handoff_2026_10_08d_changes_fixed. Answers Brief 36: see Brief 36 answers.md.

- The Showing bar is a card with a head: the name, Reset and Open in orders in the head, the path below it where it wraps. sp-crumbs-bar removed. Order statistics 4b and 4c, Mobile screens 7a (the bar replaces the bare path), Components c8.
- components.css: sp-card--spread, sp-combobox--narrow, sp-segmented--narrow, sp-row-opens (hover, focus ring, touch height); a small button in a card head or list toolbar keeps its 34px box on touch with an invisible 48px area, under .sp-touch and below 640px.
- tokens.css: --field-w: 280px.
- Settings and import 11a: st-w280 replaced by the narrow variants; the page rule removed.
- Order create 3a: oc-narrow is a page box around the parts, not a class on them.
- Home 10a: the month panel takes sp-card--spread; the page rule removed from home.css.
- Rows that open: Statistics By status and Top vendors, Home Categories this month, Mobile Drafts and Recent orders.
- Components: notes for c5, c6, c8, c10. Mobile screens note on the head button updated.
- check.js and checks.html: the Brief 36 assertions.

## Check
- styles/check.js: 0 findings across 26 pages.

## Files
- Components.dc.html
- Home.dc.html
- Mobile screens.dc.html
- Order create.dc.html
- Order statistics.dc.html
- Settings and import.dc.html
- styles/components.css
- styles/tokens.css
- styles/check.js
- styles/pages/home.css
- styles/pages/order-create.css
- styles/pages/settings.css
- checks.html
- Brief 36 answers.md
