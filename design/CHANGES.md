# Colour schemes: a choice of scheme beside the theme

## Fixed from handoff_colour_schemes_fixed_11

A scheme id that is not one of the 16 (one removed in an earlier round) passed through `view.js` unchanged, so the page drew Emerald while no Colour scheme tile in 11a was selected. `view.js` now lists the 16 schemes and reads any other id as `emerald`. In the app the same holds: an id outside `SCHEME_IDS` is Emerald, and Settings shows Emerald as chosen.

## Fixed from handoff_colour_schemes_fixed_10

The scheme colours are back to the ones on main (`design/styles/schemes.css`, the 17 of F and G), at the user's decision, with one change: Green is removed and Emerald is the default (K). The later sets (eight hues deep and pastel, then sixteen named colours) and the four tokens they needed (`--primary-ink`, `--primary-ink-2`, `--on-primary`, `--on-primary-mark`) are withdrawn; `styles/components.css`, `styles/doc.css` and `styles/pages/settings.css` are main's, with Green's literal values replaced by Emerald's.

## Fixed from handoff_colour_schemes_fixed_6

J is new: the import mapping's field picker is the height of the file column beside it.

## Fixed from handoff_colour_schemes_fixed_5

H is extended: Row density spans its half (`sp-segmented--fill`, its two options sharing the width) instead of stopping at `--field-w`.

## Fixed from handoff_colour_schemes_fixed_4

G, H and I are new: warning and problem colours turn away from five schemes' primary, Appearance pairs Row density with Compare this month with, and design notes that called the primary "green" now say primary.

## Fixed from handoff_colour_schemes_fixed_fixed_fixed

The scheme colours are reverted to the 17 of `handoff_colour_schemes`, at the user's decision. A is withdrawn and E with it: amber and red are the same in every scheme again, and the `--cat-brown`, `--cat-sand` and `--cat-red` tokens are gone. B (a pick applies at once), C (`--primary` naming) and D (category colours follow the scheme) stand. F is new: the tiles run in hue order.

## Fixed from handoff_colour_schemes_fixed_fixed

A is replaced: the 11 schemes read as four colours (greens, blues, purples and Rose), since every warm hue was kept out. There are now 8, one per colour group, warm hues included, and E is new: in Red, Orange and Ochre the warning and problem colours turn to other hues.

## Fixed from handoff_colour_schemes_fixed

D is replaced: the category colours were fixed green in every scheme, and now follow the scheme as its five tones (D below). The fixed `--cat-green*` tokens are gone.

## Fixed from handoff_colour_schemes

### A. The schemes looked alike (withdrawn)

**The problem.** The schemes were found too alike in Settings 11a.

**What changed.** Nothing: two redrawn sets (11 schemes without warm hues, then 8 with them) were tried and reverted. The schemes are the 17 of `handoff_colour_schemes`: Green (the default), Deep navy, Cobalt, Indigo, Ocean, Slate, Petrol teal, Emerald, Olive, Ochre, Terracotta, Mocha, Oxblood, Raspberry, Plum, Violet, Charcoal, with the tokens renamed as in C.

**Where.** `styles/schemes.css`; `Settings and import 11a` tiles and note.

**What is still open.** Nothing.

### B. Picking a scheme did not switch the view

**The problem.** In Settings 11a, picking a Colour scheme tile (or a Theme tile) only moved the radio; the page kept its colours until the tweak was changed.

**What changed.** Picking a tile switches the whole view at once, as switching the theme does, and the choice holds on every page. Follow system takes the device's light or dark. The tiles show the current choice as selected when the page opens. In the app the pick applies at once and is saved with the card's Save; leaving Settings without saving puts the view back to the saved choice.

**Where.** `Settings and import 11a`; `view.js` (`SpView.choose`). App: `react/src/pages/Settings.jsx` (Appearance), the root where `data-theme` and `data-scheme` are set.

**What is still open.** Nothing.

### C. The primary tokens are named primary

**The problem.** With schemes, the primary scale was still named `--green`, `--green-2` to `--green-5`, `--green-tint`, `--green-tint-2` and `--green-press`, though under Cobalt it is blue.

**What changed.** Renamed, values unchanged: `--green` to `--primary`, `--green-2` to `--green-5` to `--primary-2` to `--primary-5`, `--green-tint` to `--primary-tint`, `--green-tint-2` to `--primary-tint-2`, `--green-press` to `--primary-press`. No `--green` token is left.

