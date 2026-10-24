# design-sync notes (Spendly)

## How this repo is synced

- Spendly is an app, not a published package. There is no `dist/`: the converter is pointed at a path that does not exist (`entry`) so it builds a synthesized entry from `react/src/components/*.jsx` (`srcDir`).
- Components are plain JSX with no types, so every `<Name>.d.ts` body comes from `dtsPropsFor` in config.json, written by hand from the component's own destructured props and its lookup tables (`VARIANT`, `COLOR`, `SIZE` ...). When a component's props change, its `dtsPropsFor` entry and its `.design-sync/docs/<Name>.md` change with it.
- Styles are not imported by the components. `.design-sync/entry/styles.js` imports the app's stylesheets in the order `react/src/main.jsx` does, so esbuild emits them as `_ds_bundle.css` (fonts end up inlined as data URIs, which is fine).
- Everything in the stylesheet hangs off a `.sp` ancestor (font, ink, ground). The app puts `class="sp"` on `<body>` in `react/index.html`. `SpendlyRoot` (in `.design-sync/entry/root.js`) does the same and adds a `MemoryRouter`, since `Button`, `Card` and others render router links. It is `cfg.provider`. It also wraps the tree in `MotionShell`, as `react/src/main.jsx` does, so motion parts (layout markers, `Presence`, `ReorderList`) work in designs.
- Parts that only make sense inside a parent (`CardHeader`, `MenuItem`, `DialogTitle`, `ComboboxOption` ...) are excluded from cards with `componentSrcMap: null`. They stay on `window.Spendly` and are documented in the parent's doc under "Parts", and drawn inside the parent's preview.
- `Selected` is exported by both `DatePickers.jsx` and `List.jsx` (a slot marker that renders nothing). The synthesized `export *` makes it ambiguous, so it is not on the global at all.
- Docs: `.design-sync/docs/<Name>.md`, frontmatter `category:` sets the card group. Groups: Actions, Forms, Dates, Files, Surfaces, Lists, Data, Overlays, Navigation, Ask, Utilities.
- Best composition source: `design/React components.dc.html` (real calls to these components, written with `e(Component, props, ...)`), then `design/react_handoff/README.md` (rules per component), then `design/playground-registry.js` (allowed values).

## Environment

