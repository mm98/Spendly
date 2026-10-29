# Letters on coloured marks are too faint in some schemes

Answers `Brief-mark-contrast.md`. Every solid mark now reaches 4.5:1 in all 16 schemes, light and dark, and `styles/check.js` asserts it.

## 1. Emerald mid green

- **The problem:** `--primary-3` (light) and `--shell-mark` were `#518167`. White letters reached 4.48:1. The emails draw the initials on the same green.
- **What changed:** both are `#508066` (4.55:1), the value the app already uses.
- **Where:** `styles/tokens.css` `:root` `--primary-3` and `--shell-mark`. `styles/schemes.css` Emerald light block. `emails/ask-chat.html` (the initials mark, VML and HTML) and `emails/README.md` (the chart bars note). The page thumbnails that used the green now use `#508066` too (Actions inventory, Input types, Navigation shell, Order list, Order statistics, Responsive reference, Settings and import, States and confirmations, Type specimen). They have no effect on the app.
- **App:** remove the Emerald override from `react/src/styles/app.css`. The design now has the fix.
- **What is still open:** `emails/ask-chart-sample.png` is a sample render with bars in the old green. It has no text on it, so it is left as is. The server draws real charts from `api/src/format/chart/bars.js` and `shares.js`, so set the mid tone there to `#508066`.

## 2. Terracotta mid tone

- **The problem:** `--shell-mark` was `#a8664d`, 4.49:1 with white. Terracotta's light `--primary-3` is the same colour, so a mark on the `primary-3` swatch failed as well. The brief does not list that one.
- **What changed:** both are `#a7664c` (4.52:1).
- **Where:** `styles/schemes.css` Terracotta light block, `--primary-3` and `--shell-mark`.

## 3. Dark theme, every scheme

- **The problem:** light letters (`--ink`) on the dark-theme `primary` mark reached 2.5 to 3.2:1, and on `primary-3` 3.6 to 4.1:1. Neither ink passed on `primary-3`.
- **What changed:**
  - The `primary` mark, and a solid mark with no swatch (which draws on `--primary`), take dark letters (`--surface`) in the dark theme as well. In dark they now reach 5.1 to 5.7:1.
  - Every scheme's dark `--primary-3` is darkened a little, by 0.02 to 0.06 in oklch lightness, so light letters reach 4.5:1. The scale keeps its order: primary, then primary-3, then primary-4. The chart ramp on Dark mode and image viewer is updated to match.
  - Charcoal's dark `--primary` goes from `#8a877f` to `#8b8880`, so its dark letters reach 4.54:1. It was 4.48.
- **Dark `--primary-3`, old to new:** Terracotta `#ad6c4e` to `#9d5d40`, Mocha `#8c7566` to `#80695b`, Ochre `#8f764c` to `#826a40`, Olive `#767f5b` to `#69714e`, Emerald `#57876d` to `#48775e`, Teal `#4f878e` to `#3e767d`, Ocean `#548197` to `#477389`, Slate `#707c88` to `#636f7b`, Navy `#5a7aa3` to `#506f98`, Cobalt `#587cab` to `#4c6f9d`, Indigo `#6d77a9` to `#616b9c`, Violet `#8170a2` to `#766596`, Plum `#916b8a` to `#876280`, Raspberry `#a36578` to `#995b6e`, Oxblood `#a0646d` to `#985d66`, Charcoal `#77746d` to `#706d66`.
- **Where:** `styles/tokens.css` `[data-theme="dark"]` `--primary-3`. `styles/schemes.css`, every dark block. `styles/components.css`, the solid mark's ink rules after `.sp-mark--solid[data-swatch="ink-6"]`: the dark rule no longer lists `:not([data-swatch])` or `primary`, and the light island rule keeps only `primary-3`. `Dark mode and image viewer` (the chart ramp note under the sidebar section and in the token mapping note). App: `react/src/styles/` wherever the dark scheme values are copied, `react/src/components/Mark.jsx`, `react/src/app/categoryMark.jsx`.

## 4. One ink rule for swatches and picked colours

- **The problem:** the ink was the one with the higher APCA lightness contrast. That never measured 4.5:1, so it chose light letters on fills where dark letters were the only ones that passed.
- **What changed:** a solid mark's ink is whichever of `--surface` and `--ink` reaches 4.5:1 on its fill. If both or neither do, it is the one with the higher contrast, and a tie keeps `--surface`. The swatch rules in `components.css` are this result for every swatch in every scheme and theme. A colour the reader picks gets its `data-ink` by the same rule.
- **Where:** `react_handoff/colour.js`: `lightnessContrast` is replaced by `contrastRatio` (WCAG ratio, 1 to 21), and `inkFor` applies the rule above. `react_handoff/README.md` names the new export. `Components` (the mark note under Fixed). `styles/COMPONENT-STATUS.md` log, 2026-10-29. App: `react/src/lib/colour.js` or wherever `inkFor` lives, and every import of `lightnessContrast`.

## 5. The checker asserts it

- **The problem:** nothing measured the letters on a mark, so the faults above went unseen.
- **What changed:** `styles/check.js` has a new rule, "mark letters reach 4.5:1". For every scheme and theme it works out each swatch's ink from the `.sp-mark--solid` rules and measures it on the swatch's fill, and it measures white on `--shell-mark`. Before the fix it reported 74 failures.
- **Where:** `styles/check.js`, before section 4.

## later.md

Its one entry, "A deleted record should not be removed for good at once", is marked as an idea and not a planned task. Nothing is built for it until the user asks, so this package does not touch it.

## Files

- `README.md` - the design's overview, copied unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - the mark note now states the 4.5:1 rule.
- `Dark mode and image viewer.dc.html` - the dark chart ramp now shows the new `--primary-3`.
- `Actions inventory.dc.html`, `Input types.dc.html`, `Navigation shell.dc.html`, `Order list.dc.html`, `Order statistics.dc.html`, `Responsive reference.dc.html`, `Settings and import.dc.html`, `States and confirmations.dc.html`, `Type specimen.dc.html` - only their thumbnail green changed.
- `styles/tokens.css`, `styles/schemes.css` - the new colours.
- `styles/components.css` - the solid mark's ink rules.
- `styles/doc.css`, `styles/pages/*.css` (the ones these pages link), `support.js`, `view.js`, `components.js`, `icons.js`, `assets/shop-logo.svg`, `assets/two-step-qr.svg` - loaded by the pages so they open from the folder.
- `styles/check.js` - the new assertion.
- `styles/COMPONENT-STATUS.md` - the log entry.
- `react_handoff/colour.js`, `react_handoff/README.md` - the ink rule in code.
- `emails/ask-chat.html`, `emails/README.md` - the initials green.

## styles/check.js

0 finding(s) across 28 pages.
