# Component props in JSDoc, after the update on main

Brief: the components in `react/src/components/` changed on main (2 commits, 11 files); check `react_handoff/` against them again and document the props as the app does. This package follows `design_handoff_component_jsdoc` and keeps everything in it.

## Icon-name props take the app's IconName type

- **The problem:** the app's `Icon.jsx` now declares `@typedef {keyof typeof ICONS} IconName`, and every prop that takes an icon name is typed with it. `react_handoff/` still wrote `string`, so Storybook would show a different props table for the same component.
- **What changed:** eight props now read `import('./Icon.jsx').IconName`, as on main: `Button` `iconStart` and `iconEnd`, `IconButton` `icon` (`IconName | import('react').ReactElement`), `FileDrop` `icon`, `MenuItem` `icon`, `Toast` `icon`, `NavItem` `icon`, `TabBarItem` `icon`. Only comments changed.
- **Where:** `react_handoff/Button.jsx`, `FileDrop.jsx`, `Overlays.jsx`, `Shell.jsx`, `Touch.jsx`. `react_handoff/` has no `Icon.jsx`; the path names the app's file, which is where these components import `Icon` from (`react_handoff/README.md`).
- **What is still open:** none.

## Every other shared prop already matches

- **The problem:** none found.
- **What changed:** every prop both sides document now has the app's type, except `ChatFile` `state` and `gone`: the app types them `keyof typeof FILE_STATE` / `FILE_GONE`, constants `react_handoff/Chat.jsx` does not have, so they keep their literal sets (same values).
- **Where:** `react_handoff/Chat.jsx`.
- **What is still open:** none.

## The app's Combobox leaves three props undocumented

- **The problem:** `react/src/components/Combobox.jsx` destructures `aria-label`, `aria-invalid` and `aria-describedby` with no `@param` for them, so they are missing from its Storybook props table.
- **What changed:** nothing here. Add to its block, in the app's form:
  `@param {string} [props['aria-label']]`, `@param {boolean} [props['aria-invalid']]`, `@param {string} [props['aria-describedby']]`.
- **Where:** `react/src/components/Combobox.jsx`, the `Combobox` block.
- **What is still open:** none.

## react_handoff is behind the app

- **The problem:** the comparison found what `react_handoff/` does not have at all: 40 exports that live only in the app (among them `Chat`, `ChatThread`, `ChatMessage`, `ChatDock`, `ComboboxSeparator`, `ListToolbar`, `Record`, `Records`, `Crumbs`, `BulkBar`, `Palette`, `SidebarAccount`, `Toaster`, `Fab`), and 25 shared exports that take props this copy does not (`List` `rowTo`, `picked`, `onLoadMore`; `SearchInput` `clear`, `ends`; `Toast` `actions`, `seconds`; and others). `NumberField` here takes `computed`, which the app does not.
- **What changed:** nothing. This predates the update and is not a JSDoc question.
- **Where:** `react_handoff/*.jsx` against `react/src/components/*.jsx`.
- **What is still open:** please confirm whether `react_handoff/` should be brought up to the app, or retired in favour of `react/src/components/` as the one source (`docs/porting.md` says `react/` is where the system is built).

## later.md

Read on main before this task; unchanged since the last package. No entry is settled by this change.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `react_handoff/*.jsx`, `format.js`, `variants.js`, `README.md` - the components with their JSDoc.
- `styles/check.js` - the JSDoc assertion, unchanged from the last package.

## styles/check.js

0 finding(s) across 27 pages.
