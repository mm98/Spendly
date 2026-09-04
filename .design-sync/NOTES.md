# design-sync notes for Spendly

## The project this repo syncs to

**https://claude.ai/design/p/bc7c3554-1da2-4d46-a863-04f4247fabe6** — "Spendly Design System",
89 components. The same id is `projectId` in `config.json` beside this file, and that is what
pins a re-sync to this project rather than making a second one.

It is generated **from `react/src`**, so it mirrors the app as built and never leads it. A card
that looks wrong means the app renders it that way: fix the app, then re-sync. It is not a
specification — `README.md` at the repo root is the design system, and this project trails it by
however far the code currently does.

## Shape and environment

- Spendly is an **app, not a published component library**: no `dist/`, no `.d.ts`, plain
  `.jsx`. The converter runs in synth-entry mode over `react/src/components`.
- **`react/node_modules/spendly-react` is a self-symlink** (`ln -sfn .. react/node_modules/spendly-react`)
  and it is what makes `PKG_DIR` resolve. **Any `npm install`/`npm ci` in `react/` deletes it** —
  recreate it before every build or the build dies with
  `ENOENT ... node_modules/spendly-react/package.json`.
- Because `PKG_DIR` is that symlink, config paths that point outside the package need three
  hops up: `extraEntries`/`docsDir` are `../../../.design-sync/...`.
- `@types/react` must be present in `react/node_modules` (`npm i -D @types/react --no-save`),
  or the `.d.ts` pass prints `[DTS_REACT]`.
- Playwright is the **global** install at `/opt/node22/lib/node_modules/playwright` (1.56.1),
  linked in as `.ds-sync/node_modules/playwright`. Its pinned chromium build (1194) matches the
  cache at `/opt/pw-browsers`, so **no browser download is needed** — run validate/capture with
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.

## Per-component inputs are file-per-component, never one shared file

Three durable inputs per component, so parallel authoring never contends on `config.json`:

- `.design-sync/previews/<Name>.tsx` — the preview cells
- `.design-sync/props/<Name>.txt` — the `<Name>Props` body; `node .design-sync/fold-props.mjs`
  folds them all into `cfg.dtsPropsFor` before a build
- `.design-sync/docs/<Name>.md` — frontmatter `category:` sets the component's group, and the
  body becomes `<Name>.prompt.md`

Groups in use: Actions, Cards, Forms, Rows, Charts, Feedback, Chips, Layout.

## Provider

`.design-sync/preview-env.jsx` exports `PreviewEnv`, a `MemoryRouter` wrapper, wired via
`cfg.extraEntries` + `cfg.provider`. Anything taking `to` renders a react-router `<Link>` and
throws without it. `ToastProvider` is deliberately NOT in the chain: `useToast`'s context
default is a no-op, so components read it fine unwrapped.

## Excluded from the component list

`cfg.componentSrcMap` nulls `AppShell` (the whole application chrome: router outlet, live API
calls — nothing a card can show), `ToastProvider` and `UpdateNoticeProvider` (providers, not
visual components). All three still ship inside the bundle.

## Verify enum values against the stylesheet, never by analogy

Sibling components do NOT share a tone vocabulary. `KpiCard` takes `good | bad | neutral`
(`.delta-good/.delta-bad/.delta-neutral`); `Note` takes `positive | warning`
(`.note-positive/.note-warning`). Guessing one from the other silently renders an unstyled
class. Check with `grep -o '\.<base>-[a-z-]*' react/src/styles/app.css | sort -u`, and confirm
against a real call site or the API that produces the value.

## Capture harness facts

- `package-capture.mjs` pins the clock to **2024-05-15** and captures at **900x700**.
- The clock matters because `dayMonth()` (`react/src/api/format.js`) prints the year only when
  the date is not in the current year. Preview dates are written in the first half of 2024 so
  the compact form renders, which is what a reader normally sees.