- Playwright: `.ds-sync` needs `playwright@1.63.0` (matches chromium-1243 in `/opt/pw-browsers`); run with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. `@types/react` lives in `.ds-sync/node_modules`, not `react/node_modules`; the `[DTS_REACT]` warning is harmless here because no `.d.ts` is read.
- Build: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules react/node_modules --out ./ds-bundle`
- `react/src/components/motion.js` holds JSX in a `.js` file, which the converter's bundler refuses. `buildCmd` (`node .design-sync/tools/motion-for-bundle.mjs`) writes a JSX-free copy to `.design-sync/.cache/motion.js`, and `.design-sync/bundle-tsconfig.json` maps `./motion.js` to that copy. Never fork `lib/bundle.mjs` for this.
- `resync.mjs` does not run `buildCmd`. Run `node .design-sync/tools/motion-for-bundle.mjs` before the driver, or the build stops at `../.cache/motion.js`.

## Preview authoring

- Components reject `className` and `style` (they log an error and drop them). Layout glue in a preview is a plain `div` with inline style, or the app's own layout classes (`sp-row-flex`, `sp-gap-12`, `sp-stack`, `sp-stacked`).
- Text inside a surface uses the type classes: `sp-title`, `sp-subtitle`, `sp-data`, `sp-meta`, `sp-section-label`, `sp-stat__figure`.
- Use realistic Danish-shop content in English copy: vendors like Indbo Møbler, Bilka, IKEA; amounts like `24.310 kr.`; order ids like `SPENDLY-447`.
- Overlays that portal to `document.body` (Dialog's default scrim, Viewer, RangeSheet, SidebarAccount's menu, tooltips) escape a card. Previews use the in-flow forms instead: `Dialog scrim={false}` inside `<Scrim dialog>` in a relative box, `Popover position="static"`, `Menu` in an open `Anchor` inside a div with a min height, `Combobox open` with a no-op `onOpenChange`. Viewer has a single-card override.
- Touch parts (TabBar, SaveBar, Sheet, Fab) are drawn inside the design's phone frame `<div className="sp-phone sp-touch">`, never with `Shell touch` (that puts a class on `<body>` and fixes parts to the window). `.sp-phone > .sp-sheet` resets the sheet's top margin, so put page content above the Scrim and Sheet.
- `Shell` sorts its children by component type: write Sidebar, TopBar, ShellContent as direct children, never through a wrapper or fragment.
- `Chat` fills its parent's height (`flex: 1`): give it a fixed-height flex column. Messages sit inside `ChatThread`.
- Some components stretch to their container (Stepper, `Choice variant="row"`, Sidebar in a flex row): hold them in a width-limited wrapper.
- `Skeleton shape="end"` needs `data-w`/`data-h` (values are the `.sp-skeleton[data-w=...]` rules).
- `FieldGroupPanel` only shows when a chip with `data-preset="custom"` is checked.
- Date previews use fixed 2026 dates (`at`, `from`/`to`, `max`). PeriodPicker's BackToPresent cell shows its button only while today is outside Q2 2026.
- `Plot`'s `limit.at` is a CSS top value (a percent string). `Donut`'s figure must be short; put the unit in `label`.
- The icon register is `react/src/components/icons.js` (Tabler outline). There is no `truck`.

## Known render limits (not faults)

- Hover-only controls do not show in a static card: `MarkRemove`, `ListItemRemove`, Record's `pick` box, submenus, `tip` tooltips, `ChatMore`'s open menu, DateField's open calendar.
- `Calendar` shows only its frame with caller content: the month grid (`Month`) is internal to DatePickers.jsx and not exported.
- `Selected` is not on the global (see above), so List's bulk-bar slot and PeriodPicker's comparison area are not shown.
- A searchable Combobox does not show its search text at rest.
- Combobox is one card (`cardMode: single`): its widest cell does not fit the grid.
- The motion helpers in `motion.js` (`MotionShell`, `Rows`, `Presence`, `Fold`) are not on `window.Spendly`: only `.jsx` files are scanned. `SpendlyRoot` carries `MotionShell`, and the parts that move use the others themselves.
- Dialog, Popover and Viewer come out blank on the per-story review sheet (they draw outside the frame there), and Menu's OpenFromButton shows only its button. Their main card screenshots render correctly; grade from those.

## Re-sync risks

- `dtsPropsFor` comes from the components' JSDoc. A prop added, renamed or removed does not fail the build; it silently makes the `.d.ts` wrong. On every re-sync run `node .design-sync/tools/dts-from-jsdoc.mjs`, then `node .design-sync/tools/dts-merge.mjs`, and read its report: it adds new props and keeps the ones the JSDoc does not name (aria and pass-through props), so a removed prop is taken out by hand.
- `docs/*.md` are hand-written from the component source. On every re-sync, diff `react/src/components` since the last sync and update the doc of each changed component.
- `componentSrcMap` excludes parts by name. A new export in `react/src/components` becomes a new card automatically; decide whether it is a card or a part.
- `entry/styles.js` mirrors the stylesheet imports in `react/src/main.jsx`. If main.jsx adds or reorders a stylesheet, change it here too.
- Preview content with dates is fixed in 2026, but several components still read today (quick ranges, presets, the today mark), so those cards can drift with the calendar.
- The playwright version is pinned by the browser build in `/opt/pw-browsers` (chromium-1243 = playwright 1.63.0); a new environment may need another version.
- `ReorderList`'s and `Sidebar`'s `dtsPropsFor` entries were written by hand from the Motion update. `motion.js` and `Reorder.jsx` change with Claude Design's handoff; check them on every re-sync.
- `.design-sync/.cache/remote-sync.json` must be the project's full `_ds_sync.json` (with `sourceKeys` and `sourceHashes`). A trimmed copy gives no anchor: every component re-verifies and the driver cannot list remote files to delete, so they are found by hand with `list_files`.
- `storybook/` (stories for every file in `react/src/components`) landed after this sync was built in the package shape. A later sync can switch to the storybook shape (`"shape": "storybook"`, `storybookConfigDir: "storybook/.storybook"`), which grades previews against Storybook's own render; that replaces the hand-written previews here and needs a full re-verify.
