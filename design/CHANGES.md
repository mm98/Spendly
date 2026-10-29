# A folding group stays cut off after it opens again

Answers the brief "a folding group stays cut off after it opens again".

## Fold drops its clip once every opening ends

**The problem.** A filter group that was folded and opened again kept `overflow: clip` on its
inline style. From then on the focus ring of every field and box in it was cut at the sides and top:
the vendor and category searches, the Kind field, the two Amount fields and the check boxes, in the
order filter rail and the phone Filters sheet. It stayed like that until the page was loaded again.
`Fold` gave the clip to Motion as an animated value (`overflow: 'clip'` in `initial` and `exit`,
`transitionEnd: { overflow: 'visible' }` on `animate`), and after an opening that animated, Motion
did not apply the `transitionEnd`.

**What changed.** `overflow` is no longer a Motion value. `Fold` sets `overflow: clip` on its own
element in `onAnimationStart` and clears it in `onAnimationComplete`, on every opening and closing.
At rest the element has no `overflow` style and takes the `.sp-fold` rule, which clips nothing. A
fold drawn open on load never animates and is never clipped, as before. The height and opacity
motion, its timing and its tokens are unchanged, and nothing about the look changes: the ring
matches the Order list page in the design system.

**Where.** `react_handoff/motion.js`, `Fold`; in the app, `react/src/components/motion.js`. It covers
every place that uses `Fold`:
- `Choice.jsx`, `FieldGroup` with `facet`: every group in the filter rail and the Filters sheet
  (`react/src/pages/Orders.jsx`).
- `Choice.jsx`, `FieldGroup` with `meta`: the Amount group on the order list.
- `Card.jsx`, `CardBody` with `open`: Order details on a phone and in a narrow window
  (`react/src/pages/OrderForm.jsx`) and the sums on an order (`react/src/pages/Order.jsx`). No ring
  is cut there today, but they had the same stuck clip, which would cut off a menu opened inside them.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `react_handoff/motion.js` - `Fold` with the clip set and cleared on the element.

No page or stylesheet changed, so none is included.

## styles/check.js

0 finding(s) across 28 pages.
