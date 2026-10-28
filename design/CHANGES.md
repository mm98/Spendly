# Colour schemes: a choice of scheme beside the theme

The brief: offer colour schemes other than the green, chosen in Settings beside the light and dark switch, and let every page of the design system be viewed in any scheme and theme.

## 1. Seventeen colour schemes

**The problem.** Spendly had one colour: the brand green ran through the primary, links, marks, savings, the neutrals and the sidebar, with no way to change it.

**What changed.** An account chooses one of 17 schemes: Green (the default), Deep navy, Cobalt, Indigo, Ocean, Slate, Petrol teal, Emerald, Olive, Ochre, Terracotta, Mocha, Oxblood, Raspberry, Plum, Violet, Charcoal. A scheme replaces three groups of tokens, in both themes:

- the primary scale: `--green`, `--green-2` to `--green-5`, `--green-tint`, `--green-tint-2`, `--range-in`, `--range-line`, `--green-press`, and in dark `--ring`
- the neutrals, tuned a little toward the scheme's hue: `--bg`, `--surface-2`, `--surface-3`, `--hover`, `--line` to `--line-5`, `--hatch-a`, `--hatch-b` (dark also `--surface`)
- the sidebar: `--shell`, `--shell-item`, `--shell-current`, `--shell-group`, `--shell-count`, `--shell-scroll`, `--shell-action`, `--shell-action-hover`, `--shell-mark`

Ink, amber and red are the same in every scheme. The token names keep `green` so no component rule changes; the name now means "the scheme's primary".

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

**What changed.** The button, the links and positive figures take the scheme's `--green` and `--green-2`, the mark tile its `--shell-action`, and the dark block the scheme's dark values, written in as literals from `styles/schemes.css` when the email is rendered. An account with no scheme gets Green. The specimens stay drawn in Green.

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
- `view.js` - the shared tweak view (new).
- `styles/pages/settings.css` - the scheme tiles.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/*.css` - what the pages load to open.
- `support.js`, `components.js`, `icons.js`, `playground-registry.js`, `assets/`, `emails/`, `react_handoff/` - what the pages load to open.
- `CLAUDE.md` - the project rules, with the saving rule as changed in section 5.

## styles/check.js

0 finding(s) across 28 pages.
