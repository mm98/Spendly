# A saved view's count can be highlighted

## Fixed from `design_handoff_view_highlight`

A highlighted view whose count is 0 showed the 0 in the warning ink, a warning about nothing. The warning ink now applies only while the count is above 0; at 0 the count is plain, as Needs a look hides a row with nothing in it and a saving of 0 stays grey. The flag stays on the view, so the ink returns when an order lands in it. Drawn as notes in Order list 2g and Navigation shell 9e. App: `react/src/app/views.jsx` sets `countColor="warning"` only when `view.attention` is on and `view.count > 0`. Highlight count is still offered in the menu at any count. No style changed.

Settles the `later.md` entry "A saved view's warning colour has no control". The reader asked in review that the control be in the view's three-dots menu, named "Highlight count".

## later.md: "A saved view's warning colour has no control"

**The problem** - The server can show a view's count in amber (`attention` on the view, read in `react/src/app/views.jsx` as `countColor="warning"`), but nothing in the app turns it on. The design described the flag in Navigation shell 9e as "set when it is saved", yet the save step and the per-row menu in Order list 2g had no control for it. 9e also named `--amber-2` for the dark sidebar, while `styles/components.css` uses `--shell-warning`.

**What changed** - The per-row menu of a saved view, in edit mode, gets **Highlight count** with the alert-triangle icon, after Make default and before the rule above Delete view. On a view that is highlighted the item reads **Stop highlighting count** in its place, the same swap Make default makes with "Stop opening with it". Choosing it sets or clears `attention` on the view. A new view starts with it off, so the save step is unchanged. The flag is never derived from the count. While it is on and the count is above 0, the count takes the warning ink in the rail and the sidebar: `--shell-warning` on the dark sidebar, `--amber-ink` on the rail's white card, as `.sp-nav-item__count[data-color="warning"]` already draws it. The 9e note now names `--shell-warning` and points to 2g. No style changed.

**Where** - `Order list.dc.html` 2g, state 4 (EDITING: RENAME, DELETE, REORDER), the open menu on Hay this month, and a new implementation note before "Deleting confirms". `Navigation shell.dc.html` 9e, the note "A view can carry an attention flag". App: the view menu in `react/src/app/views.jsx`, and the update route in `api/src/routes/views.js`. This settles the later.md entry "A saved view's warning colour has no control". Please remove it.

**What is still open** - Nothing.

## later.md entries not settled in this pass

Left for later, as in the previous package (`design_handoff_confirm_link`):

- "The order form promises an order number nobody sees": show it in the order detail header and in order list rows. Not drawn yet.
- "The privacy notice does not name the exchange-rate lookup": not drawn yet.
- "Search finds categories and bookmarks but does not show them": not taken up.
- "51 of the design's checks are not held against the app", "Demo data counts returned orders as spending", "Categories with equal spend sort by their generated ids": app-side, with no design change.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Order list.dc.html` - the Highlight count menu item and its note, with the zero rule (2g).
- `Navigation shell.dc.html` - the corrected 9e note, with the zero rule.
- `support.js`, `components.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles the pages link.
- `styles/pages/order-list.css` - linked by Order list.
- `styles/pages/navigation-shell.css` - linked by Navigation shell.

## styles/check.js

0 finding(s) across 26 pages.
