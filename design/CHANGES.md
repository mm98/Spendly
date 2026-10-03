# Spendly - changes since the last 3 October package

Copy these files over the 3 October package (handoff_2026_10_03_changes). Nothing else changed.

## Brief 3: answers

**Applied in the design (the app can drop its copies):**
- A4 `.sp-input.sp-input--cell[aria-invalid="true"]` after the cell rule.
- A5 `[data-theme="dark"] .sp-tip__row { color: var(--ink-3); }`.
- A6 `.sp-line-editor--sheet > .sp-line-editor__form { align-self: stretch; }`.
- A7 all eight: combobox value one line with ellipsis, `.sp-sum__value` breaks, legend items ellipsis with the key fixed, segmented stays in its column, `flex: none` on the crumb x, the sheet handle and the editor head's buttons, `.sp-scrim--dialog` track `minmax(0, 1fr)`.
- A8 focus on the chosen swatch: a third ring, `0 0 0 7px var(--green-tint)`.
- 2c note now says `--surface-3`. Sign-in: the card's 16/12 stand; the dead 32/16 in `.au-panel` is removed. Summary rows: c21 now names Budget's editable amount as the exception. Floating menu is 6 clear (c9). `data-dot="problem"` is `--red-ink`. `.sp-kbd` takes the product font. `a.sp-tabbar__item` has no underline. Mark.jsx: `swatch` takes a swatch name only; a picked colour goes in `style.background`. 7a points to Components c0 for touch heights. `--list-max` comment fixed.
- Part C, taken in as the app wrote them, at the end of `components.css`: zero saving on the dark card, combobox invalid, `.sp-announce`, flip-up overlays (6 clear, not 2), search 420, `.sp-list-item--opens`, `a.sp-cell-flex`, `button.sp-crumb`, green alias chip, `a.sp-record__photos`, popover in a sheet, touch fields stack, `.sp-hold`, `.sp-column--form`, `.sp-auth`, invisible 44px press areas, preset track target, card menu hit area.
- **4a readout, changed by the owner:** it stands above its bar, centred, 8 clear of the tallest of that bar and its two neighbours (`--tip-at`, set by the app); `data-side="start"|"end"` near the ends; `data-pin="top"` puts it inside the plot's top edge when there is no room. `.os-tip` is gone; the app's `right: 100%; bottom: 96px` rule goes.

**The design stands, the app changes:**
- Phone save bar: `--phone-gutter` is 16 in the design's tokens. The app's 12 override is removed.
- Account menu sidebar: only the nav scrolls (9g).
- Facet values scroll at 240 (16a). `--list-max` is for panels, a different job.
- `.sp-period { flex-wrap: wrap }`, `.sp-range--single` and the bulk bar's -12 margin are not taken; see open decisions.

**Open, waiting for the owner:** A1 period row, A2 phone search exit, A3 touch sizes, the 2b empty square, PDF rail below 900, card photo borders in dark, filters below 1280, stacking below 900, status pill truncation, the account menu / split control / rail tooltip / phone bulk-bar rules (need drawings first), and Part D.

**Owner's decisions (applied):**
- A1: Which orders and Export move to the top bar's right end on every Statistics screen. The period row holds the period alone and keeps `nowrap` on desktop; the app drops `.sp-period { flex-wrap: wrap }`.
- A2: 7b draws **Cancel** (`sp-btn sp-btn--text`) at the field's right. It closes the search and returns to where it was opened.
- A3: on touch every listed control takes `--control-h-touch` visibly: icon buttons, the window stepper's arrows, Add a row, chips, colour cells, menu, dropdown and search rows, facet headings, the From/To fields, Budget's editable summary rows. Notes in c14, c24 and the add-row note updated.
- 2b empty square: the CSS stands (dashed `--line-3`, no glyph); the 2b note now says so, at 42px (`--mark-medium`).
- PDF page rail stays on the left at every width; 18b updated.
- Card photos in dark mode carry 17b's 1px `--line-3` edge (inset); 2c updated.
- Filters below 1280: a drawer from the left, 320px; below 640 the bottom sheet. 18b updated.
- Below 900 / 1280: the side panel and views rail hide or become the summary line, as Responsive reference draws. The app stops stacking them.
- A long status name truncates in Settings' Statuses list only: `.sp-pill--truncate`.
- Not drawn, so not taken: the New order split control, account menu placement, rail tooltip, phone selection bar, failed card. Part D: none taken; the app removes them.

**Changed by the owner:** the card box's round scrim is gone. Over a photo the box reads by its own white fill and `--shadow-menu`; on the No photos band it has no shadow. `--overlay-scrim` now serves the palette only.

## Files

- `styles/tokens.css`
- `styles/components.css`
- `styles/pages/auth-and-first-run.css`
- `styles/pages/order-statistics.css`
- `Order list.dc.html`
- `Order statistics.dc.html`
- `Components.dc.html`
- `Mobile screens.dc.html`
- `Dark mode and image viewer.dc.html`
- `Responsive reference.dc.html`
- `Settings and import.dc.html`
- `react_handoff/Mark.jsx`

`styles/check.js` is unchanged and reports the same 84 known findings.
