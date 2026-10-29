# No focus ring is cut by the part around it

This answers the follow-up to the brief "a folding group stays cut off after it opens again": check
that a focus ring is not cut anywhere else, and fix every place where it is.

`Fold` itself is already on main (`react/src/components/motion.js`, from `handoff_fold_clip`). This
package adds the two checks that look for the fault, and fixes the eight components they found.

## The checks

**The problem.** The `Fold` fault showed only in the app, and nothing in the design caught it or
anything like it. A container that clips (`overflow` hidden, clip, auto or scroll) cuts the 3px
ring of any control that sits closer than 3px to its edge.

**What changed.** There are two new assertions.
- `styles/check.js`, "Motion never holds a clip": no file in `react_handoff/` gives Motion an
  `overflow` value (in `initial`, `animate`, `exit`, a `while*` prop or `animate()`), uses
  `transitionEnd`, or sets a clip on an element without clearing it in `onAnimationComplete`. Run
  against the old `Fold`, it reports four findings.
- `checks.html`, "a focus ring is not clipped": every control on every page that can take focus is
  measured, with its ring, against every parent that clips. The ring is read from the stylesheets
  by the cascade (unlayered over `@layer base`, then specificity, then order). An inset ring or a
  focus drawn as a fill reaches nothing outside the box. A ring drawn by the part around the control
  (`:focus-within`, `:has(:focus-visible)`) is measured on that part. A device or window frame is
  not counted, since its edge stands for the screen's edge. A scroller moved off its start is not
  counted at the edge it has scrolled past.

**Where.** `styles/check.js`, `checks.html`.

**What is still open.** Neither check runs the app. A browser test on the app side, which folds and
opens a filter group and then measures the ring, would cover what happened there. Please confirm
whether one is wanted.

## Eight components gave a ring room

**The problem.** On its first run the ring check found 72 cut rings in 8 components.

**What changed.** Nothing moves at rest. A scroller keeps room for the ring the way a facet's values
already do (`.sp-field-group__values`): a negative `--sp-4` margin and a `--sp-4` padding, so its
content stays where it was. Where a control fills a clipping part, the ring is drawn inside it, or
by the part itself.

1. **Sidebar nav scroll** (Navigation shell, short window). `.ns-scroll` takes the room. 21 rows,
   which were cut at the left, and at the top for the first row.
2. **Open button inside an attachment mark** (Components; Order editing layouts strip). The mark
   clips, so `.sp-mark:has(> .sp-mark__open:focus-visible)` draws the ring on the mark, as
   `button.sp-mark` does. This replaces the ring on `.sp-mark__open`, which could not be seen.
3. **Link out inside a title stack** (Ask Spendly 24d file rows, Mobile screens 7a). The stack
   hides its overflow for the cut, so `.sp-stacked:has(> a.sp-link-out)` takes the room.
4. **Calendar days at the edges** (Components, the range sheet). `.sp-calendar--sheet` takes the
   room at the sides.
5. **What Ask can do examples** (Ask Spendly 24c, Mobile screens 7a). `.sp-chat__help` takes the
   room.
6. **Card head that spans a flush card** (Components c1; Order create and Order editing layouts,
   Order details on a phone). `.sp-card--flush` clips its corners, so a `.sp-list__toolbar--toggle`
   or `--link` that is its child draws `inset var(--ring)`. It follows the card's top corners, and
   all four once the card is folded to its head.
7. **Rows in a popover list** (Vendors and categories picker). `.sp-popover__list` takes the room,
   and `.sp-menu--plain.sp-popover__list` keeps it where the list is also a plain menu, whose
   `padding: 0` overrode it.
8. **Create row in a popover list** (Components, Order list 2b category picker). Fixed by the same
   `.sp-popover__list` rule.

**Where.** `styles/components.css`: `.sp-card--flush > :is(.sp-list__toolbar--link,
.sp-list__toolbar--toggle):focus-visible`, `.sp-mark:has(> .sp-mark__open:focus-visible)`,
`.sp-calendar--sheet`, `.sp-popover__list`, `.sp-menu--plain.sp-popover__list`, `.sp-chat__help`,
`.sp-stacked:has(> a.sp-link-out)`. `styles/pages/navigation-shell.css`: `.ns-scroll`. In the app,
`react/src/styles/components.css` takes the same rules.

**What is still open.** `.ns-scroll` is how the Navigation shell page draws a short window. Please
confirm that the app's sidebar, when it scrolls in a short window, keeps the same room on its
scrolling part.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `styles/components.css` - the seven component rules above.
- `styles/pages/navigation-shell.css` - `.ns-scroll`.
- `styles/check.js` - "Motion never holds a clip".
- `checks.html` - "a focus ring is not clipped". It runs against every page in the full design
  folder.
- `Navigation shell.dc.html`, `Components.dc.html`, `Ask Spendly.dc.html`, `Mobile screens.dc.html`,
  `Order create.dc.html`, `Order editing layouts.dc.html`, `Vendors and categories.dc.html`,
  `Order list.dc.html` - the pages where a ring changed. Only their stylesheet version changed.
- `support.js`, `components.js`, `icons.js`, `view.js`, `styles/tokens.css`, `styles/schemes.css`,
  `styles/doc.css`, `styles/pages/ask-spendly.css`, `styles/pages/budget.css`,
  `styles/pages/mobile-screens.css`, `styles/pages/order-create.css`,
  `styles/pages/order-editing.css`, `styles/pages/order-list.css` - what those pages load to open
  from the folder.

## styles/check.js

0 finding(s) across 28 pages.

`checks.html`: "a focus ring is not clipped" reports 0, down from 72. The other 142 findings are
from other rules and are the same before and after this change.