**Where.** `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/*.css`, every page that names a token, `react_handoff/Data.jsx`. App: every `var(--green*)` in `react/src/styles/` and `react/src/`, and the emails' literals table in `api/src/emails/*`.

**What is still open.** Nothing.

### D. Category colours follow the scheme

**The problem.** The category colours green to green-5 were the Green scheme's tones, named Green, Deep green, Mid green, Light green and Pale green. Under another scheme they either looked foreign beside the primary or, drawn with the primary, showed blue while named green.

**What changed.** The five are the scheme's own tones and follow it: swatches `primary`, `primary-2` to `primary-5` on `--primary` to `--primary-5`, named Primary, Deep, Mid, Light and Pale in the picker's tooltip and label. Amber, brown, red and grey are unchanged. The account's initials mark is `primary-3`, as before on the third tone.

Stored values change: a category saved as `green`, `green-2`, `green-3`, `green-4` or `green-5` becomes `primary`, `primary-2` to `primary-5`, in a migration that rewrites the stored swatch.

**Where.** `styles/components.css` `.sp-option--swatch[data-swatch]`, `.sp-mark--solid[data-swatch]`, `.sp-swatch[data-swatch]`; `react_handoff/Mark.jsx` (`SWATCHES`), `Choice.jsx` (`SWATCH_NAMES`), `Shell.jsx`, `colour.js` (`inkFor` works the ink out again when the scheme changes, as it does for the theme); the pickers in `Vendors and categories 5a` onward, `Components c7`, `Mobile screens 7a`, and every page drawing a category or account mark. App: `react/src/components/Mark.jsx`, `Choice.jsx`, `Shell.jsx`, `colour.js`, `react/src/styles/app.css`, and a migration over the categories table.

**What is still open.** Nothing.

### F. Schemes in hue order

**The problem.** The tiles ran Green first, then in no colour order, so related schemes sat apart.

**What changed.** The tiles run in hue order: Terracotta, Mocha, Ochre, Olive, Emerald, Green, Petrol teal, Ocean, Slate, Deep navy, Cobalt, Indigo, Violet, Plum, Raspberry, Oxblood, then Charcoal last. Green stays the default and is selected for a new account wherever it sits.

**Where.** `Settings and import 11a` tiles and note; `styles/schemes.css` block order; the Scheme tweak on every page. App: the scheme list order in `react/src/pages/Settings.jsx`; the default stays `green`.

**What is still open.** Nothing.

### G. Warnings and problems never match the primary

**The problem.** In five of the 17 schemes the primary, or its positive tone `--primary-2` that savings take, sits close to amber (a warning) or red (a problem): Terracotta, Mocha, Ochre, Raspberry and Oxblood. A saving could read as a warning, or a button as an error.

**What changed.** In those five, the amber and red tokens turn to another hue at the same lightness and strength, in light and dark. Every other scheme keeps amber and red as they are.

- Terracotta: a warning is olive (oklch hue 100), a problem plum (345).
- Mocha: a warning is olive (115), a problem plum (345).
- Ochre: a warning is green-olive (125), a problem rose (12).
- Raspberry: a warning is olive (105), a problem burnt orange (52).
- Oxblood: a warning is olive (105), a problem burnt orange (55).

After the change each scheme's primary and `--primary-2` stand at least as far from its warning and problem colours as Green's do from amber and red, and warning and problem stay apart from each other. The token names do not change, so no component rule changes. Category colours on amber or red tokens (brown, sand, red) take the turned hue in those schemes, as the green tones follow the scheme (D).

**Where.** `styles/schemes.css` (the light and dark blocks of `rust`, `mocha`, `ochre`, `raspberry`, `oxblood`, after the comment "warning and problem, turned away from this scheme's primary"); `Settings and import 11a` Colour scheme note. App: the same values in the app's scheme stylesheet, and the emails' literals table, which takes a scheme's amber and red as well as its primary.

**What is still open.** Nothing.

### H. Row density and Compare this month with share a row

**The problem.** In Appearance, Compare this month with sat alone on its own row under Row density, and Theme carried the help line "You can also switch this from the sidebar.", though the theme switch was removed from the sidebar.

**What changed.** Row density and Compare this month with sit side by side, each half the card's width (`sp-halves`, the same as Money, dates and times), with no rule between them. Row density's switch fills its half (`sp-segmented--fill`), as the combobox beside it does. The Theme help line is removed.

