# Section nav scrollbar

Brief: the Settings section nav scrolls with the browser's default scrollbar, while the sidebar beside it uses the styled one.

## The section nav scrolls with the shared bar

**The problem.** In a window shorter than the Settings nav, the nav scrolls, and it shows the browser's default grey scrollbar with arrows. The sidebar next to it shows the thin shared bar. The design never said the section nav scrolls: `react/src/styles/app.css` adds `overflow-y: auto` to `.sp-section-nav` on its own, so the nav was never in the shared scrollbar rules and `styles/check.js` could not see it.

**What changed.** The section nav now scrolls by its own nature in the design: `.sp-section-nav` carries `overflow-y: auto`, and it joins the shared scrolling-region rules, so it shows the same bar as every other scrolling region - thin, no track, a thumb in `--scroll-thumb`, 8px wide with a 2px inset and pill ends. Nothing changes at a window tall enough for the whole nav; no type, colour or spacing value changed.

**Where.**
- `styles/components.css`: `.sp-section-nav` (c35) gains `overflow-y: auto`; the selector is added to the shared lists under "scrolling regions": the `scrollbar-width: thin; scrollbar-color` rule, `::-webkit-scrollbar { width: 8px }` and `::-webkit-scrollbar-thumb`.
- Page: Settings and import 11a (the section nav, unchanged at its drawn height).
- App: `react/src/styles/app.css`, the `.sp-section-nav` block. Its `overflow-y: auto` is now stated by the design and can be removed from `app.css`; copy `styles/components.css` into `react/src/styles/components.css`.

**What is still open.** Nothing.

## later.md

The one entry, "A deleted record should not be removed for good at once", is marked as an idea not to be built until asked, so it is left as it is.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - the page that shows the section nav.
- `support.js`, `components.js`, `view.js` - what the page loads to open.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/settings.css` - stylesheets the page links.
- `styles/components.css` - the changed stylesheet.
- `styles/check.js` - the checker, whose scrolling-region assertion now covers the section nav.

## styles/check.js

0 finding(s) across 28 pages
