# Spendly - changes since the 2 October handoff

3 October 2026. Copy these files over the 2 October package; everything else is unchanged.

## Button xsmall (Components c6)

- `.sp-btn--xsmall`: 22px high, 6px side padding, 12px type at weight 500, the standard 9px radius.
- `.sp-icon-btn--xsmall`: 22px square, for an icon button beside it.
- On touch both take the next size up: the button is the small size (34px, 16px padding, weight 600), the icon button the row size (32px).
- Used for the action in a rail section header: Views (Edit, Save, Done, Cancel) and Filters (Clear all, Clear).
- React: `Button size="xsmall"` and `IconButton size="xsmall"`.

## From the app review (Part A and B)

Accepted:

- A1 `--list-max: 420px` in `styles/tokens.css`.
- A2 `variant="picked"` in `react_handoff/ListItem.jsx`.
- B1 `.sp-combobox__panel` and `.sp-palette__body` stop at `--list-max` and scroll inside.
- B2 the ordering-by-hand CSS, as requested. The shadow contradiction is settled for `--shadow-menu`: the c1 notes now name it, no new token.
- B3 "Stop opening with it" added to the notes in 2g and 9e.
- B4 xsmall excluded from the touch full-width rule. The design's narrow-width block is `@media (max-width: 640px) { .sp-btn { width: 100%; } }`, not the app's `639.98px` / `:not(.sp-btn--small)`; it now reads `.sp-btn:not(.sp-btn--xsmall)`. The app's copy of that block differs from the design and should be brought back to it.
- B6 Cards select the page: select-all box leads the summary line in 2c and is the bulk bar's box. Notes in 2c and 2h updated. Components c1 never carried the select-all sentence, so nothing changed there.
- B7 note only: "A card with no photos shows the box without the scrim." See below for the CSS.
- B8 the mark ink is calculated (APCA, tie keeps `--surface`). CSS sets the result per swatch and theme and adds `data-ink`; `Mark.jsx` works it out from the rendered fill. The c2 note's old "flips to dark ink above L 75" is replaced by the rule.
- B9 the update notice is a specimen and notes in States and confirmations 6d; 11d's note points to it.
- B10 `.sp-toast-region` added as a column, stretched on touch.

Decided against the app:

- B5 Done stays **outline** xsmall. Every rail header action in the design (Edit, Save, Cancel, Clear all) is outline xsmall; the solid Done in 9e was the odd one out and is now outline xsmall too. The app's solid Done should change.

Not applied:

- B7 CSS. The design's stylesheet has no `.sp-record__pick::before` scrim at all, so `content: none` would cancel a rule that does not exist. The 2c note describes the scrim (rgba(27,26,23,0.35), circular). Send the app's `::before` rule and it goes into the design with the empty-band exception.

## Brief 2: answers

The design is the source of truth. A rule the design does not hold is removed from the app unless listed below as allowed.

**A1 accepted.** The narrow-screen block is now `@media (max-width: 639.98px)` with `.sp-btn:not(.sp-btn--small, .sp-btn--xsmall) { width: 100%; }`. The design contradicted its own 18b, 1c and touch rule. The earlier B4 note asking the app to change is withdrawn.

**A2 accepted**, as the 2c note describes, with one change: the scrim colour is the token `--overlay-scrim`, not a literal (see B1).

**A3 accepted.** 2c's boxes read "Select all 18 orders on this page". The same c1 breach is in 16 more places (rows' header boxes on Order list, Components, Dark mode and image viewer, Responsive reference, Type specimen). `styles/check.js` now asserts it ("a select-all box names its scope"), and all 17 are fixed: the count is the specimen's page (18 where the list holds 18, otherwise the page size of 25). The c1 note now also names the ticked state: "Select all N orders on this page" when empty or dashed, "Clear the N selected orders" when ticked, which is what the app does.

