# Component props in JSDoc

Brief: the app's components on main (`react/src/components/`) now document their props in JSDoc, which Storybook reads; the design's components do the same from now on.

## Every component in react_handoff documents its props

- **The problem:** the app's exports each carry `@param {object} props` and one `@param` per prop. `react_handoff/` did so only in part: 43 exports had no block, a block missing props, or a block separated from its function by a constant (`Toolbar` in Card.jsx, `Segmented`). The types differed from the app's (`React.ReactNode`, literal unions).
- **What changed:** every export in `react_handoff/` (95 blocks) now has a JSDoc block directly above it: prose first, then `@param {object} props` and one `@param` per prop it destructures, in the order it destructures them. Types are taken from the app's block for the same export (`import('react').ReactNode`, `keyof typeof MAP`); where the app names a constant this file does not have (`FILE_STATE`, `FILE_GONE` in `ChatFile`) the design's own type is kept. Optional marks and descriptions are the design's where it had them, the app's otherwise. No code changed: only comments.
- **Where:** `react_handoff/*.jsx` (all 23), `react_handoff/README.md` (section "Every prop is documented"). The app's files already carry their blocks: nothing to port to `react/src/components/` beyond keeping new props documented.
- **What is still open:** none.

## A check for it

- **The problem:** nothing caught an undocumented prop.
- **What changed:** `styles/check.js` asserts "every component prop has JSDoc": each export that destructures props has a `@param {object} props` block directly above it naming every destructured prop. Tested by removing `Pill`'s `color` line: the check reports it.
- **Where:** `styles/check.js`, the react exports block.
- **What is still open:** none.

## later.md

Read on main before this task. No entry is settled by this change: the Storybook Files Docs page, the combobox specimen's `chevron` and the accessibility faults remain open, and none was in this brief. Please confirm whether the combobox `chevron` entry should be done next, since it is a fault in `React components.dc.html`.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `react_handoff/*.jsx`, `format.js`, `variants.js` - the components with their JSDoc; the two helpers so the folder is whole.
- `react_handoff/README.md` - the rule in the components' own notes.
- `styles/check.js` - the new assertion.

## styles/check.js

0 finding(s) across 27 pages.
