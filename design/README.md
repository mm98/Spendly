# Spendly design

This folder is the design reference for Spendly: the component library, every screen of the app, and the tools that check them. The `.dc.html` pages are high-fidelity HTML mockups. They open directly in a browser with no build, and they are the reference for layout, states and copy, not code to ship. The app in `react/` is where the design system is built.

This file is the overview and stays in place. A handoff package states what it changed in its own `CHANGES.md`, never in `README.md`, so uploading a package into this folder cannot replace this file.

## Reading order

1. `index.html` - the map of every page and screen id.
2. `PROJECT-RULES.md` - the rules the design is held to. Binding for anyone building from it.
3. `CLAUDE-CODE-PROMPT.md` - how to implement the design system in the app: where components and styles go, how to build a screen, the checks to run.
4. `react_handoff/README.md` - the React components, every export and the rules behind them.
5. `styles/COMPONENT-STATUS.md` - what is settled, the limits, and the change log.
6. `CHANGES.md` - what the most recent package changed.

## What each file is

Pages, one per area of the app. Every screen carries an id badge that is unique across the set, so it can be pointed at in review. The ids are names, not a build order.

- `Home.dc.html` - 10a, the start page
- `Auth and first run.dc.html` - 20a-20f, sign in, register, recovery, passkeys, first run, and the emails in `emails/`
- `Navigation shell.dc.html` - 9a-9i, sidebar, top bar, rail, command palette, truncation
- `Order editing layouts.dc.html` - 1a-1d, the order read view and edit layout
- `Order list.dc.html` - 2a-2i, rows, cards, filters, bulk actions
- `Order create.dc.html` - 3a-3d, creating an order from a scan
- `Duplicate and alerts.dc.html` - 8a-8b, duplicating an order, limit alerts
- `Order statistics.dc.html` - 4a-4g, figures, breakdowns, limits, drill path
- `Vendors and categories.dc.html` - 5a-5l
- `Budget.dc.html` - 21a-21h
- `Bookmarks.dc.html` - 22a-22d (the code calls this area wishlist; routes are `/bookmarks`)
- `Settings and import.dc.html` - 11a-11d, Settings panes and the file import
- `States and confirmations.dc.html` - 6a-6f, empty, loading, validation, dialogs, toasts
- `Images and files.dc.html` - 17a-17e
- `Dark mode and image viewer.dc.html`
- `Mobile screens.dc.html` - 7a, the phone

Library and reference:

- `Components.dc.html` - c1 onward, the canonical markup of every component and its states. A screen is composed from these, never hand-built.
- `React components.dc.html` - r1 onward, the `react_handoff` files rendered as they are. A broken specimen there means the props drifted.
- `Playground.dc.html` with `playground-registry.js` - every component's props and allowed values.
- `Icon legend.dc.html` - 19a, the icon register; `icons.js` holds the Tabler outline artwork.
- `Typography.dc.html`, `Type specimen.dc.html`, `Input types.dc.html`, `Layout rules.dc.html`, `Responsive reference.dc.html`, `Actions inventory.dc.html`.

Styles and scripts:

- `styles/tokens.css` - every value: colour, type scale, spacing (2/6/8/10/12/14/16), radii. No value outside these lists.
- `styles/components.css` - the single source of appearance. Page and base rules are in `@layer base`; component rules are unlayered, so they always win.
- `styles/doc.css` - documentation chrome. Not shipped.
- `styles/pages/*.css` - per-page mockup layout (device frames, specimen widths). Not shipped.
- `components.js` - the small amount of behaviour the static mockups need (combobox open and pick, menus, selection, range input).
- `support.js` - the page runtime. Not edited by hand.
- `react_handoff/` - React files that emit class names only and set no styles.
- `github.md` - which repo files each screen was drawn from, and the last sync.
- `Behaviour gaps.md` - behaviour the pages did not yet cover, found on 3 October 2026, and what was covered since.

## State of the checks

- `styles/check.js` holds the mechanical rules as assertions. It reports 0 findings across 26 pages as of 17 October 2026. Any finding is a regression.
- `checks.html` runs the rendered checks in a browser: overlap, clipping, hit targets, head centring, z-index. Every page is in its `PAGES` list.
- `styles/CONVERSION-CHECKS.md` states the checks in words, with the defect each one caught.

## Settled rules

Card heads

- A card's name is always in its header (`CardHeader`, a direct child of `Card`). A head is never built from a row, a label and a spacer.
- The header is one line at a fixed height. The name keeps its whole width and never breaks; text beside it takes the cut with an ellipsis. Every part of the head is centred on the head's line.
- A card's one action is in its footer, not loose in the card. A header action opens the fuller view of what the card summarises.

Rows that open something

- A row that opens something is `sp-row-opens` on an `<a>` or a `<button>`: no underline, the card's ink, the hover fill. A list row that opens is `sp-list-item--opens`, with the pointer and the hover fill. Neither is ever inert, and neither is drawn as a plain row.

Copy

- Plain hyphens only: no em or en dashes, and no `&mdash;` or `&ndash;`. Straight quotes and apostrophes only. No decorative emoji; an icon from the register does that job.
- A saving is always an amount, `Saved 1.320,00 kr.`, green, under the amount it belongs to. A saving of zero is grey. Never a percentage. A percentage is for a limit or a target.
- Copy in a mockup is product copy and describes outcomes. How or why the design works goes in the notes beneath it.
- A destructive action names its consequence in numbers and puts the verb and the count on the button, never "OK".

## Known and open

- Partial returns: one order with a reduced total, or a separate negative record. Not decided.
- Components, Selecting rows, says the checkbox has "44px hit padding". No rule in `styles/components.css` gives a checkbox a hit area.