**Where.** `Settings and import 11a`, Appearance card. App: `react/src/pages/Settings.jsx` (Appearance).

**What is still open.** Nothing.

### I. Notes say primary where they meant the primary

**The problem.** Design notes on several pages called the primary colour "green" (a green notice, the green border, the bookmark fills in green), which is wrong under any other scheme. The Dark mode token table labelled its rows Green primary, Green hover, Green pressed, Green surface.

**What changed.** Those notes say primary, the primary tint or the positive colour, and the token rows read Primary, Primary hover, Primary pressed, Primary surface. A note naming the Green scheme itself is unchanged. No product copy changes.

**Where.** Notes on Actions inventory, Ask Spendly, Auth and first run, Budget, Components, Dark mode and image viewer, Home, Mobile screens, Navigation shell, Order create, Order list, React components, Vendors and categories.

**What is still open.** Nothing.

### J. A mapping row is one height

**The problem.** In the app's import mapping, the Spendly field picker takes the combobox's default height (`--control-h`), so beside the two-line file column (the column name and its sample values) it ends short and the row has two bottom edges.

**What changed.** The picker stretches to the height of the file column beside it: `.sp-combobox--stretch` in an `.st-map` row (`align-items: stretch`), its trigger at `height: auto`, as drawn. No new style; the design already draws it this way, and a note now says so.

**Where.** `Settings and import 11b`, stage 2 (mapping), notes; `styles/components.css` `.sp-combobox--stretch`; `styles/pages/settings.css` `.st-map`. App: the import mapping in `react/src/pages/` (the Settings import), which should use the stretch variant of `Combobox`.

**What is still open.** Nothing.

### K. Emerald is the default; Green is removed

**The problem.** Green and Emerald were two near-identical schemes, and Green was the default.

**What changed.** Green is removed, leaving 16 schemes in hue order. Emerald is the default for a new account and for one with no scheme stored, and `styles/tokens.css` holds Emerald's values, light and dark, neutrals included. Every hard-coded Green value in the pages, the stylesheets and the emails (the primary scale and the sidebar) is the Emerald value. An account stored with `green` reads as `emerald`.

**Where.** `styles/tokens.css`; `styles/schemes.css` (the Green block removed, its header note); `styles/components.css` literals; `view.js` (`green` reads as `emerald`, the default `emerald`); `Settings and import 11a` tiles (Emerald checked) and note; every page's Scheme tweak (default `emerald`); `emails/*.html` literals; `Auth and first run 20f` note. App: `api/src/lib/schemes.js` (`DEFAULT_SCHEME = 'emerald'`, and an id that is not a scheme gets Emerald), the default in the settings record, a migration of stored `green` to `emerald`, `react/src/styles/tokens.css` and `schemes.css` (byte copies of `design/styles`), and the emails' literals table.