**B1 tokens.**
- `--commit-bar-h: 68px` accepted. Used by the three 68px rules.
- `--fab: 56px` accepted. Used by `.sp-fab`; the app's clearance calcs may use it.
- `--overlay-palette` accepted under the design's name **`--overlay-scrim`** (light `rgba(27,26,23,0.35)`, dark `rgba(0,0,0,0.35)`), in the `--overlay-*` family. One value, two uses: the palette backdrop (9d) and the card box scrim (2c). Rename in the app.
- `--dialog-w` rejected. 420 appears once in the design's CSS; `.sp-dialog` keeps the literal.

**B2, rules the design has and the app does not.** The design keeps all 13; the app takes them.
- Search bar: `.sp-touch .sp-controls`. The design draws no container-query fold for the controls at 900; remove it from the app.
- Narrow-screen block: per A1.
- `.sp-line-editor--sheet .sp-note { display: none }`. Use the design's selector, not `.sp-touch .sp-line-editor .sp-dialog__actions > .sp-note`.
- Period: wraps on touch only, and `.sp-period__note` hides below 1100. Remove the app's desktop wrap and second-line note.
- `.sp-touch .sp-toast-region`: the design's selector stays. The app sets `sp-touch` on an ancestor of the toast region (`body` or `html`) so it matches; `body:has(.sp-shell--touch)` is not needed.

**B3, rules only in the app.** The appendix arrived cut off: 28 of 204 rules (`.sp-shell` and the first `.sp-viewer` rule). Nothing is adopted until the full list is in. Until then:
- Allowed in the app, in its own stylesheet and not in its copy of `components.css`: page-level integration that the design's framed mockups do not need: `.sp-shell--viewport`, `html:has(...) scroll-padding`, fixed positioning of the tab bar, save bar and FAB on a real window, `100dvh` heights. These may only implement behaviour the design already notes (9h, r13, 7b, 18a, c12, 16a) and must not change any component's look.
- Not allowed: any rule that changes a component's size, spacing, colour or type. Each one goes into the full appendix for a decision.
- The toast region rules in that group are replaced by the B2 answer.

## Later on 3 October

- **Order statistics 4a, outer spacing.** The Spend by month region carried `sp-shell__body` inside `.os-body`, so the page inset was applied twice. It is `sp-shell__body--split` alone now. `check.js` asserts "a body is not nested in a body".
- **4a stat cards, what a bar is.** Each header ends with the step: "Total spend · by month". The step follows the toolbar's period: by day for 30 days, by week for Quarter, by month for Year; a custom period takes the smallest that gives 12 bars or fewer. The dark bar is the step holding today.
- **4a stat cards, bar readout.** Hovering a spark bar shows `.sp-tip--panel` with the head only (step and value) and the order count beneath; no category rows, no drill-in. Page rule `.os-spark-tip` places the drawn specimen.
- **`.sp-bars--spark` is 56px tall**, was 34px.
- **Saved card shows amounts.** "+25.450 kr. vs 112.960 kr." replaces "22,1% of retail value"; the drilled Saved figure is green. `check.js` catches a percentage on a card headed Saved, and "of retail".
- **Select-all names.** All 17 boxes state their count; c1 names the ticked state "Clear the N selected orders".

## Files

- `styles/components.css` - the two variants and their touch rules.
- `react_handoff/Button.jsx` - `xsmall` added to both size maps and docs.
- `playground-registry.js` - `xsmall` added to both size options.
- `Components.dc.html` - xsmall specimen in c6; rail headers use xsmall.
- `Order list.dc.html`, `Navigation shell.dc.html` - Views and Filters header buttons use xsmall.
- `styles/COMPONENT-STATUS.md` - change log entry.

## Checks

`styles/check.js` reports 84 findings: the 83 of the 2 October baseline, plus one "a stacked pair truncates" on the new 6d notice, which copies the existing two-tab notice beside it (already one of the 83).
