# The filter row places focus without a microtask

This answers "Brief: the filter row places focus without a microtask" (26 October 2026), its one point. The change is in one part in `react_handoff/`. No exported component gains or changes a prop. Take the file in unchanged.

## 1. Filters: focus when the row goes with its last crumb

- **The problem:** when Clear all, or removing the only crumb, takes the filter row away, `useKeptFocus`'s cleanup queued the placement with `queueMicrotask`: one deferred step after React's work.
- **What changed:** as the brief's patch. The cleanup runs while the row's controls are still on the page and still hold focus, so it moves focus there and then to the first control in `order` that is still on the page and not inside the row. It does so only when focus is on nothing, on the page, or inside the row, so a reader who has already moved on keeps their place. The comment above `useKeptFocus` now ends "...take the row away with them: then focus moves out of the row as it goes." `placeFocus` stays; the per-drawing placement still uses it. What the reader sees is unchanged: focus lands on the first control after the row, as the Actions note in Components c12 already says.
- **Where:** `react_handoff/List.jsx`, `useKeptFocus`. App: `react/src/components/List.jsx`; it reaches the crumbs row on `react/src/pages/Orders.jsx`, `Categories.jsx`, `Bookmarks.jsx` and `Vendors.jsx`, which need no change. Components c12 needs no change.
- **What is still open:** nothing. The brief measured both Categories cases and the 12 earlier cases on its tested copy.

## later.md

- "A deleted record should not be removed for good at once": kept for later, at the user's decision, as in the last packages. Not changed in this pass.
- "Large accounts still make everyone wait" and "The status guard does not run in project threads" are not design work.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `React components.dc.html` - renders `react_handoff/`, so the changed part can be tried; unchanged.
- `react_handoff/` - every component, as the React components page loads them. Changed: `List.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - what the page links, unchanged.

## styles/check.js

Not run to completion: the checker timed out (30 s limit) in this session, as in the last package. No stylesheet, page or prop changed, so no assertion is affected. A sweep of the changed files for em dashes, en dashes and curly quotes found none.
