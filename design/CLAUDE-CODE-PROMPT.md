# Prompt for Claude Code - implementing the Spendly design system

Paste everything below the line into Claude Code, run from the root of the `mm98/Spendly` repo, with this handoff folder copied in as `design/handoff_2026_10_08_full/`.

---

You are implementing the Spendly design system into the React app in `react/`. The design reference is in `design/handoff_2026_10_08_full/`. Read this whole prompt before changing anything.

## 1. What the handoff is

- `*.dc.html` pages are high-fidelity HTML mockups. They open directly in a browser, no build. They are the reference for layout, states and copy, not code to ship.
- `index.html` is the map of all pages. Open it first.
- `styles/tokens.css` holds every value: colour, type scale, spacing (6/8/10/12/14/16), radii (4/8/9/12/999). Never add a value outside these lists.
- `styles/components.css` is the single source of appearance for every component. Page and base rules live in `@layer base`; component rules are unlayered, so they always win. Keep it that way.
- `styles/doc.css` is documentation chrome only. Do not ship it.
- `styles/pages/*.css` is per-page mockup layout (device frames, specimen widths). Do not ship it.
- `react_handoff/` is the React files that emit class names only and set no styles. Its `README.md` lists every export and the rules behind it.
- Button sizes: standard 42px, small 34px, xsmall 22px (rail section headers only; small on touch).
- `PROJECT-RULES.md` is the rule set the design is held to. It is binding for you too.
- `github.md` maps each screen to the repo files it was drawn from.
- `styles/COMPONENT-STATUS.md` lists what is settled, limits and the change log.

## 2. Where components live

Lift these closely; they are written to be ported, not reinterpreted.

- Components: copy `react_handoff/*.jsx`, `format.js`, `variants.js` into `react/src/components/`. Keep the file grouping exactly as in `react_handoff/README.md` (a component lives with the thing it is part of; shared pieces live in `Utilities.jsx`).
- Styles: `tokens.css` and `components.css` become the app's design-system stylesheets, imported once at the app root. Replace overlapping rules in `react/src/styles/app.css`; do not keep two definitions of one component.
- Icons: the handoff does not ship `Icon.jsx`. Write `react/src/components/Icon.jsx` exporting `Icon({ name, size })` that draws the Tabler outline icon by name from `icons.js`. Only icons in that register are allowed (see `Icon legend.dc.html`).
- Reference while porting:
  - `Components.dc.html`: the canonical markup of every component and its states.
  - `React components.dc.html` (r1-r15): every React component rendered from the `react_handoff` files themselves. If a specimen breaks there, the props drifted.
  - `Playground.dc.html` + `playground-registry.js`: every component's props and allowed values.

## 3. How to build screens

1. Find the page that owns the screen in `index.html`. Read its notes ("NOTES FOR IMPLEMENTATION") beneath each mockup.
2. Compose the screen only from library components. Never hand-build something that resembles a component. If the library does not cover a case, stop and ask; do not approximate it.
3. No `className` or `style` passed to a control. A look the props cannot express is a gap in the library: add it there first, as a new variant beside the existing one.
4. Variants are named props with closed value sets. Structure rides in the class; colour rides in `data-color` (`primary`, `warning`, `danger`, `success`).
5. One implementation per component. A list row, mark, amount, picker, bar or card looks identical on every page. A variation is a state of the existing component, not a second component.
6. Reuse established gaps, padding and radii. Do not pick a new number because it fits.
7. Do not change any settled font size, weight, colour, radius or dimension. If content does not fit, say so and ask.
8. A card's name is always in a `CardHeader`, passed as a child of `Card`. Never build a card head from a row, a label and a spacer: `CardHeader` renders nothing outside `Card`, and the checks report a head built any other way. Pick the head's content from its slots (`name`, `meta`, `aside`, `control`, `status`, `actions`, `onDismiss`); a head the slots cannot express is a gap in the library, so ask.
9. A chart's legend goes under the chart. A crumb is text only. A row that opens something is `sp-row-opens` on a link or a button.