- The viewport puts **both** `@media (max-width:900px)` and `@media (max-width:1180px)` in
  force. Between them they reach `.kpi-row`, `.two-column`, `.fav-tile-grid`,
  `.dashboard-cards`, `.field-pair-stack-early` and `.order-list-grid` — so a page-shaped
  preview puts its side rail under the form, and `DashboardCards`/`FavouriteTileGrid` show
  their two-column form. Not worth forking the harness for; previews lay themselves out with
  inline styles. The phone block (`max-width:700px`) is NOT in force.
- The review sheet clips each story row at 536px tall. A taller composition is cut in the
  sheet even though the card itself renders it.
- `.field-pair-keep` and `.field-pair-stack-early` differ only inside a viewport media query,
  so no still card can show them apart. Documented in prose instead.

## Known render warns

- Skeletons shimmer on a 1.6s CSS loop, so a still capture takes whichever phase it lands on.
  Two cells of one skeleton component coming out alike is that, not a broken variant axis.
- `SkeletonBlock`'s own cells are genuinely thin (`APageTitle` renders 380x34). A
  `[RENDER_THIN]` line naming it is expected.
- `ProgressBar`'s indeterminate slide is a live CSS animation the harness does not freeze; it
  captures mid-track and legible.

## Card presentation overrides, and why each one is there

`cfg.overrides.<Name>.cardMode = "column"` puts one story per row at full card width. Five
components need it, each measured rather than guessed:

- `KpiCard` — four tiles across; flagged by `[GRID_OVERFLOW]`.
- `Icon` — the `AllIcons` cell is the whole registry. At full width it is 8 across and ~350px
  tall; in a half-width cell it is 4 across and ~820px, past the fold.
- `Page` — every cell is a page's worth of cards, and the side-rail variant has a 300px floor
  on the rail, leaving ~72px for the wide column in a half cell.
- `FavouriteTile`, `FavouriteTileGrid` — the tile has a real minimum width; five cells measured
  372-382px of content in a 328px cell, and `ds-col` clears all five.

## Props that look like content but are not

The generated baseline guesses types from prop names, and these guesses were wrong in ways that
render nothing and never throw. All are corrected in `.design-sync/props/`; re-check them
whenever the component changes.

- `CardHeader.controls` — an element **id** for `aria-controls`, not markup.
- `AiCard.header` — an object `{to, title, meta, destination, progress}`.
- `ReturnsCard.returns` — an object `{items, total, history}`, not a list.
- `EntryRow.avatar` — the record `{initials, colour}`; the row builds the tile itself.
- `EntityRow.open` — `{href, label}`, not a boolean. `EntityRow.action` is a node.
- `ItemRow.thumb` — an Icon-name string. `ItemRow.iconTone` is a style object.
- `Pager.from` / `to` / `matched` — row numbers. `Pager` never links, unlike everything else
  in this library that has a `to`.
- `ListToolbar.filters` — `{open, onToggle, panelId}`; the baseline missed it entirely because
  its destructured entry sits behind a block comment.
- `CategoryRow.category`, `OrderRow.order` — whole records, written out field by field.

## Three variant conventions, which do not match each other

- `Button` splits `variant` on spaces and prefixes each word: `button-<word>`.
- `IconButton` concatenates the whole string once: `icon-button-<variant>`. That is why the app
  writes `variant="reorder icon-button-reorder-remove"`, spelling the second class in full.
- `Card` / `CardBody` / `FieldShell` take the class words in full (`card-body-tight`).

Mixing them renders a class that does not exist, silently.

## Composition facts a bare preview gets wrong

- `.entry-list` is load-bearing for `EntryRow`: its type sizes, meta line and figure column are
  all declared under that ancestor, so cells compose inside
  `CardBody variant="entry-list card-body-tight"`. A bare row renders at the wrong size.
- Stacked cards need a `Page` around them, not a `div` — `.page.is-on` is where the gap between
  cards comes from.
