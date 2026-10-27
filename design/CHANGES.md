# A menu row with a grip cannot be dragged unless it also opens something

Answers `Brief-nav-row-reorder.md`, and settles three later.md entries.

## 1. NavItem draws every moving row as Reorder.Item

- **The problem:** in Orders, Views card, Edit, a saved view's grip shows the hand but dragging does nothing, on desktop and on a phone. `NavItem` drew a row inside a `ReorderList` as `Reorder.Item` only in its opens-and-moves branch (`handle && !control && (to || onClick)`). A row with a `handle` and no `to` or `onClick` fell through to a plain `<span>`, so the grip started drag controls no `Reorder.Item` listened to.
- **What changed:** a moving row (one inside a `ReorderList`, `useMovingRow()` not null) is drawn as `Reorder.Item` with `itemOf(moving, moves)` in the plain branch (`as="span"`) and in the switch branch (`as="label"`), as `ListItem`'s `box()` already does for every branch. A row outside a `ReorderList` is drawn as before. The current row's `NavGround` stays inside the row, so it keeps sliding. Nothing changes in how the row looks.
- **Where:** `react_handoff/Shell.jsx`, `NavItem`, the last lines. App: `react/src/components/Shell.jsx`; used by `react/src/pages/OrderViews.jsx` (the Views card in edit mode).
- **Story:** add to `storybook/stories/Shell.stories.jsx` a story of two or three `NavItem` rows with a `handle` and a `trail` menu, no `to` and no `onClick`, inside a `ReorderList`, so dragging a grip reorders them. The existing NavItem story keeps `onClick` and covers the other branch.
- **Not changed:** a row with `to` or `onClick` and no `handle` still draws its `Link` or `button` without a `Reorder.Item`; without a grip it has nothing to drag by.
- **What is still open:** nothing.

## later.md: A sign-in code field needs the even-width digits variant

- **The problem:** the digits of a code shift as they are typed. `design/` has `.sp-input--code` (Auth and first run 20g, Settings and import 11f), but `TextField` had no variant that sets it.
- **What changed:** `TextField` takes `variant="code"`, which adds `.sp-input--code` (`font-variant-numeric: tabular-nums`, already in `styles/components.css`). JSDoc updated. Use it on every code field.
- **Where:** `react_handoff/Inputs.jsx` (`TEXT.code`). App: `react/src/components/Inputs.jsx`; `react/src/pages/SignIn.jsx`, `react/src/app/SessionDialog.jsx`, `react/src/pages/SettingsTwoStep.jsx` (Turn on, New recovery codes, Turn off).
- **What is still open:** nothing. Remove this entry from later.md.

## later.md: Settings menu line under a notice

- **The problem:** 11a draws the Settings menu's line reaching up to the top bar; in the app, with the confirm-email banner above the page, the line starts under the banner.
- **What changed:** the banner sits in the pane column, above the first card, at the pane's width and padding. The section nav and its divider beside it still start at the top bar. The banner scrolls with the pane. 11a now draws an unconfirmed account with the banner; a confirmed account has none and the first card moves up. The banner is the warning row of Auth and first run 20e. Decided by Claude Design at the user's request.
- **Where:** Settings and import 11a (drawing, and a note in its notes for implementation). App: `react/src/pages/Settings*.jsx`, `react/src/styles/pages/settings.css` (`.st-subnav`), and wherever the shell places the banner on Settings.
- **What is still open:** nothing. Remove this entry from later.md.

## later.md: Settings is built in its earlier layout, not the one in `design/`

- **The problem:** `design/` on main draws Settings in five groups (Settings structure options 25), while the app keeps the menu beside the cards (11a), as the user chose.
- **What changed:** this project has already gone back to the earlier layout: 11a is Settings, and Settings structure options is no longer a page here. The `Settings and import.dc.html` in this package is that layout.
- **Where:** Settings and import 11a. Copy this package's page and `styles/pages/settings.css` into `design/`, and remove `design/Settings structure options.dc.html`.
- **What is still open:** nothing. Remove this entry from later.md once `design/` is updated.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `react_handoff/Shell.jsx` - `NavItem` draws every moving row as `Reorder.Item`.
- `react_handoff/Inputs.jsx` - `TextField` `variant="code"`.
- `Settings and import.dc.html` - 11a with the confirm-email banner and its note.
- `support.js`, `components.js` - what the page loads to open.
- `assets/two-step-qr.svg` - the QR image in 11f.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/pages/settings.css` - the Settings page styles, unchanged.

## styles/check.js

0 finding(s) across 27 pages.