Screens and their pages:

- Shell and sidebar: `Navigation shell.dc.html`. Groups: Overview; Library (Vendors, Categories, Bookmarks); Budget as its own single-item group; Settings. Bank check is an action on the Budget page, not a sidebar row.
- Home: `Home.dc.html`
- Orders: `Order list`, `Order create`, `Order editing layouts`, `Order statistics`
- Vendors and categories: `Vendors and categories.dc.html` (5d: delete and merge also affect bookmarks)
- Budget: `Budget.dc.html` 21a-21h
- Bookmarks: `Bookmarks.dc.html` 22a-22d. The code calls this area wishlist; the product calls it Bookmarks. Routes are `/bookmarks`, never `/wishlist`. Bookmarks use the same categories as orders. Cover opens the URL; a category chip filters; edit, archive and unarchive are in the card menu; prices show whole kroner; one image per bookmark.
- Mobile: `Mobile screens.dc.html` 7a, plus `Responsive reference` and `Layout rules`.
- Settings, auth, states, alerts, images, dark mode: the pages of the same names.

## 4. Copy rules

- Plain hyphens only. No em or en dashes, no `&mdash;` / `&ndash;`.
- Straight quotes and apostrophes only.
- No decorative emoji; use an icon from the register.
- A saving is always an amount: `Saved 1.320,00 kr.`, green; `Saved 0,00 kr.` stays grey. Never a percentage, never "vs retail". It sits under the amount it belongs to.
- Product copy describes outcomes. Implementation reasoning goes in code comments or docs, never in the UI.

## 5. Validation

Do all of these before saying anything is done or consistent.

1. Design-side checks (in the handoff, unchanged): open `checks.html` in a browser for the rendered checks (overlap, clipping, hit targets, head centring, z-index); it is clean across 26 pages. `styles/check.js` holds the mechanical rules as assertions; it reports 0 findings. Any finding is a regression.
2. Port the relevant assertions from `styles/check.js` and `styles/CONVERSION-CHECKS.md` into a script in the repo (e.g. `react/scripts/check-design.mjs`), run in CI, covering at least:
   - every class used in JSX resolves to a rule in `components.css`
   - every `var(--...)` resolves to a token in `tokens.css`
   - no `style=` or `className=` on library controls in `react/src/pages/`
   - no unknown variant values (use `variants.js` `pick` / `reject`)
   - typographic tells: sweep source and copy for em and en dashes (U+2014, U+2013), curly quotes (U+2018, U+2019, U+201C, U+201D), `&mdash;`, `&ndash;`, `&rsquo;`, `&ldquo;`
   - savings shown as amounts, never percentages
   - no route or user-facing string says `wishlist`
   - every card name is in a `CardHeader`, and a `CardHeader` is only ever a direct child of `Card`
   - every part of a card head is centred on the head's line (measure it rendered, at 1400 and in the phone frame)
3. Visual comparison: for every screen you build, render it next to its mockup at the same width (1400 desktop, phone frame on mobile) and compare layout, spacing and states. Check empty, loading, error and filled states shown in the mockup.
4. Field stability: a field's size never depends on its value. Measure fields empty and filled; widths must match.
5. Run the existing app tests and the build. Fix what breaks; do not loosen a check to pass it.
6. When a defect turns up that no check caught, add the assertion first, then fix the instance.

## 6. Known gaps (do not invent fixes, ask)

The current list is under Known and open in `README.md`.

## 7. Working order

1. Read `index.html`, `PROJECT-RULES.md`, `react_handoff/README.md`, `styles/COMPONENT-STATUS.md`.
2. Port tokens, components.css, Icon, then the `react_handoff` components. Verify each against `React components.dc.html`.
3. Port the checks into CI and get them green against the components alone.
4. Rebuild screens one area at a time, in the order above, validating each.
5. Report per area: what was built, which checks ran, anything that needed a decision.