- `Field`'s `group` swaps `<label>` for `<div>`. It is not styling: a `<label>` around a
  `Segmented` or a colour picker labels only its first button.
- `Segmented`'s size is decided by whether it sits in a `Field`, not by its `compact` prop.

## Data shapes the charts need before they draw anything

Five chart components render an empty box with no error when the data is the wrong shape.

- `WeekdayBars.days` / `MonthColumns.months` — `share`/`height` are **percentages**, 0-100.
- `Meter.fill` / `marker` — numbers 0-100, not fractions and not kroner.
- `ProgressBar` — indeterminate by default, so `value` alone does nothing.
- `DonutBox` — a centring grid; nothing to see until a ring is inside it.
- `Donut` / `SpendGauge` `segments` — colours come from `api/src/lib/palette.js`
  (`CATEGORY_PALETTE`); `foldForRing` in `Viz.jsx` is what builds them from rows.
- `.card-body-fill` is load-bearing for `WeekdayBars` and `MonthColumns`, as `.entry-list` is
  for `EntryRow`.
- `Async.children` is a **function**, not markup, and `state` is exactly `useApi`'s return.
- `RecordWait.state` is the same `{data, error, loading}` triple.

## Live code the app never calls

Previewed from the component's own contract, and each doc says so rather than implying a usage:
`CardHeader`'s disclosure branch (`onToggle`/`open`/`controls`), `TagChip` (its pattern stayed
in the frozen prototype), `Switch`, and `FilterSectionBody`.

## Where a re-sync starts

```sh
ln -sfn .. react/node_modules/spendly-react          # npm removes it; recreate first
ln -sfn /opt/node22/lib/node_modules/playwright .ds-sync/node_modules/playwright
node .design-sync/fold-props.mjs                     # props/*.txt -> cfg.dtsPropsFor
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .ds-sync/resync.mjs \
  --config .design-sync/config.json --node-modules react/node_modules \
  --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```

Fetch `_ds_sync.json` from the project into `.design-sync/.cache/remote-sync.json` first, and
re-copy the staged scripts from the skill before running. `fold-props.mjs` is not part of the
driver: run it whenever a `props/*.txt` changed, or the contract will not reach the build.

## Re-sync risks

- The `react/node_modules/spendly-react` symlink and the playwright link under `.ds-sync/` are
  both gitignored and vanish on a fresh clone. Recreate both before building.
- `.design-sync/props/*.txt` are hand-written contracts against `.jsx` source with no types
  behind them. When a component's signature changes, nothing fails — the props body just goes
  stale. Re-read the destructuring of any component whose source changed.
- Icon names in previews are string keys into `ICONS` in `react/src/components/Icon.jsx`. A
  renamed icon renders nothing and does not error.
- Only 20 of 89 components are found by the converter's own source matcher (their name matches
  a filename). The rest are grouped and documented purely by `.design-sync/docs/<Name>.md`
  frontmatter, so a doc deleted or renamed silently drops that component back into `general`.
- `.design-sync/conventions.md` names 78 tokens, 21 components and 23 variant classes. It is
  prepended to the README the design agent reads, so a name that stops existing becomes
  confident wrong advice. Re-check it against the fresh build on every sync — the check is a
  grep of each name against `ds-bundle/_ds_bundle.css`, the `components/<group>/` tree and
  `ds-bundle/_ds_bundle.js`.
- Every preview renders against a `MemoryRouter` created per card. A component that starts
  reading loader or action data (not just `useRouteError`) would need routes with real data,
  not just a data router.
- Six defects this sync surfaced were fixed in `react/src` and their evidence is in
  `docs/defects.md`, not here. Component docs, `conventions.md` and previews were corrected to
  match. If any of that behaviour changes again, those three follow it — a doc that describes a
  behaviour the build no longer has is confident wrong advice.
- One gap is still open and previews must not draw a state for it: `.icon-picker-tile:disabled`
  has no styling, so a tile still waiting for its stored path is an indistinguishable blank box.
