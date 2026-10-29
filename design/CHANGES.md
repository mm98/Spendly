# One left column: the facet rail and the section nav are one width

This answers the brief: the Settings section nav takes the same width as the order list's facet rail,
so the content cards beside either start at the same left position. Layout rules states it.

## The facet rail and the section nav share one width

**The problem.** The two left columns had different widths, and the design said a third thing. The
facet rail (`.sp-rail`) was 232px and the section nav (`.sp-section-nav`) 224px. Layout rules,
"2 - Left rail plus main", gave 260px for the facets and 208px for a page-level nav. The first card
beside the facets started 260px from the page's edge, and in Settings it started at 240px, so moving
between the two pages shifted the content 20px.

**What changed.**
- There is a new token, `--rail-left-w: 232px`, the width of the left column inside a page.
  `.sp-rail` takes `width: var(--rail-left-w)`, so the facet rail is unchanged.
- The section nav is the same column. It has no card: it runs from the page's edge, taking in the
  body's 16px inset, to a divider where the facet column ends. Its width is
  `calc(var(--sp-16) + var(--rail-left-w))`, 248px, which is 24px wider than before. Its rows now
  start 16px in, where the facet cards start.
- The pane beside it starts 12px after the divider, which is the body's column gap. The first card
  in Settings is now at 260px, the same as on the order list.
- The longest Settings label, Money, dates and times, still fits on one line, and every row is
  still 40px.

**Where.**
- `styles/tokens.css`: `--rail-left-w`.
- `styles/components.css`: `.sp-rail`, and `.sp-section-nav` with its comment.
- `styles/pages/settings.css`: `.st-pane`, left padding `var(--sp-12)`.
- `styles/doc.css`: `.doc-rail-demo`, the documents' facet specimen, at `var(--rail-left-w)`.
- Text: `Layout rules 15a` card "2 - Left rail plus main" (its block and its note),
  `Settings and import 11a` note, `Responsive reference` Settings row, `Order list` note on
  container queries.
- In the app:
  - `react/src/styles/tokens.css` and `react/src/styles/components.css` take the same token and
    rules.
  - `react/src/pages/Settings.jsx`: the desktop row is `sp-row-flex sp-top sp-gap-16`. It becomes
    `sp-gap-12`, so the cards are 12 from the divider, as in the drawing.
  - `react/src/styles/app.css` already pulls the nav out to the page's edge with a
    `-var(--card-pad)` left margin. That stays.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `styles/tokens.css`, `styles/components.css`, `styles/pages/settings.css`, `styles/doc.css` - the
  rules above.
- `styles/check.js` - new assertion "One left column": `.sp-rail` and `.sp-section-nav` take their
  width from `--rail-left-w`, the token is 232px, and no page states another width for the facet
  rail, the facets or the section nav.
- `Layout rules.dc.html`, `Settings and import.dc.html`, `Order list.dc.html`,
  `Responsive reference.dc.html` - the text that stated the old widths, and the new stylesheet
  version.
- `Section switcher.dc.html`, `Components.dc.html` - pages that draw the section nav. Only their
  stylesheet version changed.
- `support.js`, `components.js`, `icons.js`, `view.js`, `styles/schemes.css`,
  `styles/pages/layout-rules.css`, `styles/pages/section-switcher.css`,
  `styles/pages/order-list.css`, `styles/pages/responsive-reference.css` - what those pages load to
  open from the folder.

## styles/check.js

0 finding(s) across 28 pages.
