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

## Re-sync risks

- The `react/node_modules/spendly-react` symlink and the playwright link under `.ds-sync/` are
  both gitignored and vanish on a fresh clone. Recreate both before building.
- `.design-sync/props/*.txt` are hand-written contracts against `.jsx` source with no types
  behind them. When a component's signature changes, nothing fails — the props body just goes
  stale. Re-read the destructuring of any component whose source changed.
- Icon names in previews are string keys into `ICONS` in `react/src/components/Icon.jsx`. A
  renamed icon renders nothing and does not error.
