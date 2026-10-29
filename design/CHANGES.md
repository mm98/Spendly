# Right rail widths as tokens

Brief: the right rail is a hardcoded 360px, while the left column already reads a token.

## The right rail reads two tokens

**The problem.** `.sp-panel` was a bare `width: 360px` and `.sp-panel--wide` a bare `400px`, while the left column (`.sp-rail`, `.sp-section-nav`) reads `--rail-left-w`. Layout rules also listed a 320 right rail for Home that no rule draws: Home's two columns are proportional (`.hm-split`, 1.35fr / 1fr).

**What changed.** Two tokens, at the values the panel already had, so nothing moves on screen:
- `--rail-right-w: 360px` - the rail beside a record, holding a form's metadata.
- `--rail-right-w-wide: 400px` - the panel that is itself a form (the library).

Layout rules now lists the right rail as 360 / 400 with the token names, and the 320 is gone since nothing draws it.

**Where.**
- `styles/tokens.css`: the two tokens, after `--rail-left-w`.
- `styles/components.css`: `.sp-panel` reads `var(--rail-right-w)`, `.sp-panel--wide` reads `var(--rail-right-w-wide)`.
- Layout rules: the "Main plus right rail" shape note, and the "Fixed rail widths" row of the build-to-these table.
- Responsive reference: the CSS shown for shape 3 now reads `width: var(--rail-right-w)`.
- App: copy `styles/tokens.css` and `styles/components.css` into `react/src/styles/`. Any app rule that restates 360 or 400 for the panel should read the token.

**What is still open.** Nothing.

## Stale left-column widths in Layout rules

**The problem.** The "Fixed rail widths" row still said "260 facets, 208 page nav". Both are `--rail-left-w`, 232px. `styles/check.js` missed it because its sweep only matched the number with `px` after it.

**What changed.** The row says 232 left for the facets and the section nav (`--rail-left-w`), and names the sidebar tokens (`--sidebar-w`, `--sidebar-w-rail`) beside 248 and 68.

**Where.** Layout rules, the build-to-these table. `styles/check.js`, the "One left column" sweep, now matches the number with or without `px`, and "page nav".

## styles/check.js

New assertion "One right rail": `.sp-panel` and `.sp-panel--wide` take their width from the two tokens, the tokens are 360px and 400px, and no page states another set of right rail widths or shows the panel at a bare pixel width. It reported 6 findings before the fix and none after.

## later.md

The one entry, "A deleted record should not be removed for good at once", is marked as an idea not to be built until asked, so it is left as it is.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Layout rules.dc.html`, `Responsive reference.dc.html` - the changed pages.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the pages load to open.
- `styles/tokens.css` - the two new tokens.
- `styles/components.css` - `.sp-panel` and `.sp-panel--wide` read them.
- `styles/schemes.css`, `styles/doc.css`, `styles/pages/layout-rules.css`, `styles/pages/responsive-reference.css` - stylesheets the pages link.
- `styles/check.js` - the checker with the new assertion.

## Result

0 finding(s) across 28 pages