**What is still open.** `CLAUDE.md` still says a saving is "green in the Green scheme"; the rule is unchanged in substance (the scheme's positive colour), and the project's owner updates that line.

## later.md (this pass)

Read on main before this pass. One entry, "A deleted record should not be removed for good at once", is an idea for later and stays as it is.

---

The brief: offer colour schemes other than the green, chosen in Settings beside the light and dark switch, and let every page of the design system be viewed in any scheme and theme.

## 1. Seventeen colour schemes

**The problem.** Spendly had one colour: the brand green ran through the primary, links, marks, savings, the neutrals and the sidebar, with no way to change it.

**What changed.** An account chooses one of 16 schemes (Green removed in K): Deep navy, Cobalt, Indigo, Ocean, Slate, Petrol teal, Emerald, Olive, Ochre, Terracotta, Mocha, Oxblood, Raspberry, Plum, Violet, Charcoal. A scheme replaces three groups of tokens, in both themes:

- the primary scale: `--primary`, `--primary-2` to `--primary-5`, `--primary-tint`, `--primary-tint-2`, `--range-in`, `--range-line`, `--primary-press`, and in dark `--ring`
- the neutrals, tuned a little toward the scheme's hue: `--bg`, `--surface-2`, `--surface-3`, `--hover`, `--line` to `--line-5`, `--hatch-a`, `--hatch-b` (dark also `--surface`)
- the sidebar: `--shell`, `--shell-item`, `--shell-current`, `--shell-group`, `--shell-count`, `--shell-scroll`, `--shell-action`, `--shell-action-hover`, `--shell-mark`

Ink is the same in every scheme; amber and red are too, except as in G. The tokens are named `--primary*` (see C).

**Where.** `styles/schemes.css` (new), loaded after `styles/tokens.css` on every page. The root element carries `data-scheme="<id>"` beside `data-theme`; a nested `[data-theme]` or `[data-scheme]` island resolves its own values. Green repeats the `tokens.css` values so a Green tile inside another scheme still draws green. In the app: the root where `data-theme` is set today, and the user's settings record for the stored value.

**What is still open.** Nothing.

## 2. Colour scheme in Settings, Appearance

**The problem.** Appearance offered only Theme (Light, Dark, Follow system).

**What changed.** A Colour scheme row under Theme, labelled "Colour scheme", with the help line "Sets the colour of buttons, links, the sidebar and savings, in light and dark." One tile per scheme, four to a row: the theme tile's well and radio states, its preview a strip of six tones (the sidebar, then the primary scale from darkest to lightest) and the scheme's name beneath. The tile shows the scheme in the theme in use. It saves with the card's own save.

**Where.** `Settings and import 11a`; `styles/pages/settings.css` `.st-trio--schemes`, `.st-theme__preview--tones`, `.st-theme__tone`, `.st-theme__tone--shell`, `--1` to `--5`. App: `react/src/pages/Settings.jsx` (Appearance).

**What is still open.** Nothing.

## 3. Colour scheme on a phone

**What changed.** Appearance on a phone holds Colour scheme under Theme: the same tiles, three to a row, a tap choosing one. The Appearance row in Settings shows no value.

**Where.** `Mobile screens 7a`, implementation note.

**What is still open.** Nothing.

## 4. Emails follow the account's scheme

**What changed.** The button, the links and positive figures take the scheme's `--primary` and `--primary-2`, the mark tile its `--shell-action`, and the dark block the scheme's dark values, written in as literals from `styles/schemes.css` when the email is rendered. An account with no scheme gets Green. The specimens stay drawn in Green.

**Where.** `Auth and first run 20f`, implementation note. App: `api/src/emails/*`.

**What is still open.** Nothing.

## 5. A saving takes the scheme's positive colour

**The problem.** The rule said a saving is always green, which no longer holds under another scheme.

**What changed.** A saving takes the positive colour of the account's scheme, green in Green (`sp-amount-secondary` with `data-color="success"`, or `sp-stat__delta`, unchanged). A zero saving stays grey.

**Where.** Project rules (`CLAUDE.md`, "A saving is always an amount"). No markup changes.

**What is still open.** Nothing.

## 6. One view shared by every page's tweaks

**The problem.** Each page set its own theme in its tweaks, and a choice made on one page was lost on the next.

**What changed.** Every page has Theme and Scheme in its tweaks, read through `view.js` (`window.SpView`). A choice made on any page is kept and every page opens in it. The Show notes tweak is removed from every page; notes always show. Design-system tooling only; nothing for the app.

**Where.** `view.js` (new); every `.dc.html` page loads it and calls `SpView.apply` from its logic class.

**What is still open.** Nothing.

## later.md

Read on main before this task. One entry, "A deleted record should not be removed for good at once", is an idea for later and stays as it is.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- every `.dc.html` page - each gains the Scheme tweak and loses Show notes; `Settings and import`, `Mobile screens` and `Auth and first run` also carry the changes above.
- `styles/schemes.css` - the schemes (new).
- `view.js` - the shared tweak view (new), with `choose` for the Settings tiles (B).
- `styles/pages/settings.css` - the scheme tiles.
- `styles/tokens.css` (C), `styles/components.css` (C, D), `styles/doc.css`, `styles/pages/*.css` - what the pages load to open.
- `playground-registry.js` - its swatch set renamed to the primary tones (D).
- `support.js`, `components.js`, `icons.js`, `assets/`, `emails/` - what the pages load to open.
- `react_handoff/` - `Data.jsx` (C), `colour.js` (D), `Mark.jsx`, `Choice.jsx` and `Shell.jsx` (D) changed; the rest is what the pages load.
- `CLAUDE.md` - not in this package: unchanged from `handoff_colour_schemes`, which carries the saving rule as changed in section 5.

## styles/check.js

0 finding(s) across 28 pages.
