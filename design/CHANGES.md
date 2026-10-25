# Full width on every control, and Back in the phone top bar's screen slot

This answers "Brief: two things from the 25 October update that the app cannot take in as written" (25 October 2026), its two questions. Take the files in unchanged.

## 1. fullWidth on every control, in place of a grow variant

- **The problem:** point 3 of the 25 October package had `react/src/pages/Budget.jsx` pass `variant="grow"` to the Combobox for the phone Budget bar's year (Mobile screens 21a), but `Combobox` lists no `grow`, so it refused it. Looking into it showed four names for the same job: `Button` took a `fullWidth` boolean, `Segmented` a `fill` variant, `FileDrop` a `grow` boolean, and the Combobox had a `.sp-combobox--grow` class with no prop behind it.
- **What changed:** there is now one name, `fullWidth`, a boolean. The control takes all the room it is given: the width of its column, or what is left in its row. There is no `grow` variant. Every control below takes it, and nothing changes how it looks: each one adds a class that already exists.
  - `Button`: unchanged, adds `.sp-btn--block`.
  - `Combobox`: new, adds `.sp-combobox--grow`, with one value or with `multiple`.
  - `Segmented`: `variant="fill"` is gone from `VARIANT`. `fullWidth` adds `.sp-segmented--fill`, and the segments share the width equally as before.
  - `FileDrop`: `grow` is renamed `fullWidth` and still adds `.sp-grow`.
  - `Field`, `TextField` (with `multiline` too), `PasswordField`, `NumberField`, `SearchInput` and `DateField`: new, each adds `.sp-grow` to its outermost element. A field already spans its column, so this matters in a row. Inside a `Field`, set it on the `Field`, since the Field is what sits in the row.
  - The `TextField` description of `stretch` now reads "takes the height of the row it sits in", which is what `.sp-input--stretch` does. It used to say "fills its row", which is `fullWidth`.
- **Where:** Mobile screens 21a (the year) and Components, Segmented Fill note. `react_handoff/Combobox.jsx`, `Segmented.jsx`, `FileDrop.jsx`, `Inputs.jsx`, `DatePickers.jsx`, `Field.jsx`, each with its JSDoc. `playground-registry.js`: a `fullWidth` control on each. `styles/components.css` is unchanged for this point. App:
  - `react/src/components/`: the copies of the six handoff files.
  - `react/src/pages/Budget.jsx`: the phone bar's year passes `fullWidth` and drops the spacer after it.
  - Any page passing `<Segmented variant="fill">` passes `fullWidth` instead, and any page passing `<FileDrop grow>` passes `fullWidth` instead.
  - `react/src/pages/Orders.jsx`: the phone list's Filters is drawn by hand on `sp-combobox--grow`. It does not use the Combobox and does not change.
  - Storybook: the `fullWidth` control appears on each of these components from its JSDoc. The build adds a Combobox story with `fullWidth` in a card bar.
- **What is still open:** nothing.

## 2. Back and the menu in the phone top bar's screen slot

- **The problem:** point 2 of the 25 October package sized Back (30px) and the page menu (32px) with `.sp-touch .sp-topbar--touch > .sp-icon-btn...`. In the app, a screen one level down puts Back, the title and the menu in `<div class="sp-topbar__screen">`, which the `>` does not reach through, so Back stayed 48px.
- **What changed:** the design now owns the slot. `.sp-topbar__screen { display: contents; }` is defined, and the three size rules (the 32px button, the 30px outline Back, and the 44px press area behind both) also reach an icon button inside `.sp-topbar__screen`. Nothing outside the slot changes. The desktop top bar has no slot.
- **Where:** `styles/components.css`, `.sp-topbar__screen`, and the rules under "the outline Back 30px and the menu 32px". App: `react/src/styles/app.css` drops its copies of the two size rules, along with its own `display: contents` for `.sp-topbar__screen` if it has one. This applies to every screen that draws Back through `react/src/app/screenBar.jsx`: `Ask.jsx` (24a), `AskFiles.jsx`, `AskChats.jsx`, `OrderNew.jsx` (Scanned before) and `OrderCompare.jsx`.
- **What is still open:** nothing.

## later.md

- **Budget's month wells do not use popLayout:** the design side of this entry is already settled. The Motion note under Budget 21a puts the wells in one grid row, a column each, and rules out `mode="popLayout"` and any `<style>` element added at run time. This package does not change it. The entry stays in later.md until the app's change ships.
- The other two entries (large accounts, keeping deleted records) are server work with no design fix in them.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - the Segmented Fill note names `fullWidth`.
- `React components.dc.html` - renders `react_handoff/`, unchanged.
- `react_handoff/` - every component, as the React components page loads them. Changed: `Combobox.jsx`, `Segmented.jsx`, `FileDrop.jsx`, `Inputs.jsx`, `DatePickers.jsx`, `Field.jsx`.
- `playground-registry.js` - the `fullWidth` controls, plus `narrow` on the Segmented and Combobox variant lists, which were missing.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/components.css` - the screen slot and the widened top bar rules.
- `styles/tokens.css`, `styles/doc.css` - what the pages link, unchanged.
- `styles/check.js` - two new assertions: every control takes `fullWidth`, and no component has its own name for it (no boolean `grow`, `fill` or `block`, and no such variant). Every rule for an icon button in the phone top bar also reaches one inside `.sp-topbar__screen`.

Every page's link to `styles/components.css` now carries a new version (`v20261025l`), so the changed rules load.

## styles/check.js

0 finding(s) across 27 pages.
