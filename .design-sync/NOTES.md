# design-sync notes for Spendly

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

## Known render warns

- `disabled` on `.button` has no style outside `.pager-buttons` (only `.pager-buttons .button:disabled`
  and `.pager-arrow:disabled` set `opacity:.45`), so a disabled button looks identical to an
  enabled one. No Disabled story is authored for `Button` — it would grade as an axis that does
  not vary. **This is a real affordance gap in the app**, reported to the user, not fixed here.

## `block` is a standalone button treatment, not a modifier

`.button.button-block` (app.css:888) and `.button.button-primary` (app.css:359) have equal
specificity and block is declared later, so `variant="primary block"` renders block's own card
surface and silently drops the green. The app only ever writes `variant="block"` alone.
Verified by reading both rules and by the render. Same shape as the README's rule that a base
rule placed after an override wins on equal specificity.

## Capture harness facts

- `package-capture.mjs` pins the clock to **2024-05-15** and captures at **900x700**.
- The clock matters because `dayMonth()` (`react/src/api/format.js`) prints the year only when
  the date is not in the current year. Preview dates are written in the first half of 2024 so
  the compact form renders, which is what a reader normally sees.
- The viewport puts `@media (max-width:900px)` in force. It reaches only `.kpi-row`,
  `.two-column`, `.fav-tile-grid`, `.dashboard-cards` and `.field-pair-stack-early`, so it
  affects `DashboardCards` and `FavouriteTileGrid` and nothing else. Not worth forking the
  harness for; previews lay themselves out with inline styles.
- `.field-pair-keep` and `.field-pair-stack-early` differ only inside a viewport media query,
  so no still card can show them apart. Documented in prose instead.

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

## Two places the app's own CSS contradicts what a name promises

Both verified by reading the rules and by the render. Neither is fixed here — they are the
user's call, and both are recorded so a preview never quietly "corrects" them.

1. `variant="primary block"` loses the green (see the section above).
2. **`ButtonLink` is underlined as a button and not underlined as a link.**
   `a[data-go] { text-decoration:none }` (app.css:525, specificity 0-1-1) outranks
   `.button-link` (app.css:889, 0-1-0), and every in-app link carries `data-go`. Four call
   sites take the link form: `Orders.jsx:110`, `AllOrders.jsx:285`, `Home.jsx:549`,
   `Wishlist.jsx:221`. `Button variant="link"` with a `to` would do the same; nothing does that
   today.

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

## Live code the app never calls

Previewed from the component's own contract, and each doc says so rather than implying a usage:
`CardHeader`'s disclosure branch (`onToggle`/`open`/`controls`), `TagChip` (its pattern stayed
in the frozen prototype), and `Switch`.

## Re-sync risks

- The `react/node_modules/spendly-react` symlink and the playwright link under `.ds-sync/` are
  both gitignored and vanish on a fresh clone. Recreate both before building.
- `.design-sync/props/*.txt` are hand-written contracts against `.jsx` source with no types
  behind them. When a component's signature changes, nothing fails — the props body just goes
  stale. Re-read the destructuring of any component whose source changed.
- Icon names in previews are string keys into `ICONS` in `react/src/components/Icon.jsx`. A
  renamed icon renders nothing and does not error.
