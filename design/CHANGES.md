# Spendly - changes since handoff_2026_10_04j_changes

Copy these files over handoff_2026_10_04j_changes. Decisions are in `Brief 16 answers.md`.

## 1. Brief 16: no grip on an open budget account

Answer A. The plain line editor (`sp-line-editor--plain`) draws no grip when a row is open: an open row is not dragged, and the grip did nothing. The handle column stays as an empty `sp-list-item__handle` span (no icon, `aria-hidden`), so the name keeps its line. Moving an open account is the head's Move up / Move down.

- Budget 21d and the Components c15 plain-editor specimen updated; note added to Budget. The c15 CSS comment now says the same. No CSS rule changed.

**What the app changes**
- Render the open plain editor's handle column empty, with no grip icon and no drag.

## 2. Order list: the narrow card is two lines

The 420px list-column card (`sp-list-item--card`) loses its reference and status line. It reads vendor and amount, then date and item count with the saving under the amount. Note added to Order list.

- `CLAUDE.md`: the saving in the narrow list card is now "the second line of the right column".

**What the app changes**
- Drop the reference + status line from the narrow order card.

## 3. Stylesheet cleanup (no visual change)

`styles/check.js` now reports **0 findings** (was 84).

**Duplicate declarations split**, so each value is set once:
- `.sp-input, .sp-textarea`: `padding` moved to `.sp-input` alone (the textarea sets its own).
- `.sp-touch .sp-input, .sp-touch .sp-btn`: `font-size` moved to each (`--t-16` input, `--t-14` button).
- `.sp-card--shell .sp-meta`: removed from the `--shell-group` group; it keeps its own `--shell-item`.
- `doc.css`: `.doc-table__head, .doc-table__row`: `font-size` moved to `.doc-table__row`.

**Two names for one job, merged into the component library:**

| Old (page CSS) | New (components.css) | Pages |
|---|---|---|
| `ms-fab`, `ns-fab` | `sp-fab--docked` | Mobile screens, Navigation shell |
| `os-stats`, `st-quad` | `sp-stats` | Order statistics, Responsive reference, Settings and import |

The page rules are removed from `styles/pages/mobile-screens.css`, `navigation-shell.css`, `order-statistics.css` and `settings.css`.

**Kept apart on purpose:** `doc-eyebrow` (documentation card labels, `styles/doc.css`) stays separate from `sp-section-label`. Documentation chrome never goes in the app's stylesheets; the checker now skips doc-to-product matches.

**Truncation:** 15 title-and-subtitle pairs that lacked `sp-truncate` now have it (Components, Mobile screens, Order editing layouts, Settings and import).

**What the app changes**
- Take the new components.css. Use `sp-fab--docked` and `sp-stats` where the page classes were.

## 4. React

- `Picker` keeps its name. It renders `.sp-options`; the checker lists it as a named exception beside `DialogTitle` and `RangeSlider`. Ignore any mention of an `Options` rename: it was made and reverted, and no file in this package carries it.
- React components page: the harness scope now supplies `useLayoutEffect` (Mark.jsx needs it; the page rendered nothing without it). The Button sizes specimen adds Xsmall.

## 5. Checker (`styles/check.js`)

- A title or heading over a picture, a control or a paragraph is no longer treated as a stacked pair; `sp-combobox` and `sp-period` count as controls.
- Documentation (`doc-`) classes are not compared against product classes.
- `Picker: 'sp-options'` added to the named exceptions.

## Files

- `Budget.dc.html`, `Components.dc.html`, `Mobile screens.dc.html`, `Order editing layouts.dc.html`, `Order list.dc.html`, `Order create.dc.html`, `Navigation shell.dc.html`, `Order statistics.dc.html`, `Responsive reference.dc.html`, `Settings and import.dc.html`, `React components.dc.html`
- `styles/components.css`, `styles/doc.css`, `styles/check.js`, `styles/COMPONENT-STATUS.md`
- `styles/pages/mobile-screens.css`, `navigation-shell.css`, `order-statistics.css`, `settings.css`
- `Brief 16 answers.md`, `CLAUDE.md`
